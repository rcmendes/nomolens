import React, { useCallback } from 'react';
import { BellIcon, StarIcon } from './icons';
import { useToast } from './useToast';

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

function exportJson(favorites) {
  const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'domain-horizon-favorites.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv(favorites) {
  const headers = ['domain', 'status', 'price', 'currency', 'notes', 'tags', 'checkedAt'];
  const rows = favorites.map((f) =>
    headers.map((h) => {
      const v = f[h] ?? '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'domain-horizon-favorites.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function FavoritesPanel({
  favorites,
  onRemove,
  onRecheck,
  onUpdateFavorite,
  recheckingDomain,
  addMonitored,
  isMonitored,
}) {
  const toast = useToast();
  const isEmpty = favorites.length === 0;

  const handleExportJson = useCallback(() => {
    exportJson(favorites);
    toast.show('Exported favorites as JSON', { kind: 'success' });
  }, [favorites, toast]);

  const handleExportCsv = useCallback(() => {
    exportCsv(favorites);
    toast.show('Exported favorites as CSV', { kind: 'success' });
  }, [favorites, toast]);

  return (
    <aside className="favorites-panel glass" aria-label="Favorite domains">
      <div className="favorites-panel-header">
        <span className="favorites-panel-title">
          <span className="favorites-star-icon" aria-hidden>
            <StarIcon size={16} />
          </span>
          Favorites
        </span>
        {favorites.length > 0 && (
          <span className="favorites-count">{favorites.length}</span>
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
          <span className="favorites-empty-icon" aria-hidden>
            <StarIcon size={22} filled={false} />
          </span>
          <p>No favorites yet.</p>
          <p className="favorites-empty-hint">Star any result to save it here.</p>
        </div>
      ) : (
        <ul className="favorites-list" role="list">
          {favorites.map((fav) => (
            <li key={fav.domain} className="favorites-item favorites-item--rich">
              <div className="favorites-item-main">
                <div className="favorites-item-info">
                  <span className="favorites-item-domain" title={fav.domain}>
                    {fav.domain}
                  </span>
                  <div className="favorites-item-meta">
                    {fav.status && (
                      <span className={`favorites-item-badge fav-status-${fav.status}`}>
                        {statusLabel(fav.status)}
                      </span>
                    )}
                    {fav.price != null && fav.status === 'available' && (
                      <span className="favorites-item-price">
                        {fav.currency === 'USD' ? '$' : `${fav.currency ?? ''} `}
                        {fav.price}
                      </span>
                    )}
                  </div>
                  {fav.checkedAt && (
                    <span className="favorites-checked-at">
                      Checked {new Date(fav.checkedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="favorites-item-actions">
                  <button
                    type="button"
                    className={`favorites-cross-btn ${isMonitored?.(fav.domain) ? 'active' : ''}`}
                    onClick={() => addMonitored?.(fav.domain, fav)}
                    disabled={!addMonitored || !isMonitored || isMonitored(fav.domain)}
                    aria-label={
                      isMonitored?.(fav.domain)
                        ? `${fav.domain} is already on your monitor list`
                        : `Add ${fav.domain} to monitor list`
                    }
                    title={isMonitored?.(fav.domain) ? 'Already on monitor list' : 'Add to monitor list'}
                  >
                    <BellIcon off={isMonitored?.(fav.domain)} size={18} />
                  </button>
                  <button
                    type="button"
                    className="favorites-recheck-btn"
                    onClick={() => onRecheck?.(fav.domain)}
                    disabled={recheckingDomain === fav.domain}
                    aria-label={`Re-check ${fav.domain}`}
                  >
                    {recheckingDomain === fav.domain ? '…' : 'Re-check'}
                  </button>
                  <button
                    className="favorites-remove-btn"
                    onClick={() => onRemove(fav.domain)}
                    aria-label={`Remove ${fav.domain} from favorites`}
                    title="Remove from favorites"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <label className="favorites-field-label">
                <span className="sr-only">Notes for {fav.domain}</span>
                <textarea
                  className="favorites-notes"
                  rows={2}
                  placeholder="Notes…"
                  value={fav.notes ?? ''}
                  onChange={(e) => onUpdateFavorite?.(fav.domain, { notes: e.target.value })}
                  aria-label={`Notes for ${fav.domain}`}
                />
              </label>
              <label className="favorites-field-label favorites-tags-label">
                <span>Tags</span>
                <input
                  type="text"
                  className="favorites-tags-input"
                  placeholder="e.g. shortlist, client-a"
                  value={fav.tags ?? ''}
                  onChange={(e) => onUpdateFavorite?.(fav.domain, { tags: e.target.value })}
                  aria-label={`Tags for ${fav.domain}`}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
