import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <section className="mode-section mode-section--static mode-section--wide glass">
      <h2 className="sr-only">{t('search.title')}</h2>
      <p className="lead-muted-center">
        {t('search.subtitle')}
      </p>
      <form className="search-bar-form" onSubmit={onSearch}>
        <label htmlFor="search-input" className="sr-only">{t('search.inputLabel')}</label>
        <div className="search-bar-row">
          <input
            ref={ref}
            id="search-input"
            type="text"
            className="search-input search-bar-input"
            placeholder={t('search.inputPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            aria-label={t('search.inputAriaLabel')}
            required
          />
          <button type="submit" className="search-btn search-bar-btn" disabled={loading || !query.trim()}>
            {loading ? t('search.buttonLoading') : t('search.buttonActive')}
          </button>
        </div>
        {tldBar}
      </form>

      {error && (
        <div className="error-msg" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button className="retry-btn" onClick={onRetry} type="button">
              {t('search.errorRetry')}
            </button>
          )}
        </div>
      )}

      {showFullPageLoader && (
        <div className="loader-container">
          <div className="spinner" />
          <p className="text-muted">{t('search.loadingText')}</p>
        </div>
      )}

      {loading && Object.keys(bulkResults).length > 0 && (
        <p className="inline-loading-hint" role="status">
          {t('search.updatingText')}
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
