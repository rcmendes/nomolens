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

// ── In-memory cache (5-min TTL) ─────────────────────────────────────────────
const domainCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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

// ── Rate limiter ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a moment.' },
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
      price: availResult.price ? (availResult.price / 1000000).toFixed(2) : null,
      currency: availResult.currency || 'USD',
      owner: extInfo.owner,
      purchasedDate: extInfo.purchasedDate,
      expirationDate: extInfo.expirationDate,
      restrictions: extInfo.restrictions,
      error: availResult.error || false,
      whoisError: extInfo.whoisError || false,
    };

    // Cache only successful (non-error) responses
    if (!responseData.error) {
      domainCache.set(domainName, responseData);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error in /api/check:', error);
    res.status(500).json({ error: 'Internal server error while checking domain' });
  }
});

// ── Name-generation endpoint ─────────────────────────────────────────────────
app.post('/api/generate', apiLimiter, async (req, res) => {
  try {
    const { name, prefixes, suffixes, prompt, tlds, exclude } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Base name is required and must be a string' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Base name must be 100 characters or fewer' });
    }
    if (prompt && (typeof prompt !== 'string' || prompt.length > 1000)) {
      return res.status(400).json({ error: 'Prompt must be a string of 1000 characters or fewer' });
    }
    if (
      (prefixes && !Array.isArray(prefixes)) ||
      (suffixes && !Array.isArray(suffixes)) ||
      (tlds && !Array.isArray(tlds))
    ) {
      return res.status(400).json({ error: 'prefixes, suffixes, and tlds must be arrays' });
    }

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
    const activeTlds = (tlds && tlds.length > 0) ? tlds : ['.com', '.io', '.net'];

    // Step 1 – ask Gemini for 10 creative base names (no TLDs)
    const baseSuggestions = await generateBaseNames({ name: cleanName, prefixes, suffixes, prompt, exclude });

    // Step 2 – apply TLDs server-side to keep control over the structure
    const original = {
      base: cleanName,
      domains: activeTlds.map((tld) => `${cleanName}${tld}`),
    };

    const suggestions = baseSuggestions.map((base) => ({
      base,
      domains: activeTlds.map((tld) => `${base}${tld}`),
    }));

    if (isDev) {
      const total = original.domains.length + suggestions.reduce((acc, s) => acc + s.domains.length, 0);
      console.info(`[DEV] /api/generate → ${suggestions.length} suggestions, ${total} total domains`);
    }

    res.json({ original, suggestions });
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
const serverInstance = app.listen(PORT, () => {
  console.info(`Domain Horizon Server running on http://localhost:${PORT}`);

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
