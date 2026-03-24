const express = require('express');
const cors = require('cors');
const path = require('path');
const chalk = require('chalk');

// Load environment variables based on ENV_FILE or default to .env
const envPath = process.env.ENV_FILE
  ? path.resolve(__dirname, process.env.ENV_FILE)
  : path.resolve(__dirname, '.env');

const envResult = require('dotenv').config({ path: envPath });

// Always report environment loading status regardless of mode
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

// Always log critical variable presence (never log actual values)
const CRITICAL_VARS = ['GEMINI_API_KEY', 'GODADDY_API_KEY', 'GODADDY_API_SECRET'];
for (const varName of CRITICAL_VARS) {
  if (process.env[varName]) {
    console.info(chalk.green(`       [OK] ${varName} is set`));
  } else {
    console.warn(chalk.yellow(`       [MISSING] ${varName} is not set`));
  }
}

const { checkDomainAvailability } = require('./godaddy');
const { getDomainInfo } = require('./whoisUtil');
const app = express();
const PORT = process.env.PORT || 3001;

const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';

if (isDev) {
  console.log(chalk.yellow('[DEV] Development mode active — verbose API logging enabled'));
}

if (isDev) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(chalk.magenta(`[DEV] API Request: ${req.method} ${req.originalUrl}`));
    }
    next();
  });
}

app.use(cors());
app.use(express.json());

// Serve static frontend later if we want to run both in one process
app.use(express.static(path.join(__dirname, 'ui/dist')));

const { generateDomainNames } = require('./gemini');

// Unified endpoint for domain details
app.get('/api/check', async (req, res) => {
  const domainName = req.query.domain;
  
  if (!domainName) {
    return res.status(400).json({ error: 'Domain name is required' });
  }

  try {
    // 1. Check availability
    const availResult = await checkDomainAvailability(domainName);
    
    // 2. Fetch extended info (whois + restrictions)
    const extInfo = await getDomainInfo(domainName);
    
    // Combine results
    const responseData = {
      domain: domainName,
      available: availResult.available,
      price: availResult.price ? (availResult.price / 1000000).toFixed(2) : null,
      currency: availResult.currency || 'USD',
      owner: extInfo.owner,
      purchasedDate: extInfo.purchasedDate,
      expirationDate: extInfo.expirationDate,
      restrictions: extInfo.restrictions,
      error: availResult.error || false
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error in /api/check:', error);
    res.status(500).json({ error: 'Internal server error while checking domain' });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { name, prefixes, suffixes, prompt, tlds } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Base name is required' });
    }

    const domains = await generateDomainNames({ name, prefixes, suffixes, prompt, tlds });
    res.json(domains);
  } catch (error) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: 'Failed to generate domain names.' });
  }
});

// Fallback for React Router
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'ui/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Domain Horizon Server running on http://localhost:${PORT}`);
  
  // Safeguard: Keep-alive interval to prevent clean exits if the event loop goes empty in some environments
  setInterval(() => {
    // Just keeping the process alive
  }, 60000);
});
