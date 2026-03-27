import React, { forwardRef } from 'react';
import VerificationResultsSection from './VerificationResultsSection';

const DirectSearchTab = forwardRef(function DirectSearchTab(
  {
    tldBar,
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
    verificationSectionRef,
    onRefreshDomain,
    showVerificationResults,
  },
  ref
) {
  const showFullPageLoader = loading && Object.keys(bulkResults).length === 0;

  return (
    <section className="mode-section mode-section--static mode-section--wide glass">
      <h2 className="sr-only">Direct Search</h2>
      <p className="lead-muted-center">
        Check availability across multiple TLDs at once.
      </p>
      <form className="search-bar-form" onSubmit={onSearch}>
        <label htmlFor="search-input" className="sr-only">Domain name</label>
        <div className="search-bar-row">
          <input
            ref={ref}
            id="search-input"
            type="text"
            className="search-input search-bar-input"
            placeholder="e.g. spacex"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            aria-label="Domain name to search"
            required
          />
          <button type="submit" className="search-btn search-bar-btn" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Search all variants'}
          </button>
        </div>
        {tldBar}
      </form>

      {error && (
        <div className="error-msg" role="alert">
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
          <p className="text-muted">Querying registrars and WHOIS…</p>
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
          onRefreshDomain={onRefreshDomain}
        />
      )}
    </section>
  );
});

export default DirectSearchTab;
