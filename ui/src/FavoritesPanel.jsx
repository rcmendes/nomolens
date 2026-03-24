import React from 'react';

/**
 * Always-visible favorites sidebar panel.
 * Shows saved domains with their status badge and a remove button.
 */
export default function FavoritesPanel({ favorites, onRemove }) {
  const isEmpty = favorites.length === 0;

  return (
    <aside className="favorites-panel glass" aria-label="Favorite domains">
      <div className="favorites-panel-header">
        <span className="favorites-panel-title">
          <span className="favorites-star-icon">★</span> Favorites
        </span>
        {favorites.length > 0 && (
          <span className="favorites-count">{favorites.length}</span>
        )}
      </div>

      {isEmpty ? (
        <div className="favorites-empty">
          <span className="favorites-empty-icon">☆</span>
          <p>No favorites yet.</p>
          <p className="favorites-empty-hint">
            Click ★ on any result to save it here.
          </p>
        </div>
      ) : (
        <ul className="favorites-list" role="list">
          {favorites.map((fav) => (
            <li key={fav.domain} className="favorites-item">
              <div className="favorites-item-info">
                <span className="favorites-item-domain">{fav.domain}</span>
                {fav.status && (
                  <span className={`favorites-item-badge fav-status-${fav.status}`}>
                    {statusLabel(fav.status)}
                  </span>
                )}
                {fav.price && fav.status === 'available' && (
                  <span className="favorites-item-price">
                    {fav.currency === 'USD' ? '$' : (fav.currency ?? '') + ' '}
                    {fav.price}
                  </span>
                )}
              </div>
              <button
                className="favorites-remove-btn"
                onClick={() => onRemove(fav.domain)}
                aria-label={`Remove ${fav.domain} from favorites`}
                title="Remove from favorites"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function statusLabel(status) {
  switch (status) {
    case 'available':     return 'Free';
    case 'taken':         return 'Taken';
    case 'expiring-soon': return 'Expiring';
    case 'unavailable':   return 'N/A';
    default:              return status;
  }
}
