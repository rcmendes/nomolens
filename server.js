const express = require('express');
const cors = require('cors');
const path = require('path');
const chalk = require('chalk');

// Load environment variables based on ENV_FILE or default to .env
const envPath = process.env.ENV_FILE ? path.resolve(__dirname, process.env.ENV_FILE) : path.resolve(__dirname, '.env');
const envResult = require('dotenv').config({ path: envPath });

if (envResult.parsed) {
  console.info(chalk.blue(`[INFO] Loaded environment variables from ${path.basename(envPath)}:`));
  console.info(chalk.cyan(`       Keys: ${Object.keys(envResult.parsed).join(', ')}`));
}

const { checkDomainAvailability } = require('./godaddy');
const { getDomainInfo } = require('./whoisUtil');
const app = express();
const PORT = process.env.PORT || 3001;

const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';

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
