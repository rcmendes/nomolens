const axios = require('axios');

const GODADDY_API_URL = process.env.GODADDY_API_URL || 'https://api.ote-godaddy.com';
const API_KEY = process.env.GODADDY_API_KEY;
const API_SECRET = process.env.GODADDY_API_SECRET;

const isMockMode = !API_KEY || !API_SECRET;

if (isMockMode) {
  console.info('⚠️  No GoDaddy API credentials found in .env. Using MOCK mode.');
}

async function checkDomainAvailability(domain) {
  if (isMockMode) {
    // Mock implementation: random availability, sometimes taken, sometimes available
    // Always make sure .test or example.com are taken for consistency
    if (domain.includes('example') || domain.includes('google')) {
      return { domain, available: false, definitive: true };
    }

    // Math.random() < 0.5 means 50% chance of being available
    const isAvailable = Math.random() < 0.5;
    return {
      domain,
      available: isAvailable,
      price: isAvailable ? Math.floor(Math.random() * 20) * 1000000 + 1000000 : undefined, // Random price
      currency: 'USD',
      definitive: true
    };
  }

  try {
    const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.info(`[DEV] API Call (GoDaddy): GET /v1/domains/available (domain: ${domain})`);
    }
    const response = await axios.get(`${GODADDY_API_URL}/v1/domains/available`, {
      params: { domain },
      headers: {
        'Authorization': `sso-key ${API_KEY}:${API_SECRET}`,
        'Accept': 'application/json'
      }
    });

    if (isDev) {
      console.info(`[DEV] API Response (GoDaddy): ${JSON.stringify(response.data)}`);
    }
    return response.data;
  } catch (error) {
    const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';
    if (isDev && error.response) {
      console.info(`[DEV] API Error Response (GoDaddy): ${JSON.stringify(error.response.data)}`);
    }
    console.error(`Error checking domain ${domain}:`, error.response?.data?.message || error.message);
    return { domain, error: true };
  }
}

async function checkDomainsBulk(domains) {
  if (isMockMode) {
    return Promise.all(domains.map(domain => checkDomainAvailability(domain)));
  }

  try {
    const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.info(`[DEV] API Call (GoDaddy): POST /v1/domains/available (bulk: ${domains.length} domains)`);
    }
    const response = await axios.post(`${GODADDY_API_URL}/v1/domains/available`, domains, {
      headers: {
        'Authorization': `sso-key ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (isDev) {
      console.info(`[DEV] API Response (GoDaddy Bulk): ${JSON.stringify(response.data)}`);
    }
    return response.data.domains || response.data;
  } catch (error) {
    const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';
    if (isDev && error.response) {
      console.info(`[DEV] API Error Response (GoDaddy Bulk): ${JSON.stringify(error.response.data)}`);
    }
    console.error(`Error in bulk check:`, error.response?.data?.message || error.message);
    // Fallback to individual checks if bulk fails or not supported for some reason
    const results = [];
    for (const domain of domains) {
      results.push(await checkDomainAvailability(domain));
    }
    return results;
  }
}

module.exports = {
  checkDomainAvailability,
  checkDomainsBulk,
  isMockMode
};
