import React, { useCallback, useMemo, useState } from 'react';
import { RefreshIcon, StarIcon } from './icons';
import { useToast } from './useToast';

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return null; }
}

function statusLabel(status) {
  switch (status) {
    case 'available':    return 'Free';
    case 'taken':        return 'Taken';
    case 'expiring-soon': return 'Expiring';
    case 'unavailable':  return 'N/A';
    default:             return status;
  }
}

function exportJson(favorites) {
  const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nomolens-favorites.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv(favorites) {
  const headers = ['domain', 'status', 'price', 'currency', 'notes', 'tags', 'checkedAt'];
  const rows = favorites.map((m) =>
    headers.map((h) => {
      const v = m[h] ?? '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nomolens-favorites.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function FavoritesPanel({
  favorites,
  onRemove,
  onRecheck,
  onUpdateFavorite,
  recheckingDomain,
}) {
  const isEmpty = favorites.length === 0;
  const toast = useToast();

  const handleExportJson = useCallback(() => {
    exportJson(favorites);
    toast.show('Exported favorites as JSON', { kind: 'success' });
  }, [favorites, toast]);

  const handleExportCsv = useCallback(() => {
    exportCsv(favorites);
    toast.show('Exported favorites as CSV', { kind: 'success' });
  }, [favorites, toast]);

  const [filterStatuses, setFilterStatuses] = useState(
    new Set(['available', 'expiring-soon', 'taken', 'unavailable'])
  );
  const [domainQuery, setDomainQuery] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedDomains, setExpandedDomains] = useState(new Set());

  const toggleExpanded = (domain) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const toggleStatusFilter = (status) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const filteredAndSortedFavorites = useMemo(() => {
    const q = domainQuery.trim().toLowerCase();
    const withDerivedStatus = favorites.map((row) => ({
      row,
      derivedStatus: row.status || 'taken',
    }));

    return withDerivedStatus
      .filter(({ row, derivedStatus }) => {
        if (!filterStatuses.has(derivedStatus)) return false;
        if (q && !row.domain.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(({ row: a }, { row: b }) => {
        let valA;
        let valB;

        if (sortKey === 'name') {
          valA = a.domain;
          valB = b.domain;
        } else if (sortKey === 'price') {
          valA = parseFloat(a.price) || Infinity;
          valB = parseFloat(b.price) || Infinity;
        } else if (sortKey === 'tld') {
          valA = a.domain.split('.').pop();
          valB = b.domain.split('.').pop();
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
      .map(({ row }) => row);
  }, [favorites, filterStatuses, domainQuery, sortKey, sortDir]);

  return (
    <div className="favorites-panel favorites-panel--tab" aria-label="Favorites">

      {/* ── Header bar ── */}
      <div className="fav-tab-topbar">
        <div className="fav-tab-title-row">
          <span className="favorites-panel-title">
            <span className="favorites-star-icon" aria-hidden>
              <StarIcon filled size={16} />
            </span>
            Favorites
          </span>
          {favorites.length > 0 && (
            <span className="favorites-count">{favorites.length}</span>
          )}
        </div>

        {!isEmpty && (
          <div className="fav-tab-topbar-actions">
            <button type="button" className="favorites-export-btn" onClick={handleExportJson}>
              Export JSON
            </button>
            <button type="button" className="favorites-export-btn" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="favorites-empty">
          <span className="favorites-empty-icon" aria-hidden>
            <StarIcon size={22} filled={false} />
          </span>
          <p>No favorites yet.</p>
          <p className="favorites-empty-hint">
            Star any result to save it here.
          </p>
        </div>
      ) : (
        <div className="fav-tab-body">

          {/* ── Left: Filters sidebar ── */}
          <aside className="fav-tab-sidebar">
            <div className="fav-sidebar-section">
              <span className="filter-label">Filter by Status</span>
              <div className="status-filter-pills fav-sidebar-pills">
                {[
                  { key: 'available',    label: 'Free',        cls: 'free' },
                  { key: 'expiring-soon', label: 'Expiring Soon', cls: 'expiring' },
                  { key: 'taken',        label: 'Taken',       cls: 'taken' },
                  { key: 'unavailable',  label: 'Unavailable', cls: 'unavailable' },
                ].map(({ key, label, cls }) => (
                  <button
                    key={key}
                    type="button"
                    className={`status-pill ${cls} ${filterStatuses.has(key) ? 'active' : ''}`}
                    onClick={() => toggleStatusFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fav-sidebar-section">
              <span className="filter-label">Search</span>
              <input
                className="monitor-search"
                type="search"
                placeholder="Filter domains…"
                value={domainQuery}
                onChange={(e) => setDomainQuery(e.target.value)}
                aria-label="Filter favorites"
              />
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
                  aria-label="Sort favorites"
                >
                  <option value="name:asc">Name (A→Z)</option>
                  <option value="name:desc">Name (Z→A)</option>
                  <option value="price:asc">Price (low→high)</option>
                  <option value="price:desc">Price (high→low)</option>
                  <option value="tld:asc">TLD (A→Z)</option>
                  <option value="tld:desc">TLD (Z→A)</option>
                </select>
                <span className="monitor-count" aria-label={`${filteredAndSortedFavorites.length} shown`}>
                  {filteredAndSortedFavorites.length} shown
                </span>
              </div>
            </div>
          </aside>

          {/* ── Right: Cards grid ── */}
          <ul className="fav-tab-grid" role="list">
            {filteredAndSortedFavorites.map((row) => {
              const isExpanded = expandedDomains.has(row.domain);
              const hasExpiry = row.status !== 'available' && row.expirationDate && row.expirationDate !== 'Unknown';
              const hasChecked = !!row.checkedAt;
              const isAvailable = row.status === 'available';

              return (
                <li key={row.domain} className="glass-obsidian editorial-result-card">
                  {/* Card Header */}
                  <div className="editorial-card-header">
                    <div className="editorial-domain-wrap">
                      <h4 className="editorial-domain" title={row.domain}>{row.domain}</h4>
                    </div>
                    <div className="editorial-header-actions">
                      <div className="compact-card-btn-row">
                        <button
                          type="button"
                          className="compact-refresh-btn"
                          onClick={() => onRecheck?.(row.domain)}
                          disabled={recheckingDomain === row.domain}
                          aria-label={`Refresh check for ${row.domain}`}
                          title={recheckingDomain === row.domain ? 'Updating…' : 'Refresh domain check'}
                          style={recheckingDomain === row.domain ? { opacity: 0.5, cursor: 'wait' } : {}}
                        >
                          <RefreshIcon size={15} />
                        </button>

                        <button
                          type="button"
                          className="favorites-remove-btn"
                          style={{ marginLeft: '4px' }}
                          onClick={() => onRemove(row.domain)}
                          aria-label={`Remove ${row.domain} from favorites`}
                          title="Remove from favorites"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="editorial-card-body">
                    <div className="editorial-status-line">
                      <span className={`status-pill active ${
                        row.status === 'available' ? 'free' :
                        row.status === 'expiring-soon' ? 'expiring' :
                        row.status === 'taken' ? 'taken' : 'unavailable'
                      }`} style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem' }}>
                        {statusLabel(row.status)}
                      </span>
                      {hasChecked && (
                        <span className="editorial-timestamp">
                          Checked {fmtDate(row.checkedAt)}
                        </span>
                      )}
                    </div>

                    <div className="editorial-data-grid">
                      {isAvailable && row.price != null && (
                        <div className="editorial-data-item highlight">
                          <span className="editorial-data-label">Price Estimate</span>
                          <span className="editorial-data-value price">
                            {row.currency === 'USD' ? '$' : `${row.currency ?? ''} `}
                            {row.price}
                          </span>
                        </div>
                      )}

                      <div className="editorial-data-row">
                        {hasExpiry && (
                          <div className="editorial-data-item">
                            <span className="editorial-data-label">Expires</span>
                            <span className="editorial-data-value">{fmtDate(row.expirationDate)}</span>
                          </div>
                        )}
                        {row.tags && (
                          <div className="editorial-data-item">
                            <span className="editorial-data-label">Tags</span>
                            <span className="editorial-data-value">{row.tags}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card footer: notes & tags toggle */}
                    <div className="fav-card-actions fav-card-edit-footer">
                      <button
                        type="button"
                        className={`fav-notes-toggle-btn${isExpanded ? ' active' : ''}`}
                        onClick={() => toggleExpanded(row.domain)}
                        aria-expanded={isExpanded}
                        style={{ width: '100%' }}
                      >
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                        </svg>
                        {isExpanded ? 'Close' : 'Notes & Tags'}
                      </button>
                    </div>

                    {/* Collapsible notes & tags editor */}
                    {isExpanded && (
                      <div className="fav-notes-editor">
                        <div className="fav-notes-field">
                          <label className="fav-notes-label" htmlFor={`notes-${row.domain}`}>
                            Notes
                          </label>
                          <textarea
                            id={`notes-${row.domain}`}
                            className="fav-notes-textarea"
                            placeholder="Add notes…"
                            value={row.notes ?? ''}
                            onChange={(e) => onUpdateFavorite?.(row.domain, { notes: e.target.value })}
                          />
                        </div>
                        <div className="fav-notes-field">
                          <label className="fav-notes-label" htmlFor={`tags-${row.domain}`}>
                            Tags
                            <span className="fav-notes-hint">comma-separated</span>
                          </label>
                          <input
                            id={`tags-${row.domain}`}
                            type="text"
                            className="fav-tags-input"
                            placeholder="e.g. watch, client-a, priority"
                            value={row.tags ?? ''}
                            onChange={(e) => onUpdateFavorite?.(row.domain, { tags: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
