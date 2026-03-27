const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const chalk = require('chalk');
const NodeCache = require('node-cache');

// ── Load environment variables ──────────────────────────────────────────────
const envPath = process.env.ENV_FILE
  ? path.resolve(__dirname, process.env.ENV_FILE)
  : path.resolve(__dirname, '.env');

const envResult = require('dotenv').config({ path: envPath });

if (process.env.ENV_FILE) {
  if (envResult.error) {
    console.warn(chalk.yellow(`[WARN] Could not load env file "${path.basename(envPath)}": ${envResult.error.message}`));
  } else {
    console.info(chalk.blue(`[INFO] Loaded environment file: ${path.basename(envPath)}`));
    console.info(chalk.cyan(`       Keys from file: ${Object.keys(envResult.parsed).join(', ')}`));
  }
} else {
  if (envResult.error) {
    console.info(chalk.blue('[INFO] No .env file found. Using system environment variables.'));
  } else {
    console.info(chalk.blue('[INFO] Loaded default .env file.'));
    console.info(chalk.cyan(`       Keys from file: ${Object.keys(envResult.parsed).join(', ')}`));
  }
}

const CRITICAL_VARS = ['GEMINI_API_KEY', 'GODADDY_API_KEY', 'GODADDY_API_SECRET'];
for (const varName of CRITICAL_VARS) {
  if (process.env[varName]) {
    console.info(chalk.green(`       [OK] ${varName} is set`));
  } else {
    console.warn(chalk.yellow(`       [MISSING] ${varName} is not set`));
  }
}

// ── Shared config (after dotenv) ────────────────────────────────────────────
const { isDev, PORT, ALLOWED_ORIGINS } = require('./config');

const { checkDomainAvailability } = require('./godaddy');
const { getDomainInfo } = require('./whoisUtil');
const { generateBaseNames } = require('./gemini');

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CACHE_TTL = 300; // 5 minutes
const LONG_TERM_CACHE_TTL = 86400; // 24 hours
const MEDIUM_TERM_CACHE_TTL = 3600; // 1 hour
const EXPIRY_THRESHOLD_LONG = 180; // 6 months in days
const EXPIRY_THRESHOLD_MEDIUM = 30; // 30 days
const GODADDY_PRICE_UNIT = 1000000;

// ── In-memory cache ─────────────────────────────────────────────────────────────
const domainCache = new NodeCache({ stdTTL: DEFAULT_CACHE_TTL, checkperiod: 60 });

// ── Domain validation regex ──────────────────────────────────────────────────
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i;

const app = express();

if (isDev) {
  console.info(chalk.yellow('[DEV] Development mode active — verbose API logging enabled'));
}

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({
  // Allow serving the Vite SPA without CSP blocking inline scripts
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin in prod)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '16kb' }));

// ── Rate limiters ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a moment.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // Stricter limit for AI generation
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation limit reached. Please wait a minute before trying again.' },
});

// ── Dev request logger ───────────────────────────────────────────────────────
if (isDev) {
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.info(chalk.magenta(`[DEV] API Request: ${req.method} ${req.originalUrl}`));
    }
    next();
  });
}

// ── Static frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'ui/dist')));

// ── Helper: Dynamic TTL ──────────────────────────────────────────────────────
function getDynamicTTL(expirationDate) {
  if (!expirationDate || expirationDate === 'Unknown') return DEFAULT_CACHE_TTL;
  
  const expiry = new Date(expirationDate);
  const now = new Date();
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

  if (diffDays > EXPIRY_THRESHOLD_LONG) return LONG_TERM_CACHE_TTL;
  if (diffDays > EXPIRY_THRESHOLD_MEDIUM) return MEDIUM_TERM_CACHE_TTL;
  return DEFAULT_CACHE_TTL;
}

// ── Domain check endpoint ────────────────────────────────────────────────────
app.get('/api/check', apiLimiter, async (req, res) => {
  let domainName = (req.query.domain || '').trim().toLowerCase();

  if (!domainName) {
    return res.status(400).json({ error: 'Domain name is required' });
  }

  // append default tld if missing
  if (!domainName.includes('.')) {
    domainName += '.com';
  }

  // sanitise
  if (!DOMAIN_REGEX.test(domainName) || domainName.length > 253) {
    return res.status(400).json({ error: 'Invalid domain name' });
  }

  // serve from cache if available
  const cached = domainCache.get(domainName);
  if (cached) {
    if (isDev) console.info(chalk.cyan(`[DEV] Cache hit for: ${domainName}`));
    return res.json(cached);
  }

  try {
    // Run availability + WHOIS concurrently, but use allSettled for resilience
    const results = await Promise.allSettled([
      checkDomainAvailability(domainName),
      getDomainInfo(domainName),
    ]);

    const availResult = results[0].status === 'fulfilled' 
      ? results[0].value 
      : { domain: domainName, error: true };
    
    const extInfo = results[1].status === 'fulfilled' 
      ? results[1].value 
      : { owner: 'Unknown', purchasedDate: 'Unknown', expirationDate: 'Unknown', restrictions: { description: 'Whois lookup failed', countryRestriction: 'Unknown' }, whoisError: true };

    const responseData = {
      domain: domainName,
      available: availResult.available,
      price: availResult.price ? (availResult.price / GODADDY_PRICE_UNIT).toFixed(2) : null,
      currency: availResult.currency || 'USD',
      owner: extInfo.owner,
      purchasedDate: extInfo.purchasedDate,
      expirationDate: extInfo.expirationDate,
      restrictions: extInfo.restrictions,
      error: availResult.error || false,
      whoisError: extInfo.whoisError || false,
    };

    // Cache with dynamic TTL
    if (!responseData.error) {
      const ttl = getDynamicTTL(responseData.expirationDate);
      domainCache.set(domainName, responseData, ttl);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error in /api/check:', error);
    res.status(500).json({ error: 'Internal server error while checking domain' });
  }
});

// ── Name-generation endpoint ─────────────────────────────────────────────────
app.post('/api/generate', generateLimiter, async (req, res) => {
  try {
    const { keywords, prefixes, suffixes, prompt, tlds, exclude } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Product context prompt is required and must be a non-empty string' });
    }
    if (prompt.length > 1000) {
      return res.status(400).json({ error: 'Prompt must be 1000 characters or fewer' });
    }
    if (
      (keywords && !Array.isArray(keywords)) ||
      (prefixes && !Array.isArray(prefixes)) ||
      (suffixes && !Array.isArray(suffixes)) ||
      (tlds && !Array.isArray(tlds)) ||
      (exclude && !Array.isArray(exclude))
    ) {
      return res.status(400).json({ error: 'keywords, prefixes, suffixes, tlds, and exclude must be arrays when provided' });
    }

    const normalizedKeywords = (keywords || [])
      .filter((k) => typeof k === 'string')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if ((keywords || []).length !== normalizedKeywords.length) {
      return res.status(400).json({ error: 'All keywords must be strings' });
    }

    if (normalizedKeywords.length > 5) {
      return res.status(400).json({ error: 'keywords supports up to 5 words' });
    }

    if (normalizedKeywords.some((k) => /\s/.test(k))) {
      return res.status(400).json({ error: 'Each keyword must be a single token with no spaces' });
    }

    const cleanPrompt = prompt.trim();
    const activeTlds = (tlds && tlds.length > 0) ? tlds : ['.com', '.io', '.net'];

    // Step 1 – ask Gemini for creative base names (no TLDs)
    const baseSuggestions = await generateBaseNames({
      prompt: cleanPrompt,
      keywords: normalizedKeywords,
      prefixes,
      suffixes,
      exclude,
    });

    // Step 2 – apply TLDs server-side to keep control over the structure
    const suggestions = baseSuggestions.map((base) => ({
      base,
      domains: activeTlds.map((tld) => `${base}${tld}`),
    }));

    if (isDev) {
      const total = suggestions.reduce((acc, s) => acc + s.domains.length, 0);
      console.info(`[DEV] /api/generate → ${suggestions.length} suggestions, ${total} total domains`);
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: 'Failed to generate domain names.' });
  }
});

// ── SPA fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'ui/dist/index.html'));
});

// ── Start server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const serverInstance = app.listen(PORT, () => {
    console.info(`Nomo Lens Server running on http://localhost:${PORT}`);

    const gracefulShutdown = () => {
      console.info('\n[INFO] Graceful shutdown initiated...');
      serverInstance.close(() => {
        console.info('[INFO] Server closed. Exiting process.');
        process.exit(0);
      });
      setTimeout(() => {
        console.warn('[WARN] Could not close connections in time, forceful exit.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  });
}

module.exports = app;
