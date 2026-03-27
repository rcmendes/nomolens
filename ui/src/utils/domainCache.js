const CACHE_KEY = 'nomoLens_cache';
const MAX_CACHE_ENTRIES = 500;

/**
 * Persists a result to the local domain cache.
 * Implements LRU eviction if the cache exceeds MAX_CACHE_ENTRIES.
 */
export const saveToCache = (domain, data) => {
  if (data.available || data.error) return;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};

    let expiresAt = null;
    if (data.expirationDate) {
      const d = new Date(data.expirationDate);
      d.setDate(d.getDate() - 1);
      expiresAt = d.toISOString();
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 30); // Default 30 days
      expiresAt = d.toISOString();
    }

    // Add/Update entry
    cache[domain] = {
      data,
      expiresAt,
      cachedAt: new Date().toISOString(),
      lastUsed: Date.now(),
    };

    // LRU Eviction
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_ENTRIES) {
      const sorted = entries.sort((a, b) => (a[1].lastUsed || 0) - (b[1].lastUsed || 0));
      const toRemove = sorted.slice(0, entries.length - MAX_CACHE_ENTRIES);
      for (const [key] of toRemove) {
        delete cache[key];
      }
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save to localStorage cache', e);
  }
};

/**
 * Retrieves a result from the local domain cache if it exists and hasn't expired.
 */
export const getCachedResult = (domain) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    
    const entry = cache[domain];
    if (!entry) return null;

    // Guard for Invalid Date
    const expiry = new Date(entry.expiresAt);
    if (isNaN(expiry.getTime()) || expiry < new Date()) {
      return null;
    }

    // Update lastUsed for LRU
    entry.lastUsed = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

    return entry.data;
  } catch {
    return null;
  }
};

/**
 * Returns cache statistics.
 */
export const getCacheStats = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    const entries = Object.keys(cache);
    return {
      count: entries.length,
      sizeBytes: raw ? raw.length : 0,
    };
  } catch {
    return { count: 0, sizeBytes: 0 };
  }
};

/**
 * Clears the domain cache.
 */
export const clearCache = () => {
  localStorage.removeItem(CACHE_KEY);
};
