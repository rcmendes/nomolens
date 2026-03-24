import React, { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Idea Generator State
  const [genName, setGenName] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [genPrefixes, setGenPrefixes] = useState('');
  const [genSuffixes, setGenSuffixes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedDomains, setGeneratedDomains] = useState([]);
  const [genError, setGenError] = useState(null);
  const predefinedTLDs = ['.com', '.io', '.co', '.ai', '.net', '.org', '.app', '.dev', '.tech', '.me'];
  const [selectedTLDs, setSelectedTLDs] = useState(new Set(['.com']));
  const [customTLD, setCustomTLD] = useState('');
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [bulkResults, setBulkResults] = useState({});

  // Theme & Tab State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Clean query
      let domainToSearch = query.trim().toLowerCase();
      // Remove protocol if present
      domainToSearch = domainToSearch.replace(/^https?:\/\//, '');
      // Keep only host
      domainToSearch = domainToSearch.split('/')[0];

      // Assuming API acts as same origin if served via Express, or http://localhost:3001 if dev
      const apiUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
      
      const res = await fetch(`${apiUrl}/api/check?domain=${domainToSearch}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check domain');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genName.trim()) return;

    setGenerating(true);
    setGenError(null);
    setGeneratedDomains([]);
    setSelectedDomains(new Set());
    setBulkResults({});

    try {
      const apiUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
      
      const res = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: genName.trim(),
          prompt: genPrompt.trim(),
          prefixes: genPrefixes.split(',').map(p => p.trim()).filter(Boolean),
          suffixes: genSuffixes.split(',').map(s => s.trim()).filter(Boolean),
          tlds: Array.from(selectedTLDs)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate names');

      setGeneratedDomains(data);
      // Select all by default
      setSelectedDomains(new Set(data));
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTLD = (tld) => {
    setSelectedTLDs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tld)) {
        newSet.delete(tld);
      } else {
        newSet.add(tld);
      }
      return newSet;
    });
  };

  const handleAddCustomTLD = (e) => {
    e.preventDefault();
    if (!customTLD.trim()) return;
    let tld = customTLD.trim().toLowerCase();
    if (!tld.startsWith('.')) tld = '.' + tld;
    
    setSelectedTLDs(prev => {
      const newSet = new Set(prev);
      newSet.add(tld);
      return newSet;
    });
    setCustomTLD('');
  };

  const toggleDomainSelection = (domain) => {
    setSelectedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  };

  const handleBulkVerify = async () => {
    if (selectedDomains.size === 0) return;
    
    setBulkVerifying(true);
    const apiUrl = import.meta.env.DEV ? 'http://localhost:3001' : '';
    const domainsToVerify = Array.from(selectedDomains);
    const results = { ...bulkResults };

    // Set them all to checking state
    for (const d of domainsToVerify) {
      if (!results[d]) {
        results[d] = { loading: true };
      }
    }
    setBulkResults({ ...results });

    // Verify concurrently or sequentially. We'll do a simple sequential loop here to not hammer the API too hard instantly.
    for (const d of domainsToVerify) {
      try {
        const res = await fetch(`${apiUrl}/api/check?domain=${d}`);
        const data = await res.json();
        results[d] = { loading: false, data: data, error: !res.ok ? (data.error || 'Error') : null };
      } catch (err) {
        results[d] = { loading: false, error: err.message };
      }
      setBulkResults({ ...results });
    }

    setBulkVerifying(false);
  };

  return (
    <div className="app-container">
      <div className="header-actions">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <header>
        <h1>Domain Horizon</h1>
        <p>Discover the unseen details of your next great idea.</p>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`} 
          onClick={() => setActiveTab('search')}
        >
          Direct Search
        </button>
        <button 
          className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`} 
          onClick={() => setActiveTab('generate')}
        >
          Generate with AI
        </button>
      </div>

      {activeTab === 'search' && (
      <section className="mode-section glass" style={{animation: 'none', opacity: 1}}>
        <h2 className="sr-only" style={{display: 'none'}}>Direct Search</h2>


      <form className="search-container" onSubmit={handleSearch}>
        <input 
          type="text" 
          className="search-input" 
          placeholder="e.g. spacex.com" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
          {loading ? 'Searching' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="error-msg">
          {error}
        </div>
      )}

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-muted)' }}>Querying registrars and WHOIS...</p>
        </div>
      )}

      {result && !loading && (
        <div className="result-card glass">
          <div className={`status-badge ${result.error ? 'status-error' : result.available ? 'status-available' : 'status-taken'}`}>
            {result.error ? 'Error' : result.available ? 'Available' : 'Taken'}
          </div>
          
          <h2 className="domain-title">{result.domain}</h2>
          
          {result.available && result.price && (
            <div className="domain-price">
              {result.currency === 'USD' ? '$' : result.currency + ' '}{result.price}
            </div>
          )}

          {!result.available && !result.error && (
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Current Owner</span>
                <span className="info-value">{result.owner || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Purchased On</span>
                <span className="info-value">{result.purchasedDate?.split('T')[0] || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Expires On</span>
                <span className="info-value">{result.expirationDate?.split('T')[0] || 'Unknown'}</span>
              </div>
            </div>
          )}

          {result.restrictions && (
            <div className="restrictions-box">
              <h3>Requirements & Restrictions</h3>
              <p><strong>Usage: </strong> {result.restrictions.description}</p>
              <p><strong>Country/Region: </strong> {result.restrictions.countryRestriction}</p>
            </div>
          )}
        </div>
      )}
      </section>
      )}

      {activeTab === 'generate' && (
      <section className="mode-section glass" style={{animation: 'none', opacity: 1}}>
        <h2 className="sr-only" style={{display: 'none'}}>Idea Generator</h2>
        <p style={{marginBottom: '1.5rem', color: 'var(--text-muted)', textAlign: 'center'}}>Let AI brainstorm domain names based on your product's context.</p>
        
        <form className="generator-form" onSubmit={handleGenerate}>
          <div className="form-group">
            <label>Base Name <span className="required">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Tamojunto" 
              value={genName}
              onChange={(e) => setGenName(e.target.value)}
              disabled={generating}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Product Context / Prompt</label>
            <textarea 
              placeholder="e.g. A marketplace connecting local services..." 
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              disabled={generating}
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prefixes (comma-separated)</label>
              <input 
                type="text" 
                placeholder="e.g. get, try, my" 
                value={genPrefixes}
                onChange={(e) => setGenPrefixes(e.target.value)}
                disabled={generating}
              />
            </div>
            
            <div className="form-group">
              <label>Suffixes (comma-separated)</label>
              <input 
                type="text" 
                placeholder="e.g. app, hq, tech" 
                value={genSuffixes}
                onChange={(e) => setGenSuffixes(e.target.value)}
                disabled={generating}
              />
            </div>
          </div>

          <div className="form-group tld-section">
            <label>TLDs (Optional)</label>
            <div className="tld-chips">
              {predefinedTLDs.map(tld => (
                <button
                  key={tld}
                  type="button"
                  className={`tld-chip ${selectedTLDs.has(tld) ? 'selected' : ''}`}
                  onClick={() => toggleTLD(tld)}
                  disabled={generating}
                >
                  {tld}
                </button>
              ))}
              {Array.from(selectedTLDs).filter(tld => !predefinedTLDs.includes(tld)).map(tld => (
                <button
                  key={tld}
                  type="button"
                  className="tld-chip selected custom"
                  onClick={() => toggleTLD(tld)}
                  disabled={generating}
                  title="Remove custom TLD"
                >
                  {tld} &times;
                </button>
              ))}
            </div>
            <div className="custom-tld-input">
              <input
                type="text"
                placeholder="Add custom (.xyz)"
                value={customTLD}
                onChange={(e) => setCustomTLD(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTLD(e);
                  }
                }}
                disabled={generating}
              />
              <button 
                type="button" 
                className="add-tld-btn"
                onClick={handleAddCustomTLD} 
                disabled={generating || !customTLD.trim()}
              >
                Add
              </button>
            </div>
          </div>

          <button type="submit" className="search-btn generate-btn" disabled={generating || !genName.trim()}>
            {generating ? 'Brainstorming...' : 'Generate with AI'}
          </button>
        </form>

        {genError && (
          <div className="error-msg" style={{marginTop: '1rem'}}>
            {genError}
          </div>
        )}

        {generating && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-muted)' }}>Asking Gemini to weave some magic...</p>
          </div>
        )}

        {generatedDomains.length > 0 && (
          <div className="generated-results">
            <h3 style={{fontSize: '1.2rem', marginBottom: '1rem'}}>Generated Ideas for "{genName}"</h3>

            <div className="tree-container">
              <div className="tree-root">
                <span className="tree-root-name">{genName}</span>
              </div>
              <div className="tree-branches">
                {generatedDomains.map(d => (
                  <div key={d} className="tree-branch">
                    <div className="tree-line"></div>
                    <div className={`tree-card glass ${selectedDomains.has(d) ? 'selected' : ''}`} onClick={(e) => { if(e.target.tagName !== 'INPUT') toggleDomainSelection(d); }}>
                      <label className="tree-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={selectedDomains.has(d)}
                          onChange={() => toggleDomainSelection(d)}
                          disabled={bulkVerifying}
                        />
                        <span className="tree-domain-text">{d}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedDomains.size > 0 && (
              <div className="verify-action-container">
                <button 
                  className="verify-btn" 
                  onClick={handleBulkVerify}
                  disabled={bulkVerifying}
                >
                  {bulkVerifying ? 'Verifying...' : `Verify Selected (${selectedDomains.size})`}
                </button>
              </div>
            )}

            {Object.keys(bulkResults).length > 0 && (
              <div className="verification-results-section" style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--text-color)' }}>Verification Results</h3>
                <div className="compact-results-list">
                  {Object.entries(bulkResults).map(([domain, result]) => (
                    <div key={domain} className="compact-result-card glass">
                      <div className="compact-header">
                        <span className="compact-domain">{domain}</span>
                        {result.loading ? (
                          <span className="compact-badge checking">Checking...</span>
                        ) : result.error ? (
                          <span className="compact-badge error">Error</span>
                        ) : result.data.available ? (
                          <span className="compact-badge available">Available</span>
                        ) : (
                          <span className="compact-badge taken">Taken</span>
                        )}
                      </div>
                      
                      {!result.loading && !result.error && result.data && (
                        <div className="compact-body">
                          {result.data.available ? (
                            <div className="compact-price">
                              {result.data.currency === 'USD' ? '$' : result.data.currency + ' '}{result.data.price}
                            </div>
                          ) : (
                            <div className="compact-info-grid">
                              <div className="compact-info-col">
                                <span className="compact-label">Owner</span>
                                <span className="compact-value" title={result.data.owner || 'Unknown'}>{result.data.owner || 'Unknown'}</span>
                              </div>
                              <div className="compact-info-col">
                                <span className="compact-label">Purchased</span>
                                <span className="compact-value">{result.data.purchasedDate?.split('T')[0] || '-'}</span>
                              </div>
                              <div className="compact-info-col">
                                <span className="compact-label">Expires</span>
                                <span className="compact-value">{result.data.expirationDate?.split('T')[0] || '-'}</span>
                              </div>
                            </div>
                          )}
                          
                          {result.data.restrictions && (
                            <div className="compact-restrictions" title={result.data.restrictions.description}>
                              <span className="compact-label">Restrictions:</span> {result.data.restrictions.countryRestriction}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

export default App;
