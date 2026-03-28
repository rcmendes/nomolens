import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { getEntryStatus } from './domainResultUtils';
import ResultsCockpit from './ResultsCockpit';
import { RefreshIcon, StarIcon } from './icons';

function formatCheckedAt(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return null;
  }
}

function VerificationCard({
  domain,
  result,
  isFavorite,
  addFavorite,
  removeFavorite,
  onRefreshDomain,
}) {
  const status = getEntryStatus(result);
  const faved = isFavorite(domain);

  const handleFavToggle = (e) => {
    e.stopPropagation();
    if (faved) {
      removeFavorite(domain);
    } else {
      addFavorite(domain, {
        status,
        price: result.data?.price,
        currency: result.data?.currency,
        expirationDate: result.data?.expirationDate,
        whoisError: result.data?.whoisError,
      });
    }
  };

  const checkedLabel = formatCheckedAt(result.checkedAt);

  const hasPrice = !result.error && result.data?.available && result.data.price;

  let daysUntilExpiry = null;
  if (status === 'expiring-soon' && result.data?.expirationDate) {
    const expiry = new Date(result.data.expirationDate);
    daysUntilExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
  }

  const actionButtons = !result.loading && (
    <div className="compact-card-btn-row">
      {onRefreshDomain && (
        <button
          type="button"
          className="compact-refresh-btn"
          onClick={() => onRefreshDomain(domain)}
          aria-label={`Refresh check for ${domain}`}
          title="Refresh this check"
        >
          <RefreshIcon size={16} />
        </button>
      )}
      {!result.error && (
        <button
          className={`fav-star-btn ${faved ? 'faved' : ''}`}
          onClick={handleFavToggle}
          aria-label={faved ? `Remove ${domain} from favorites` : `Add ${domain} to favorites`}
          title={faved ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon filled={faved} size={18} />
        </button>
      )}
    </div>
  );

  return (
    <div className={`editorial-result-card glass-obsidian status-${status}`}>
      {/* Editorial Header: Domain name + favoriting/actions */}
      <div className="editorial-card-header">
        <div className="editorial-domain-wrap">
          <span className="editorial-domain" title={domain}>{domain}</span>
        </div>
        {!result.loading && <div className="editorial-header-actions">{actionButtons}</div>}
      </div>

      {/* Editorial Body: Visualizes status and key data in a stacked vertical grid */}
      <div className="editorial-card-body">
        <div className="editorial-status-line">
          <span className={`status-pill active ${
            status === 'available' ? 'free' :
            status === 'expiring-soon' ? 'expiring' :
            status === 'taken' ? 'taken' : 'unavailable'
          }`} style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem' }}>
            {status === 'loading' ? 'Verifying...' : status.replace('-', ' ')}
          </span>
          {!result.loading && checkedLabel && (
            <span className="editorial-timestamp">As of {checkedLabel}</span>
          )}
        </div>

        {!result.loading && !result.error && result.data && (
          <div className="editorial-data-grid">
            {result.data.available ? (
              <div className="editorial-data-item highlight">
                <span className="editorial-data-label">Registration Price</span>
                <span className="editorial-data-value price">
                  {result.data.currency === 'USD' ? '$' : result.data.currency + ' '}
                  {result.data.price || '—'}
                </span>
              </div>
            ) : (
              <>
                <div className="editorial-data-item">
                  <span className="editorial-data-label">Registered To</span>
                  <span className="editorial-data-value" title={result.data.owner || 'Hidden'}>
                    {result.data.owner || 'Privately Held'}
                  </span>
                </div>
                <div className="editorial-data-row">
                  <div className="editorial-data-item">
                    <span className="editorial-data-label">Acquired</span>
                    <span className="editorial-data-value">
                      {result.data.purchasedDate?.split('T')[0] || 'Unknown'}
                    </span>
                  </div>
                  <div className="editorial-data-item">
                    <span className="editorial-data-label">Expires</span>
                    <span className="editorial-data-value">
                      {result.data.expirationDate?.split('T')[0] || 'Unknown'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error Handling */}
        {!result.loading && result.error && (
          <div className="editorial-error-blob">
            <span className="editorial-error-icon">⚠</span>
            <span className="editorial-error-text">
              {typeof result.error === 'string' ? result.error : 'Failed to check domain availability.'}
            </span>
          </div>
        )}

        {/* Expiry Warning Overlay */}
        {status === 'expiring-soon' && (
          <div className="editorial-warning-pill">
            Expiring in {daysUntilExpiry || 'few'} days
          </div>
        )}
      </div>

      {/* Editorial Footer: Restrictions & Secondary Data */}
      <footer className="editorial-card-footer">
        {result.data?.restrictions ? (
          <div className="editorial-restriction-tag">
            <span className="editorial-restriction-label">Requirement:</span>
            <span className="editorial-restriction-value">{result.data.restrictions.countryRestriction}</span>
          </div>
        ) : (
          <div className="editorial-footer-placeholder" />
        )}
      </footer>
    </div>
  );
}

const VerificationResultsSection = forwardRef(function VerificationResultsSection(
  {
    bulkResults,
    isFavorite,
    addFavorite,
    removeFavorite,
    onRefreshDomain,
  },
  ref
) {
  const entries = Object.entries(bulkResults);
  const [filterStatuses, setFilterStatuses] = useState(
    new Set(['available', 'expiring-soon', 'taken', 'unavailable'])
  );
  const [deselectedDomains, setDeselectedDomains] = useState(() => new Set());
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [domainFilterQuery, setDomainFilterQuery] = useState('');
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const allDomainNames = useMemo(() => Object.keys(bulkResults).sort(), [bulkResults]);

  const selectedDomainCount = useMemo(
    () => allDomainNames.filter((d) => !deselectedDomains.has(d)).length,
    [allDomainNames, deselectedDomains]
  );

  const selectAllDomains = useCallback(() => setDeselectedDomains(new Set()), []);
  const clearAllDomains = useCallback(() => setDeselectedDomains(new Set(allDomainNames)), [allDomainNames]);

  useImperativeHandle(
    ref,
    () => ({
      showOnlyAvailable: () => setFilterStatuses(new Set(['available'])),
      resetFilters: () => {
        setFilterStatuses(new Set(['available', 'expiring-soon', 'taken', 'unavailable']));
        setDeselectedDomains(new Set());
        setSortKey('name');
        setSortDir('asc');
        setDomainFilterQuery('');
      },
    }),
    []
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDropdownOpen, closeDropdown]);

  const toggleStatusFilter = (status) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleDomainFilter = (domain) => {
    setDeselectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredDomainNames = useMemo(() => {
    const q = domainFilterQuery.trim().toLowerCase();
    if (!q) return allDomainNames;
    return allDomainNames.filter((d) => d.toLowerCase().includes(q));
  }, [allDomainNames, domainFilterQuery]);

  const filteredAndSortedEntries = useMemo(() => {
    return entries
      .filter(([domain, result]) => {
        const status = getEntryStatus(result);
        if (status !== 'loading' && status !== 'error' && !filterStatuses.has(status)) return false;
        if (deselectedDomains.has(domain)) return false;
        return true;
      })
      .sort(([domA, resA], [domB, resB]) => {
        let valA;
        let valB;

        if (sortKey === 'name') {
          valA = domA;
          valB = domB;
        } else if (sortKey === 'price') {
          valA = parseFloat(resA.data?.price) || Infinity;
          valB = parseFloat(resB.data?.price) || Infinity;
        } else if (sortKey === 'tld') {
          valA = domA.split('.').pop();
          valB = domB.split('.').pop();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [entries, filterStatuses, deselectedDomains, sortKey, sortDir]);

  if (entries.length === 0) return null;

  return (
    <div
      className="verification-results-section"
      style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}
    >
      <ResultsCockpit bulkResults={bulkResults} />

      <h3 className="mb-6" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>
        Verification Results
      </h3>

      <div className="fav-tab-body">
        <aside className="fav-tab-sidebar">
          <div className="fav-sidebar-section">
            <span className="filter-label">Filter by Status</span>
            <div className="status-filter-pills fav-sidebar-pills">
              <button
                type="button"
                className={`status-pill free ${filterStatuses.has('available') ? 'active' : ''}`}
                onClick={() => toggleStatusFilter('available')}
              >
                Free
              </button>
              <button
                type="button"
                className={`status-pill expiring ${filterStatuses.has('expiring-soon') ? 'active' : ''}`}
                onClick={() => toggleStatusFilter('expiring-soon')}
              >
                Expiring Soon
              </button>
              <button
                type="button"
                className={`status-pill taken ${filterStatuses.has('taken') ? 'active' : ''}`}
                onClick={() => toggleStatusFilter('taken')}
              >
                Taken
              </button>
              <button
                type="button"
                className={`status-pill unavailable ${filterStatuses.has('unavailable') ? 'active' : ''}`}
                onClick={() => toggleStatusFilter('unavailable')}
              >
                Unavailable
              </button>
            </div>
          </div>

          <div className="fav-sidebar-section">
            <span className="filter-label" id="domain-multiselect-label">
              Filter by Domain
            </span>
            <div className="domain-multiselect-container" ref={dropdownRef}>
              <button
                ref={triggerRef}
                type="button"
                className="multiselect-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-labelledby="domain-multiselect-label"
              >
                {selectedDomainCount === allDomainNames.length
                  ? 'All Domains Selected'
                  : `${selectedDomainCount} selected`}
                <span aria-hidden>▼</span>
              </button>
              {isDropdownOpen && (
                <div className="multiselect-dropdown" role="listbox" aria-multiselectable="true">
                  <div className="multiselect-actions" role="group" aria-label="Domain selection shortcuts">
                    <button type="button" className="multiselect-action-btn" onClick={selectAllDomains}>
                      Select all
                    </button>
                    <button type="button" className="multiselect-action-btn" onClick={clearAllDomains}>
                      Select none
                    </button>
                  </div>
                  <input
                    type="search"
                    className="multiselect-search"
                    placeholder="Search domains…"
                    value={domainFilterQuery}
                    onChange={(e) => setDomainFilterQuery(e.target.value)}
                    aria-label="Filter domain list"
                    autoFocus
                  />
                  <div className="multiselect-scroll">
                    {filteredDomainNames.map((domain) => (
                      <label key={domain} className="multiselect-item">
                        <input
                          type="checkbox"
                          checked={!deselectedDomains.has(domain)}
                          onChange={() => toggleDomainFilter(domain)}
                        />
                        <span>{domain}</span>
                      </label>
                    ))}
                    {filteredDomainNames.length === 0 && (
                      <p className="multiselect-empty">No matching domains</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="fav-sidebar-section">
            <span className="filter-label">Sort</span>
            <div className="monitor-sort-row">
              <select
                className="monitor-sort"
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(':');
                  setSortKey(k);
                  setSortDir(d);
                }}
                aria-label="Sort results"
              >
                <option value="name:asc">Name (A→Z)</option>
                <option value="name:desc">Name (Z→A)</option>
                <option value="price:asc">Price (low→high)</option>
                <option value="price:desc">Price (high→low)</option>
                <option value="tld:asc">TLD (A→Z)</option>
                <option value="tld:desc">TLD (Z→A)</option>
              </select>
              <span className="monitor-count" aria-label={`${filteredAndSortedEntries.length} shown`}>
                {filteredAndSortedEntries.length} shown
              </span>
            </div>
          </div>
        </aside>

        <ul className="fav-tab-grid" role="list">
          {filteredAndSortedEntries.length > 0 ? (
            filteredAndSortedEntries.map(([domain, result]) => (
              <li key={domain} style={{ display: 'block' }}>
                <VerificationCard
                  domain={domain}
                  result={result}
                  isFavorite={isFavorite}
                  addFavorite={addFavorite}
                  removeFavorite={removeFavorite}
                  onRefreshDomain={onRefreshDomain}
                />
              </li>
            ))
          ) : (
            <li style={{ gridColumn: '1 / -1', listStyle: 'none' }}>
              <p style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                No results match your filters.
              </p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
});

export default VerificationResultsSection;
