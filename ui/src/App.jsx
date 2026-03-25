import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DirectSearchTab from './DirectSearchTab';
import GeneratorTab from './GeneratorTab';
import MonitorTab from './MonitorTab';
import FavoritesPanel from './FavoritesPanel';
import TldProfileBar from './TldProfileBar';
import CommandPalette from './CommandPalette';
import { getEntryStatus } from './domainResultUtils';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

function normalizeFavoriteRow(f) {
  return {
    domain: f.domain,
    status: f.status,
    price: f.price,
    currency: f.currency,
    notes: f.notes ?? '',
    tags: f.tags ?? '',
    addedAt: f.addedAt ?? new Date().toISOString(),
    checkedAt: f.checkedAt ?? null,
    expirationDate: f.expirationDate ?? null,
    whoisError: f.whoisError ?? null,
  };
}

function App() {
  const [theme, setTheme] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  );
  const [activeTab, setActiveTab] = useState('search');

  const searchInputRef = useRef(null);
  const genPromptRef = useRef(null);
  const verificationSectionRef = useRef(null);
  const tabSearchRef = useRef(null);
  const tabGenerateRef = useRef(null);
  const tabMonitorRef = useRef(null);
  const tabListRef = useRef(null);

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const [query, setQuery] = useState('');
  const [debouncedQueryForUrl, setDebouncedQueryForUrl] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQueryForUrl(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedTLDs, setSelectedTLDs] = useState(new Set(['.com']));
  const [customTLD, setCustomTLD] = useState('');
  const [customTLDError, setCustomTLDError] = useState('');

  const [bulkResults, setBulkResults] = useState({});
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(null);
  const FAV_KEY = 'domainHorizon_favorites';
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeFavoriteRow) : [];
    } catch {
      return [];
    }
  });

  const MON_KEY = 'domainHorizon_monitored';
  const [monitored, setMonitored] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(MON_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeFavoriteRow) : [];
    } catch {
      return [];
    }
  });

  const [recheckingDomain, setRecheckingDomain] = useState(null);
  const [recheckingMonitoredDomain, setRecheckingMonitoredDomain] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to persist favorites', e);
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(MON_KEY, JSON.stringify(monitored));
    } catch (e) {
      console.warn('Failed to persist monitored list', e);
    }
  }, [monitored]);

  const addFavorite = useCallback((domain, resultData) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.domain === domain)) return prev;
      return [
        normalizeFavoriteRow({
          domain,
          notes: '',
          tags: '',
          addedAt: new Date().toISOString(),
          checkedAt: new Date().toISOString(),
          ...resultData,
        }),
        ...prev,
      ];
    });
  }, []);

  const removeFavorite = useCallback((domain) => {
    setFavorites((prev) => prev.filter((f) => f.domain !== domain));
  }, []);

  const updateFavoriteField = useCallback((domain, patch) => {
    setFavorites((prev) => prev.map((f) => (f.domain === domain ? { ...f, ...patch } : f)));
  }, []);

  const isFavorite = useCallback(
    (domain) => favorites.some((f) => f.domain === domain),
    [favorites]
  );

  const addMonitored = useCallback((domain, resultData) => {
    setMonitored((prev) => {
      if (prev.some((m) => m.domain === domain)) return prev;
      return [
        normalizeFavoriteRow({
          domain,
          notes: '',
          tags: '',
          addedAt: new Date().toISOString(),
          checkedAt: new Date().toISOString(),
          ...resultData,
        }),
        ...prev,
      ];
    });
  }, []);

  const removeMonitored = useCallback((domain) => {
    setMonitored((prev) => prev.filter((m) => m.domain !== domain));
  }, []);

  const updateMonitoredField = useCallback((domain, patch) => {
    setMonitored((prev) => prev.map((m) => (m.domain === domain ? { ...m, ...patch } : m)));
  }, []);

  const isMonitored = useCallback(
    (domain) => monitored.some((m) => m.domain === domain),
    [monitored]
  );

  const CACHE_KEY = 'domainHorizon_cache';

  const getCachedResult = useCallback((domain) => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const entry = cache[domain];
      if (!entry) return null;

      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((domain, data) => {
    if (data.available || data.error) return;

    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');

      let expiresAt = null;
      if (data.expirationDate) {
        const d = new Date(data.expirationDate);
        d.setDate(d.getDate() - 1);
        expiresAt = d.toISOString();
      } else {
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

  const checkDomainApi = useCallback(
    async (domain) => {
      const checkedAt = new Date().toISOString();
      try {
        const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(domain)}`);
        const data = await res.json();
        const apiError = !res.ok ? data.error || 'Error' : null;
        if (!apiError && !data.available) saveToCache(domain, data);
        return { loading: false, data, error: apiError, checkedAt };
      } catch (e) {
        return { loading: false, error: e.message || 'Network error', checkedAt };
      }
    },
    [saveToCache]
  );

  const doSearch = useCallback(
    async (domainQuery) => {
      let base = domainQuery.trim().toLowerCase();
      base = base.replace(/^https?:\/\//, '').split('/')[0];
      if (base.includes('.')) {
        base = base.split('.')[0];
      }

      if (!base) return;

      setLoading(true);
      setError(null);
      setBulkResults({});

      const domainsToVerify = Array.from(selectedTLDs).map((tld) => `${base}${tld}`);

      setBulkVerifying(true);
      setVerifyProgress({ done: 0, total: domainsToVerify.length });

      const resultsToUpdate = {};
      const domainsRequiringFetch = [];

      for (const d of domainsToVerify) {
        const cached = getCachedResult(d);
        if (cached) {
          resultsToUpdate[d] = {
            loading: false,
            data: cached,
            error: null,
            checkedAt: null,
          };
        } else {
          domainsRequiringFetch.push(d);
          resultsToUpdate[d] = { loading: true };
        }
      }
      setBulkResults(resultsToUpdate);

      const cachedCount = domainsToVerify.length - domainsRequiringFetch.length;

      if (domainsRequiringFetch.length === 0) {
        setVerifyProgress({ done: domainsToVerify.length, total: domainsToVerify.length });
        setBulkVerifying(false);
        setLoading(false);
        return;
      }

      if (cachedCount > 0) {
        setLoading(false);
        setVerifyProgress({ done: cachedCount, total: domainsToVerify.length });
      }

      let fetchFailures = 0;
      let completed = 0;

      await Promise.all(
        domainsRequiringFetch.map(async (d) => {
          const outcome = await checkDomainApi(d);
          if (outcome.error) fetchFailures++;
          completed++;
          setBulkResults((prev) => ({ ...prev, [d]: outcome }));
          setVerifyProgress({ done: cachedCount + completed, total: domainsToVerify.length });
        })
      );

      if (fetchFailures === domainsRequiringFetch.length) {
        setError('Could not verify domains. Check your connection and try again.');
      }

      setBulkVerifying(false);
      setLoading(false);
    },
    [selectedTLDs, getCachedResult, checkDomainApi]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    doSearch(query);
  };

  const handleRetry = () => {
    if (query.trim()) doSearch(query);
  };

  const [genPrompt, setGenPrompt] = useState('');
  const [genKeywords, setGenKeywords] = useState([]);
  const [genKeywordInput, setGenKeywordInput] = useState('');
  const [genKeywordError, setGenKeywordError] = useState('');
  const [genPrefixes, setGenPrefixes] = useState('');
  const [genSuffixes, setGenSuffixes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
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
          exclude,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate names');

      setGenerationResult(data);

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

    let tld = `.${customTLD.trim().toLowerCase().replace(/^\.+/, '')}`;
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

    for (const d of allSelected) {
      const cached = getCachedResult(d);
      if (cached) {
        resultsToUpdate[d] = { loading: false, data: cached, error: null, checkedAt: null };
      } else if (!bulkResults[d] || bulkResults[d].loading || bulkResults[d].error) {
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
    const cachedInBatch = allSelected.length - domainsRequiringFetch.length;
    setVerifyProgress({ done: cachedInBatch, total: allSelected.length });

    let completed = 0;

    await Promise.all(
      domainsRequiringFetch.map(async (d) => {
        const outcome = await checkDomainApi(d);
        completed++;
        setBulkResults((prev) => ({ ...prev, [d]: outcome }));
        setVerifyProgress({ done: cachedInBatch + completed, total: allSelected.length });
      })
    );

    setVerifyProgress({ done: allSelected.length, total: allSelected.length });
    setBulkVerifying(false);
  };

  const refreshDomainCheck = useCallback(
    async (domain) => {
      setBulkResults((prev) => ({
        ...prev,
        [domain]: { ...prev[domain], loading: true },
      }));
      const outcome = await checkDomainApi(domain);
      setBulkResults((prev) => ({ ...prev, [domain]: outcome }));
    },
    [checkDomainApi]
  );

  const refreshFavorite = useCallback(
    async (domain) => {
      setRecheckingDomain(domain);
      try {
        const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(domain)}`);
        const data = await res.json();
        const apiError = !res.ok ? data.error || 'Error' : null;
        const synthetic = { loading: false, data, error: apiError };
        const status = getEntryStatus(synthetic);
        if (!apiError && !data.available) saveToCache(domain, data);
        setFavorites((prev) =>
          prev.map((f) =>
            f.domain === domain
              ? normalizeFavoriteRow({
                  ...f,
                  status,
                  price: data?.price,
                  currency: data?.currency,
                  checkedAt: new Date().toISOString(),
                  expirationDate: data?.expirationDate ?? null,
                  whoisError: data?.whoisError ?? null,
                })
              : f
          )
        );
      } catch (e) {
        console.warn('Re-check failed', e);
      } finally {
        setRecheckingDomain(null);
      }
    },
    [saveToCache]
  );

  const refreshMonitored = useCallback(
    async (domain) => {
      setRecheckingMonitoredDomain(domain);
      try {
        const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(domain)}`);
        const data = await res.json();
        const apiError = !res.ok ? data.error || 'Error' : null;
        const synthetic = { loading: false, data, error: apiError };
        const status = getEntryStatus(synthetic);
        if (!apiError && !data.available) saveToCache(domain, data);
        setMonitored((prev) =>
          prev.map((m) =>
            m.domain === domain
              ? normalizeFavoriteRow({
                  ...m,
                  status,
                  price: data?.price,
                  currency: data?.currency,
                  checkedAt: new Date().toISOString(),
                  expirationDate: data?.expirationDate ?? null,
                  whoisError: data?.whoisError ?? null,
                })
              : m
          )
        );
      } catch (e) {
        console.warn('Re-check monitored failed', e);
      } finally {
        setRecheckingMonitoredDomain(null);
      }
    },
    [saveToCache]
  );

  const skipInitialUrlWrite = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'generate' || tab === 'search' || tab === 'monitor') {
      setActiveTab(tab);
    }
    const q = params.get('q');
    if (q) setQuery(decodeURIComponent(q));
    const tlds = params.get('tlds');
    if (tlds) {
      const list = tlds.split(',').map((s) => s.trim()).filter(Boolean);
      const next = new Set();
      for (const t of list) {
        next.add(t.startsWith('.') ? t : `.${t}`);
      }
      if (next.size > 0) setSelectedTLDs(next);
    }
  }, []);

  useEffect(() => {
    if (skipInitialUrlWrite.current) {
      skipInitialUrlWrite.current = false;
      return;
    }
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    if (debouncedQueryForUrl.trim()) params.set('q', debouncedQueryForUrl.trim());
    const tldArr = Array.from(selectedTLDs).sort();
    if (tldArr.length) {
      params.set('tlds', tldArr.map((t) => t.replace(/^\./, '')).join(','));
    }
    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, [activeTab, debouncedQueryForUrl, selectedTLDs]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const copyAvailableDomains = useCallback(async () => {
    const available = Object.entries(bulkResults)
      .filter(([, r]) => getEntryStatus(r) === 'available')
      .map(([d]) => d)
      .sort();
    if (available.length === 0) return;
    try {
      await navigator.clipboard.writeText(available.join('\n'));
    } catch {
      /* ignore */
    }
  }, [bulkResults]);

  const hasAvailableToCopy = useMemo(
    () => Object.entries(bulkResults).some(([, r]) => getEntryStatus(r) === 'available'),
    [bulkResults]
  );

  const tldBarDisabled = loading || bulkVerifying || generating;

  const onTabListKeyDown = (e) => {
    const order = ['search', 'generate', 'monitor'];
    const i = order.indexOf(activeTab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? (i + 1) % order.length : (i - 1 + order.length) % order.length;
      setActiveTab(order[next]);
      requestAnimationFrame(() => {
        const refs = [tabSearchRef, tabGenerateRef, tabMonitorRef];
        refs[next].current?.focus();
      });
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab('search');
      tabSearchRef.current?.focus();
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveTab('monitor');
      tabMonitorRef.current?.focus();
    }
  };

  const showDirectVerification = activeTab === 'search' && Object.keys(bulkResults).length > 0;
  const showGenerateVerification =
    activeTab === 'generate' && generationResult && Object.keys(bulkResults).length > 0;

  return (
    <div className="page-shell">
      <div className="header-actions">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title="Toggle Theme"
          aria-label="Toggle colour theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          type="button"
          className="command-palette-trigger-btn"
          onClick={() => setPaletteOpen(true)}
          title="Command palette (⌘K)"
          aria-label="Open command palette"
        >
          ⌘K
        </button>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onVerifySelected={handleBulkVerify}
        onShowOnlyAvailable={() => verificationSectionRef.current?.showOnlyAvailable?.()}
        onResetFilters={() => verificationSectionRef.current?.resetFilters?.()}
        onCopyAvailable={copyAvailableDomains}
        hasAvailableToCopy={hasAvailableToCopy}
      />

      <div className="layout-wrapper">
        <div className="app-container">
          <header>
            <h1>Domain Horizon</h1>
            <p>Discover the unseen details of your next great idea.</p>
          </header>

          <div
            ref={tabListRef}
            className="tabs-container"
            role="tablist"
            aria-label="Main modes"
            onKeyDown={onTabListKeyDown}
          >
            <button
              ref={tabSearchRef}
              id="tab-search"
              role="tab"
              type="button"
              aria-selected={activeTab === 'search'}
              aria-controls="panel-search"
              tabIndex={activeTab === 'search' ? 0 : -1}
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Direct Search
            </button>
            <button
              ref={tabGenerateRef}
              id="tab-generate"
              role="tab"
              type="button"
              aria-selected={activeTab === 'generate'}
              aria-controls="panel-generate"
              tabIndex={activeTab === 'generate' ? 0 : -1}
              className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
              onClick={() => setActiveTab('generate')}
            >
              Generate with AI
            </button>
            <button
              ref={tabMonitorRef}
              id="tab-monitor"
              role="tab"
              type="button"
              aria-selected={activeTab === 'monitor'}
              aria-controls="panel-monitor"
              tabIndex={activeTab === 'monitor' ? 0 : -1}
              className={`tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              Monitor List
            </button>
          </div>

          {activeTab !== 'monitor' && (
            <TldProfileBar
              selectedTLDs={selectedTLDs}
              toggleTLD={toggleTLD}
              customTLD={customTLD}
              setCustomTLD={setCustomTLD}
              customTLDError={customTLDError}
              handleAddCustomTLD={handleAddCustomTLD}
              disabled={tldBarDisabled}
            />
          )}

          <div
            id="panel-search"
            role="tabpanel"
            aria-labelledby="tab-search"
            hidden={activeTab !== 'search'}
          >
            <DirectSearchTab
              ref={searchInputRef}
              query={query}
              setQuery={setQuery}
              loading={loading}
              bulkResults={bulkResults}
              error={error}
              onSearch={handleSearch}
              onRetry={handleRetry}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              isFavorite={isFavorite}
              addMonitored={addMonitored}
              removeMonitored={removeMonitored}
              isMonitored={isMonitored}
              verificationSectionRef={verificationSectionRef}
              onRefreshDomain={refreshDomainCheck}
              showVerificationResults={showDirectVerification}
            />
          </div>

          <div
            id="panel-generate"
            role="tabpanel"
            aria-labelledby="tab-generate"
            hidden={activeTab !== 'generate'}
          >
            <GeneratorTab
              ref={genPromptRef}
              genPrompt={genPrompt}
              setGenPrompt={setGenPrompt}
              genKeywords={genKeywords}
              genKeywordInput={genKeywordInput}
              setGenKeywordInput={setGenKeywordInput}
              genKeywordError={genKeywordError}
              setGenKeywordError={setGenKeywordError}
              handleAddGenKeyword={handleAddGenKeyword}
              handleRemoveGenKeyword={handleRemoveGenKeyword}
              genPrefixes={genPrefixes}
              setGenPrefixes={setGenPrefixes}
              genSuffixes={genSuffixes}
              setGenSuffixes={setGenSuffixes}
              generating={generating}
              generationResult={generationResult}
              genError={genError}
              selectedDomains={selectedDomains}
              toggleDomainSelection={toggleDomainSelection}
              hasSelectionChanged={hasSelectionChanged}
              bulkVerifying={bulkVerifying}
              bulkResults={bulkResults}
              handleBulkVerify={handleBulkVerify}
              verifyProgress={verifyProgress}
              onGenerate={handleGenerate}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              isFavorite={isFavorite}
              addMonitored={addMonitored}
              removeMonitored={removeMonitored}
              isMonitored={isMonitored}
              verificationSectionRef={verificationSectionRef}
              onRefreshDomain={refreshDomainCheck}
              showVerificationResults={showGenerateVerification}
            />
          </div>

          <div
            id="panel-monitor"
            role="tabpanel"
            aria-labelledby="tab-monitor"
            hidden={activeTab !== 'monitor'}
          >
            <MonitorTab
              monitored={monitored}
              removeMonitored={removeMonitored}
              updateMonitoredField={updateMonitoredField}
              onRecheckMonitored={refreshMonitored}
              recheckingMonitoredDomain={recheckingMonitoredDomain}
            />
          </div>
        </div>

        <FavoritesPanel
          favorites={favorites}
          onRemove={removeFavorite}
          onRecheck={refreshFavorite}
          onUpdateFavorite={updateFavoriteField}
          recheckingDomain={recheckingDomain}
        />
      </div>
    </div>
  );
}

export default App;
