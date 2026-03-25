import React, { forwardRef } from 'react';
import VerificationResultsSection from './VerificationResultsSection';

const DirectSearchTab = forwardRef(function DirectSearchTab(
  {
    query,
    setQuery,
    loading,
    bulkResults,
    error,
    onSearch,
    onRetry,
    addFavorite,
    removeFavorite,
    isFavorite,
    addMonitored,
    removeMonitored,
    isMonitored,
    verificationSectionRef,
    onRefreshDomain,
    showVerificationResults,
  },
  ref
) {
  const showFullPageLoader = loading && Object.keys(bulkResults).length === 0;

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
            ref={ref}
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

      {showFullPageLoader && (
        <div className="loader-container">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Querying registrars and WHOIS…</p>
        </div>
      )}

      {loading && Object.keys(bulkResults).length > 0 && (
        <p className="inline-loading-hint" role="status">
          Updating remaining checks…
        </p>
      )}

      {showVerificationResults && Object.keys(bulkResults).length > 0 && (
        <VerificationResultsSection
          ref={verificationSectionRef}
          bulkResults={bulkResults}
          isFavorite={isFavorite}
          addFavorite={addFavorite}
          removeFavorite={removeFavorite}
          isMonitored={isMonitored}
          addMonitored={addMonitored}
          removeMonitored={removeMonitored}
          onRefreshDomain={onRefreshDomain}
        />
      )}
    </section>
  );
});

export default DirectSearchTab;
