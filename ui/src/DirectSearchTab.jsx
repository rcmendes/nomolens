import React from 'react';
import VerificationResultsSection from './VerificationResultsSection';

const PREDEFINED_TLDS = ['.com', '.io', '.co', '.ai', '.net', '.org', '.app', '.dev', '.tech', '.me', '.pro'];

export default function DirectSearchTab({
  query, setQuery,
  loading,
  bulkResults,
  error,
  onSearch, onRetry,
  selectedTLDs, toggleTLD,
  customTLD, setCustomTLD,
  customTLDError,
  handleAddCustomTLD,
  favorites, addFavorite, removeFavorite, isFavorite,
}) {
  return (
    <section className="mode-section glass" style={{ animation: 'none', opacity: 1 }}>
      <h2 className="sr-only">Direct Search</h2>

      <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Check availability across multiple TLDs at once.
      </p>

      <form className="generator-form" onSubmit={onSearch}>
        <div className="form-group">
          <label htmlFor="search-input">Domain Name</label>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="e.g. spacex"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            aria-label="Domain name to search"
            style={{ paddingRight: '2rem' }}
            required
          />
        </div>

        <div className="form-group tld-section" style={{ marginTop: '0.5rem' }}>
          <label>Target TLDs</label>
          <div className="tld-chips">
            {PREDEFINED_TLDS.map((tld) => (
              <button
                key={tld}
                type="button"
                className={`tld-chip ${selectedTLDs.has(tld) ? 'selected' : ''}`}
                onClick={() => toggleTLD(tld)}
                disabled={loading}
              >
                {tld}
              </button>
            ))}
            {Array.from(selectedTLDs)
              .filter((tld) => !PREDEFINED_TLDS.includes(tld))
              .map((tld) => (
                <button
                  key={tld}
                  type="button"
                  className="tld-chip selected custom"
                  onClick={() => toggleTLD(tld)}
                  disabled={loading}
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
                if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTLD(e); }
              }}
              disabled={loading}
              aria-label="Custom TLD input"
            />
            <button
              type="button"
              className="add-tld-btn"
              onClick={handleAddCustomTLD}
              disabled={loading || !customTLD.trim()}
            >
              Add
            </button>
          </div>
          {customTLDError && (
            <p className="tld-error-msg" role="alert">{customTLDError}</p>
          )}
        </div>

        <button type="submit" className="search-btn generate-btn" disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Search All Variants'}
        </button>
      </form>

      {error && (
        <div className="error-msg" role="alert" style={{ marginTop: '1.5rem' }}>
          <span>{error}</span>
          {onRetry && (
            <button className="retry-btn" onClick={onRetry} type="button">
              Retry
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="loader-container">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Querying registrars and WHOIS…</p>
        </div>
      )}

      {Object.keys(bulkResults).length > 0 && (
        <VerificationResultsSection
          bulkResults={bulkResults}
          isFavorite={isFavorite}
          addFavorite={addFavorite}
          removeFavorite={removeFavorite}
        />
      )}
    </section>
  );
}
