import React, { useCallback, useMemo, useState } from 'react';
import { RefreshIcon, BellIcon, StarIcon } from './icons';
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
    case 'available':
      return 'Free';
    case 'taken':
      return 'Taken';
    case 'expiring-soon':
      return 'Expiring';
    case 'unavailable':
      return 'N/A';
    default:
      return status;
  }
}

function exportJson(monitored) {
  const blob = new Blob([JSON.stringify(monitored, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'domain-horizon-monitored.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv(monitored) {
  const headers = ['domain', 'status', 'price', 'currency', 'notes', 'tags', 'checkedAt'];
  const rows = monitored.map((m) =>
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
  a.download = 'domain-horizon-monitored.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function MonitoredPanel({
  monitored,
  onRemove,
  onRecheck,
  onUpdateMonitored,
  recheckingDomain,
  addFavorite,
  removeFavorite,
  isFavorite,
}) {
  const isEmpty = monitored.length === 0;
  const toast = useToast();

  const handleExportJson = useCallback(() => {
    exportJson(monitored);
    toast.show('Exported monitor list as JSON', { kind: 'success' });
  }, [monitored, toast]);

  const handleExportCsv = useCallback(() => {
    exportCsv(monitored);
    toast.show('Exported monitor list as CSV', { kind: 'success' });
  }, [monitored, toast]);

  const [filterStatuses, setFilterStatuses] = useState(
    new Set(['available', 'expiring-soon', 'taken', 'unavailable'])
  );
  const [domainQuery, setDomainQuery] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const toggleStatusFilter = (status) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const filteredAndSortedMonitored = useMemo(() => {
    const q = domainQuery.trim().toLowerCase();
    const withDerivedStatus = monitored.map((row) => ({
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
  }, [monitored, filterStatuses, domainQuery, sortKey, sortDir]);

  return (
    <div className="favorites-panel monitored-panel--tab" aria-label="Monitored domains">
      <div className="favorites-panel-header">
        <span className="favorites-panel-title">
          <span className="monitored-bell-icon" aria-hidden>
            <BellIcon size={16} />
          </span>
          Monitor list
        </span>
        {monitored.length > 0 && (
          <span className="favorites-count">{monitored.length}</span>
        )}
      </div>

      {!isEmpty && (
        <div className="favorites-export-row">
          <button type="button" className="favorites-export-btn" onClick={handleExportJson}>
            Export JSON
          </button>
          <button type="button" className="favorites-export-btn" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>
      )}

      {isEmpty ? (
        <div className="favorites-empty">
          <span className="favorites-empty-icon monitored-empty-icon" aria-hidden>
            <BellIcon size={22} off />
          </span>
          <p>No domains on your monitor list yet.</p>
          <p className="favorites-empty-hint">
            Monitor any result to track it here (taken or available).
          </p>
        </div>
      ) : (
        <>
          <div className="results-toolbar monitor-toolbar">
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
              <span className="filter-label">Search</span>
              <input
                className="monitor-search"
                type="search"
                placeholder="Filter domains…"
                value={domainQuery}
                onChange={(e) => setDomainQuery(e.target.value)}
                aria-label="Filter monitored domains"
              />
            </div>

            <div className="filter-group">
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
                  aria-label="Sort monitored domains"
                >
                  <option value="name:asc">Name (A→Z)</option>
                  <option value="name:desc">Name (Z→A)</option>
                  <option value="price:asc">Price (low→high)</option>
                  <option value="price:desc">Price (high→low)</option>
                  <option value="tld:asc">TLD (A→Z)</option>
                  <option value="tld:desc">TLD (Z→A)</option>
                </select>
                <span className="monitor-count" aria-label={`${filteredAndSortedMonitored.length} shown`}>
                  {filteredAndSortedMonitored.length} shown
                </span>
              </div>
            </div>
          </div>

          <ul className="favorites-list" role="list">
          {filteredAndSortedMonitored.map((row) => (
            <li key={row.domain} className="favorites-item favorites-item--rich">
              <div className="favorites-item-main">
                <div className="fav-card-header">
                  <h4 className="fav-card-domain" title={row.domain}>
                    {row.domain}
                  </h4>
                  <button
                    className="favorites-remove-btn fav-card-remove-btn"
                    onClick={() => onRemove(row.domain)}
                    aria-label={`Remove ${row.domain} from monitor list`}
                    title="Remove from monitor list"
                  >
                    ✕
                  </button>
                </div>

                <div className="fav-card-meta">
                  <div className="fav-card-info-row">
                    {row.status && (
                      <span className={`favorites-item-badge fav-status-${row.status}`}>
                        {statusLabel(row.status)}
                      </span>
                    )}
                    {row.price != null && row.status === 'available' && (
                      <span className="favorites-item-price">
                        {row.currency === 'USD' ? '$' : `${row.currency ?? ''} `}
                        {row.price}
                      </span>
                    )}
                  </div>

                  {(() => {
                    const hasExpiry = row.status !== 'available' && row.expirationDate && row.expirationDate !== 'Unknown';
                    const hasChecked = !!row.checkedAt;
                    if (!hasExpiry && !hasChecked) return null;
                    return (
                      <p className="fav-card-dates">
                        {hasExpiry && <span>Expires {fmtDate(row.expirationDate)}</span>}
                        {hasExpiry && hasChecked && <span className="fav-card-dates-sep" aria-hidden>·</span>}
                        {hasChecked && <span>Checked {fmtDate(row.checkedAt)}</span>}
                      </p>
                    );
                  })()}
                </div>

                <div className="fav-card-actions" role="group" aria-label={`Actions for ${row.domain}`}>
                  <button
                    type="button"
                    className="fav-card-action-btn active"
                    onClick={() => onRemove(row.domain)}
                    aria-label={`Remove ${row.domain} from monitor list`}
                    title="Remove from monitor list"
                  >
                    <BellIcon off={false} size={18} />
                    <span className="fav-card-action-label">Monitored</span>
                  </button>
                  {(() => {
                    const faved = isFavorite?.(row.domain);
                    return (
                      <button
                        type="button"
                        className={`fav-card-action-btn ${faved ? 'active' : ''}`}
                        onClick={() => (faved ? removeFavorite?.(row.domain) : addFavorite?.(row.domain, row))}
                        disabled={false}
                        aria-label={
                          faved ? `Remove ${row.domain} from favorites` : `Add ${row.domain} to favorites`
                        }
                        title={faved ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <StarIcon filled={!!faved} size={18} />
                        <span className="fav-card-action-label">{faved ? 'Favorited' : 'Favorite'}</span>
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    className="fav-card-action-btn"
                    onClick={() => onRecheck?.(row.domain)}
                    disabled={recheckingDomain === row.domain}
                    aria-label={`Refresh check for ${row.domain}`}
                    title="Refresh this check"
                  >
                    {recheckingDomain === row.domain ? (
                      <span className="fav-card-action-label">Refreshing…</span>
                    ) : (
                      <>
                        <RefreshIcon size={16} />
                        <span className="fav-card-action-label">Refresh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <label className="favorites-field-label">
                <span className="sr-only">Notes for {row.domain}</span>
                <textarea
                  className="favorites-notes"
                  rows={2}
                  placeholder="Notes…"
                  value={row.notes ?? ''}
                  onChange={(e) => onUpdateMonitored?.(row.domain, { notes: e.target.value })}
                  aria-label={`Notes for ${row.domain}`}
                />
              </label>
              <label className="favorites-field-label favorites-tags-label">
                <span>Tags</span>
                <input
                  type="text"
                  className="favorites-tags-input"
                  placeholder="e.g. watch, client-a"
                  value={row.tags ?? ''}
                  onChange={(e) => onUpdateMonitored?.(row.domain, { tags: e.target.value })}
                  aria-label={`Tags for ${row.domain}`}
                />
              </label>
            </li>
          ))}
          </ul>
        </>
      )}
    </div>
  );
}
