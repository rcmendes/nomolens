/**
 * Shared configuration module.
 * Single source of truth for runtime flags and settings.
 */

const isDev =
  process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';

const PORT = parseInt(process.env.PORT, 10) || 3001;

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3001'];

/** Origin(s) allowed to call the API. Comma-separated in env. */
let allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [...defaultOrigins];

// Same-origin browser requests on Vercel send this origin; include it unless overridden explicitly.
if (process.env.VERCEL_URL) {
  const vercelOrigin = `https://${process.env.VERCEL_URL}`;
  if (!allowedOrigins.includes(vercelOrigin)) {
    allowedOrigins = [...allowedOrigins, vercelOrigin];
  }
}

const ALLOWED_ORIGINS = allowedOrigins;

module.exports = { isDev, PORT, ALLOWED_ORIGINS };
