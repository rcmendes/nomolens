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
import { BellIcon, RefreshIcon, StarIcon } from './icons';

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
  isMonitored,
  addMonitored,
  removeMonitored,
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

  const monitoring = isMonitored(domain);
  const handleMonitorToggle = (e) => {
    e.stopPropagation();
    if (monitoring) {
      removeMonitored(domain);
    } else {
      addMonitored(domain, {
        status,
        price: result.data?.price,
        currency: result.data?.currency,
        expirationDate: result.data?.expirationDate,
        whoisError: result.data?.whoisError,
      });
    }
  };

  const checkedLabel = formatCheckedAt(result.checkedAt);

  return (
    <div className={`compact-result-card glass status-${status}`}>
      <div className="compact-card-content">
        <div className="compact-left">
          <div className="compact-header-row">
            <span className="compact-domain">{domain}</span>
            <div className="compact-badges">
              {status === 'loading' && <span className="compact-badge checking">Checking…</span>}
              {status === 'error' && <span className="compact-badge error">Error</span>}
              {status === 'available' && <span className="compact-badge available">Available</span>}
              {status === 'taken' && <span className="compact-badge taken">Taken</span>}
              {status === 'unavailable' && <span className="compact-badge unavailable">Unavailable</span>}
              {status === 'expiring-soon' && (
                <>
                  <span className="compact-badge taken">Taken</span>
                  <span className="compact-badge soon">Expiring soon</span>
                </>
              )}
            </div>
            {onRefreshDomain && !result.loading && (
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
          </div>

          {checkedLabel && !result.loading && (
            <p className="compact-checked-at">Checked {checkedLabel}</p>
          )}

          {!result.loading && !result.error && result.data && (
            <div className="compact-body">
              {!result.data.available && (
                <div className="compact-info-grid">
                  <div className="compact-info-col">
                    <span className="compact-label">Owner</span>
                    <span className="compact-value" title={result.data.owner || 'Unknown'}>
                      {result.data.owner || 'Unknown'}
                    </span>
                  </div>
                  <div className="compact-info-col">
                    <span className="compact-label">Purchased</span>
                    <span className="compact-value">
                      {result.data.purchasedDate?.split('T')[0] || '-'}
                    </span>
                  </div>
                  <div className="compact-info-col">
                    <span className="compact-label">Expires</span>
                    <span className="compact-value">
                      {result.data.expirationDate?.split('T')[0] || '-'}
                    </span>
                  </div>
                </div>
              )}

              {result.data.restrictions && (
                <div className="compact-restrictions" title={result.data.restrictions.description}>
                  <span className="compact-label">Restrictions:</span>{' '}
                  {result.data.restrictions.countryRestriction}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="compact-actions">
          {!result.loading && !result.error && (
            <button
              className={`monitor-btn ${monitoring ? 'active' : ''}`}
              onClick={handleMonitorToggle}
              aria-label={monitoring ? `Stop monitoring ${domain}` : `Monitor ${domain}`}
              title={monitoring ? 'Stop monitoring' : 'Monitor domain'}
            >
              <BellIcon off={!monitoring} size={18} />
            </button>
          )}

          {!result.loading && !result.error && (
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

        {!result.loading && !result.error && result.data?.available && result.data.price && (
          <div className="compact-right">
            <div className="compact-price-large">
              {result.data.currency === 'USD' ? '$' : result.data.currency + ' '}
              {result.data.price}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const VerificationResultsSection = forwardRef(function VerificationResultsSection(
  {
    bulkResults,
    isFavorite,
    addFavorite,
    removeFavorite,
    isMonitored,
    addMonitored,
    removeMonitored,
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

      <div className="results-toolbar">
        <div className="filter-group">
          <span className="filter-label">Filter by Status</span>
          <div className="status-filter-pills">
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

        <div className="filter-group">
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

        <div className="sort-group">
          <span className="filter-label">Sort by</span>
          <div className="sort-controls">
            <button
              type="button"
              className={`sort-btn ${sortKey === 'name' ? 'active' : ''}`}
              onClick={() => handleSort('name')}
            >
              Name {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button
              type="button"
              className={`sort-btn ${sortKey === 'price' ? 'active' : ''}`}
              onClick={() => handleSort('price')}
            >
              Price {sortKey === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button
              type="button"
              className={`sort-btn ${sortKey === 'tld' ? 'active' : ''}`}
              onClick={() => handleSort('tld')}
            >
              TLD {sortKey === 'tld' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      <div className="compact-results-list">
        {filteredAndSortedEntries.length > 0 ? (
          filteredAndSortedEntries.map(([domain, result]) => (
            <VerificationCard
              key={domain}
              domain={domain}
              result={result}
              isFavorite={isFavorite}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              isMonitored={isMonitored}
              addMonitored={addMonitored}
              removeMonitored={removeMonitored}
              onRefreshDomain={onRefreshDomain}
            />
          ))
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
            No results match your filters.
          </p>
        )}
      </div>
    </div>
  );
});

export default VerificationResultsSection;
