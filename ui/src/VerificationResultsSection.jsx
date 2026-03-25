import React, { useState, useMemo, useEffect, useRef } from 'react';

/**
 * Shared helper to derive status from a result object.
 */
function getEntryStatus(result) {
  if (result.loading) return 'loading';
  if (result.error) return 'error';
  if (result.data?.available) return 'available';

  // Check if expiring soon (within 30 days)
  if (result.data?.expirationDate && result.data.expirationDate !== 'Unknown') {
    const expiry = new Date(result.data.expirationDate);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30 && diffDays > 0) return 'expiring-soon';
  }

  if (result.data?.whoisError) return 'unavailable';
  return 'taken';
}

/**
 * Displays a single domain's verification result card.
 */
function VerificationCard({ domain, result, isFavorite, addFavorite, removeFavorite }) {
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
      });
    }
  };

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
          </div>

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

        {/* Favorite star - only for free domains, or if already faved */}
        {!result.loading && !result.error && (status === 'available' || faved) && (
          <button
            className={`fav-star-btn ${faved ? 'faved' : ''}`}
            onClick={handleFavToggle}
            aria-label={faved ? `Remove ${domain} from favorites` : `Add ${domain} to favorites`}
            title={faved ? 'Remove from favorites' : 'Add to favorites'}
          >
            {faved ? '★' : '☆'}
          </button>
        )}

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

/**
 * The full verification results section rendered below the tree.
 */
export default function VerificationResultsSection({ bulkResults, isFavorite, addFavorite, removeFavorite }) {
  const entries = Object.entries(bulkResults);
  const [filterStatuses, setFilterStatuses] = useState(new Set(['available', 'expiring-soon', 'taken', 'unavailable']));
  const [filterDomains, setFilterDomains] = useState(new Set());
  const [sortKey, setSortKey] = useState('name'); // 'name', 'price', 'tld'
  const [sortDir, setSortDir] = useState('asc');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Initialize domain filters when results change
  const allDomainNames = useMemo(() => Object.keys(bulkResults).sort(), [bulkResults]);
  
  useEffect(() => {
    // If we have new domains, add them to the filter set by default
    setFilterDomains(prev => {
      const next = new Set(prev);
      allDomainNames.forEach(d => next.add(d));
      return next;
    });
  }, [allDomainNames]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStatusFilter = (status) => {
    setFilterStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleDomainFilter = (domain) => {
    setFilterDomains(prev => {
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

  const filteredAndSortedEntries = useMemo(() => {
    return entries
      .filter(([domain, result]) => {
        const status = getEntryStatus(result);
        // Status filtering (ignore loading/error for status filter)
        if (status !== 'loading' && status !== 'error' && !filterStatuses.has(status)) return false;
        // Domain name filtering
        if (filterDomains.size > 0 && !filterDomains.has(domain)) return false;
        return true;
      })
      .sort(([domA, resA], [domB, resB]) => {
        let valA, valB;

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
  }, [entries, filterStatuses, filterDomains, sortKey, sortDir]);

  if (entries.length === 0) return null;

  return (
    <div
      className="verification-results-section"
      style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}
    >
      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--text-main)' }}>
        Verification Results
      </h3>

      <div className="results-toolbar">
        <div className="filter-group">
          <span className="filter-label">Filter by Status</span>
          <div className="status-filter-pills">
            <button 
              className={`status-pill free ${filterStatuses.has('available') ? 'active' : ''}`}
              onClick={() => toggleStatusFilter('available')}
            >
              Free
            </button>
            <button 
              className={`status-pill expiring ${filterStatuses.has('expiring-soon') ? 'active' : ''}`}
              onClick={() => toggleStatusFilter('expiring-soon')}
            >
              Expiring Soon
            </button>
            <button 
              className={`status-pill taken ${filterStatuses.has('taken') ? 'active' : ''}`}
              onClick={() => toggleStatusFilter('taken')}
            >
              Taken
            </button>
            <button 
              className={`status-pill unavailable ${filterStatuses.has('unavailable') ? 'active' : ''}`}
              onClick={() => toggleStatusFilter('unavailable')}
            >
              Unavailable
            </button>
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">Filter by Domain</span>
          <div className="domain-multiselect-container" ref={dropdownRef}>
            <button 
              className="multiselect-trigger" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {filterDomains.size === allDomainNames.length 
                ? 'All Domains Selected' 
                : `${filterDomains.size} selected`}
              <span>▼</span>
            </button>
            {isDropdownOpen && (
              <div className="multiselect-dropdown">
                {allDomainNames.map(domain => (
                  <label key={domain} className="multiselect-item">
                    <input 
                      type="checkbox" 
                      checked={filterDomains.has(domain)}
                      onChange={() => toggleDomainFilter(domain)}
                    />
                    <span>{domain}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sort-group">
          <span className="filter-label">Sort by</span>
          <div className="sort-controls">
            <button 
              className={`sort-btn ${sortKey === 'name' ? 'active' : ''}`}
              onClick={() => handleSort('name')}
            >
              Name {sortKey === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={`sort-btn ${sortKey === 'price' ? 'active' : ''}`}
              onClick={() => handleSort('price')}
            >
              Price {sortKey === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
            </button>
            <button 
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
            />
          ))
        ) : (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No results match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
