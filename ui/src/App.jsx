import React, { useState, useEffect, useCallback } from 'react';
import DirectSearchTab from './DirectSearchTab';
import GeneratorTab from './GeneratorTab';

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

  // ── Direct Search State ────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const doSearch = useCallback(async (domainQuery) => {
    let domainToSearch = domainQuery.trim().toLowerCase();
    domainToSearch = domainToSearch.replace(/^https?:\/\//, '').split('/')[0];

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/check?domain=${encodeURIComponent(domainToSearch)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check domain');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    doSearch(query);
  };

  const handleRetry = () => {
    if (query.trim()) doSearch(query);
  };

  // ── Generator State ────────────────────────────────────────────────────────
  const [genName, setGenName] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [genPrefixes, setGenPrefixes] = useState('');
  const [genSuffixes, setGenSuffixes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null); // { original, suggestions }
  const [genError, setGenError] = useState(null);
  const [selectedTLDs, setSelectedTLDs] = useState(new Set(['.com']));
  const [customTLD, setCustomTLD] = useState('');
  const [customTLDError, setCustomTLDError] = useState('');
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [bulkResults, setBulkResults] = useState({});
  const [verifyProgress, setVerifyProgress] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genName.trim()) return;

    setGenerating(true);
    setGenError(null);
    setGenerationResult(null);
    setSelectedDomains(new Set());
    setBulkResults({});
    setVerifyProgress(null);

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: genName.trim(),
          prompt: genPrompt.trim(),
          prefixes: genPrefixes.split(',').map((p) => p.trim()).filter(Boolean),
          suffixes: genSuffixes.split(',').map((s) => s.trim()).filter(Boolean),
          tlds: Array.from(selectedTLDs),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate names');

      // data = { original: { base, domains[] }, suggestions: [{ base, domains[] }] }
      setGenerationResult(data);

      // Pre-select all domains
      const allDomains = [
        ...data.original.domains,
        ...data.suggestions.flatMap((s) => s.domains),
      ];
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

  const toggleDomainSelection = (domain) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  };

  const handleBulkVerify = async () => {
    if (selectedDomains.size === 0) return;

    // Only verify domains that don't already have a completed result
    const domainsToVerify = Array.from(selectedDomains).filter(
      (d) => !bulkResults[d] || bulkResults[d].loading
    );
    if (domainsToVerify.length === 0) return;

    setBulkVerifying(true);
    setVerifyProgress({ done: 0, total: domainsToVerify.length });

    // Mark all as loading upfront
    setBulkResults((prev) => {
      const next = { ...prev };
      for (const d of domainsToVerify) next[d] = { loading: true };
      return next;
    });

    // Verify concurrently using Promise.allSettled
    const settled = await Promise.allSettled(
      domainsToVerify.map(async (d) => {
        const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(d)}`);
        const data = await res.json();
        return { domain: d, data, ok: res.ok };
      })
    );

    const next = { ...bulkResults };
    let done = 0;
    for (const outcome of settled) {
      done++;
      if (outcome.status === 'fulfilled') {
        const { domain, data, ok } = outcome.value;
        next[domain] = { loading: false, data, error: !ok ? data.error || 'Error' : null };
      } else {
        // fulfilled === false means the fetch itself threw; find which domain it was
        // We'll use index-based matching since allSettled preserves order
        const domain = domainsToVerify[done - 1];
        next[domain] = { loading: false, error: outcome.reason?.message || 'Network error' };
      }
    }

    setBulkResults(next);
    setVerifyProgress({ done: domainsToVerify.length, total: domainsToVerify.length });
    setBulkVerifying(false);
  };

  return (
    <div className="app-container">
      <div className="header-actions">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle colour theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

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
          result={result}
          error={error}
          onSearch={handleSearch}
          onRetry={handleRetry}
        />
      </div>

      <div style={{ display: activeTab === 'generate' ? 'contents' : 'none' }}>
        <GeneratorTab
          genName={genName} setGenName={setGenName}
          genPrompt={genPrompt} setGenPrompt={setGenPrompt}
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
          bulkVerifying={bulkVerifying}
          bulkResults={bulkResults}
          handleBulkVerify={handleBulkVerify}
          verifyProgress={verifyProgress}
          onGenerate={handleGenerate}
        />
      </div>
    </div>
  );
}

export default App;
