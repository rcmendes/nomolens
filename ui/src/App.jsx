import React, { useState, useEffect, useCallback } from 'react';
import DirectSearchTab from './DirectSearchTab';
import GeneratorTab from './GeneratorTab';
import FavoritesPanel from './FavoritesPanel';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

function App() {
  // ── Theme & Tab ────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  );
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // ── Shared Domain State ───────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedTLDs, setSelectedTLDs] = useState(new Set(['.com']));
  const [customTLD, setCustomTLD] = useState('');
  const [customTLDError, setCustomTLDError] = useState('');
  
  const [bulkResults, setBulkResults] = useState({});
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(null);

  // ── Favorites ─────────────────────────────────────────────────────────────
  const FAV_KEY = 'domainHorizon_favorites';

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to persist favorites', e);
    }
  }, [favorites]);

  const addFavorite = useCallback((domain, resultData) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.domain === domain)) return prev;
      return [{ domain, ...resultData }, ...prev];
    });
  }, []);

  const removeFavorite = useCallback((domain) => {
    setFavorites((prev) => prev.filter((f) => f.domain !== domain));
  }, []);

  const isFavorite = useCallback(
    (domain) => favorites.some((f) => f.domain === domain),
    [favorites]
  );

  // ── Cache Helpers ──────────────────────────────────────────────────────────
  const CACHE_KEY = 'domainHorizon_cache';

  const getCachedResult = useCallback((domain) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const entry = cache[domain];
      if (!entry) return null;

      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        // Expired
        return null;
      }
      return entry.data;
    } catch (e) {
      return null;
    }
  }, []);

  const saveToCache = useCallback((domain, data) => {
    // Only cache "taken" results. Available ones can change any second.
    if (data.available || data.error) return;

    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      
      let expiresAt = null;
      if (data.expirationDate) {
        // Cache until 1 day before real expiration
        const d = new Date(data.expirationDate);
        d.setDate(d.getDate() - 1);
        expiresAt = d.toISOString();
      } else {
        // Default 30 days if no expiration date provided by API
        const d = new Date();
        d.setDate(d.getDate() + 30);
        expiresAt = d.toISOString();
      }

      cache[domain] = { data, expiresAt, cachedAt: new Date().toISOString() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save to localStorage cache', e);
    }
  }, []);

  const doSearch = useCallback(async (domainQuery) => {
    let base = domainQuery.trim().toLowerCase();
    base = base.replace(/^https?:\/\//, '').split('/')[0];
    // remove existing TLD if present for bulk expansion
    if (base.includes('.')) {
      base = base.split('.')[0];
    }

    if (!base) return;

    setLoading(true);
    setError(null);
    setBulkResults({}); // Clear previous results
    
    const domainsToVerify = Array.from(selectedTLDs).map(tld => `${base}${tld}`);
    
    // We reuse the bulk verification logic but for a smaller set or direct search
    setBulkVerifying(true);
    setVerifyProgress({ done: 0, total: domainsToVerify.length });

    const resultsToUpdate = {};
    const domainsRequiringFetch = [];

    for (const d of domainsToVerify) {
      const cached = getCachedResult(d);
      if (cached) {
        resultsToUpdate[d] = { loading: false, data: cached, error: null };
      } else {
        domainsRequiringFetch.push(d);
        resultsToUpdate[d] = { loading: true };
      }
    }
    setBulkResults(resultsToUpdate);

    if (domainsRequiringFetch.length > 0) {
      const settled = await Promise.allSettled(
        domainsRequiringFetch.map(async (d) => {
          const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(d)}`);
          const data = await res.json();
          return { domain: d, data, ok: res.ok };
        })
      );

      const next = { ...resultsToUpdate };
      let done = 0;
      for (const outcome of settled) {
        done++;
        if (outcome.status === 'fulfilled') {
          const { domain, data, ok } = outcome.value;
          const err = !ok ? data.error || 'Error' : null;
          next[domain] = { loading: false, data, err };
          if (!err && !data.available) saveToCache(domain, data);
        } else {
          const domain = domainsRequiringFetch[done - 1];
          next[domain] = { loading: false, error: outcome.reason?.message || 'Network error' };
        }
      }
      setBulkResults(next);
    }

    setVerifyProgress({ done: domainsToVerify.length, total: domainsToVerify.length });
    setBulkVerifying(false);
    setLoading(false);
  }, [selectedTLDs, getCachedResult, saveToCache]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    doSearch(query);
  };

  const handleRetry = () => {
    if (query.trim()) doSearch(query);
  };

  // ── Generator State ────────────────────────────────────────────────────────
  const [genPrompt, setGenPrompt] = useState('');
  const [genKeywords, setGenKeywords] = useState([]);
  const [genKeywordInput, setGenKeywordInput] = useState('');
  const [genKeywordError, setGenKeywordError] = useState('');
  const [genPrefixes, setGenPrefixes] = useState('');
  const [genSuffixes, setGenSuffixes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null); // { original, suggestions }
  const [genError, setGenError] = useState(null);
   const [selectedDomains, setSelectedDomains] = useState(new Set());
   const [lastVerifiedDomains, setLastVerifiedDomains] = useState(new Set());
 
   const hasSelectionChanged = React.useMemo(() => {
     if (selectedDomains.size !== lastVerifiedDomains.size) return true;
     for (const d of selectedDomains) {
       if (!lastVerifiedDomains.has(d)) return true;
     }
     return false;
   }, [selectedDomains, lastVerifiedDomains]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genPrompt.trim()) return;

    setGenerating(true);
    setGenError(null);
    setGenerationResult(null);
     setLastVerifiedDomains(new Set());
      setBulkResults({});
    setVerifyProgress(null);

    try {
      // Get all domain names from cache to exclude
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const exclude = Object.keys(cache);

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: genPrompt.trim(),
          keywords: genKeywords,
          prefixes: genPrefixes.split(',').map((p) => p.trim()).filter(Boolean),
          suffixes: genSuffixes.split(',').map((s) => s.trim()).filter(Boolean),
          tlds: Array.from(selectedTLDs),
          exclude: exclude,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate names');

      // data = { suggestions: [{ base, domains[] }] }
      setGenerationResult(data);

      // Pre-select all domains
      const allDomains = data.suggestions.flatMap((s) => s.domains);
      setSelectedDomains(new Set(allDomains));
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTLD = (tld) => {
    setSelectedTLDs((prev) => {
      const next = new Set(prev);
      next.has(tld) ? next.delete(tld) : next.add(tld);
      return next;
    });
  };

  const handleAddCustomTLD = (e) => {
    e.preventDefault?.();
    if (!customTLD.trim()) return;

    let tld = '.' + customTLD.trim().toLowerCase().replace(/^\.+/, '');
    const tldRegex = /^\.[a-z]{2,}(\.[a-z]{2,})*$/;
    if (!tldRegex.test(tld)) {
      setCustomTLDError(
        'Invalid TLD. Must be 2+ letters (e.g. .xyz) or multi-part (e.g. .co.uk). Numbers and special characters are not allowed.'
      );
      return;
    }
    setCustomTLDError('');
    setSelectedTLDs((prev) => new Set([...prev, tld]));
    setCustomTLD('');
  };

  const handleAddGenKeyword = (e) => {
    e.preventDefault?.();

    const raw = genKeywordInput.trim();
    if (!raw) return;

    if (/\s/.test(raw)) {
      setGenKeywordError('Each weighted word must be a single token (no spaces).');
      return;
    }

    if (genKeywords.length >= 5) {
      setGenKeywordError('You can add up to 5 weighted words.');
      return;
    }

    const normalized = raw.toLowerCase();
    if (genKeywords.includes(normalized)) {
      setGenKeywordError('This weighted word is already added.');
      return;
    }

    setGenKeywords((prev) => [...prev, normalized]);
    setGenKeywordInput('');
    setGenKeywordError('');
  };

  const handleRemoveGenKeyword = (keyword) => {
    setGenKeywords((prev) => prev.filter((k) => k !== keyword));
    setGenKeywordError('');
  };

  const toggleDomainSelection = (domain) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  };


  const handleBulkVerify = async () => {
    if (selectedDomains.size === 0) return;
   setLastVerifiedDomains(new Set(selectedDomains));

    const allSelected = Array.from(selectedDomains);
    const resultsToUpdate = { ...bulkResults };
    const domainsRequiringFetch = [];

    // 1. Check cache first
    for (const d of allSelected) {
      const cached = getCachedResult(d);
      if (cached) {
        resultsToUpdate[d] = { loading: false, data: cached, error: null };
      } else if (!bulkResults[d] || bulkResults[d].loading || bulkResults[d].error) {
        // Not in cache and not already verified successfully
        domainsRequiringFetch.push(d);
        resultsToUpdate[d] = { loading: true };
      }
    }

    if (domainsRequiringFetch.length === 0) {
      setBulkResults(resultsToUpdate);
      return;
    }

    setBulkResults(resultsToUpdate);
    setBulkVerifying(true);
    setVerifyProgress({ done: 0, total: domainsRequiringFetch.length });

    // 2. Verify uncached concurrently
    const settled = await Promise.allSettled(
      domainsRequiringFetch.map(async (d) => {
        const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(d)}`);
        const data = await res.json();
        return { domain: d, data, ok: res.ok };
      })
    );

    const next = { ...resultsToUpdate };
    let done = 0;
    for (const outcome of settled) {
      done++;
      if (outcome.status === 'fulfilled') {
        const { domain, data, ok } = outcome.value;
        const error = !ok ? data.error || 'Error' : null;
        next[domain] = { loading: false, data, error };
        
        if (!error && !data.available) {
          saveToCache(domain, data);
        }
      } else {
        const domain = domainsRequiringFetch[done - 1];
        next[domain] = { loading: false, error: outcome.reason?.message || 'Network error' };
      }
    }

    setBulkResults(next);
    setVerifyProgress({ done: domainsRequiringFetch.length, total: domainsRequiringFetch.length });
    setBulkVerifying(false);
  };

  return (
    <div className="page-shell">
      {/* ── Top-right controls ── */}
      <div className="header-actions">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle colour theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* ── Main two-column wrapper ── */}
      <div className="layout-wrapper">
        {/* ── Left / centre: existing app ── */}
        <div className="app-container">
          <header>
            <h1>Domain Horizon</h1>
            <p>Discover the unseen details of your next great idea.</p>
          </header>

          <div className="tabs-container" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'search'}
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Direct Search
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'generate'}
              className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
              onClick={() => setActiveTab('generate')}
            >
              Generate with AI
            </button>
          </div>

          {/* Tabs are always mounted—CSS display controls visibility—so state is preserved */}
          <div style={{ display: activeTab === 'search' ? 'contents' : 'none' }}>
            <DirectSearchTab
              query={query}
              setQuery={setQuery}
              loading={loading}
              bulkResults={bulkResults}
              error={error}
              onSearch={handleSearch}
              onRetry={handleRetry}
              selectedTLDs={selectedTLDs}
              toggleTLD={toggleTLD}
              customTLD={customTLD}
              setCustomTLD={setCustomTLD}
              customTLDError={customTLDError}
              handleAddCustomTLD={handleAddCustomTLD}
              favorites={favorites}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              isFavorite={isFavorite}
            />
          </div>

          <div style={{ display: activeTab === 'generate' ? 'contents' : 'none' }}>
            <GeneratorTab
              genPrompt={genPrompt} setGenPrompt={setGenPrompt}
              genKeywords={genKeywords}
              genKeywordInput={genKeywordInput}
              setGenKeywordInput={setGenKeywordInput}
              genKeywordError={genKeywordError}
              setGenKeywordError={setGenKeywordError}
              handleAddGenKeyword={handleAddGenKeyword}
              handleRemoveGenKeyword={handleRemoveGenKeyword}
              genPrefixes={genPrefixes} setGenPrefixes={setGenPrefixes}
              genSuffixes={genSuffixes} setGenSuffixes={setGenSuffixes}
              generating={generating}
              generationResult={generationResult}
              genError={genError}
              selectedTLDs={selectedTLDs} toggleTLD={toggleTLD}
              customTLD={customTLD} setCustomTLD={setCustomTLD}
              customTLDError={customTLDError}
              handleAddCustomTLD={handleAddCustomTLD}
               selectedDomains={selectedDomains} toggleDomainSelection={toggleDomainSelection}
               hasSelectionChanged={hasSelectionChanged}
               bulkVerifying={bulkVerifying}
              bulkResults={bulkResults}
              handleBulkVerify={handleBulkVerify}
              verifyProgress={verifyProgress}
              onGenerate={handleGenerate}
              favorites={favorites}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              isFavorite={isFavorite}
            />
          </div>
        </div>

        {/* ── Right: always-visible favorites panel ── */}
        <FavoritesPanel
          favorites={favorites}
          onRemove={removeFavorite}
        />
      </div>
    </div>
  );
}

export default App;
