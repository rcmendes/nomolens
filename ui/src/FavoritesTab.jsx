import React from 'react';
import FavoritesPanel from './FavoritesPanel';

export default function FavoritesTab({
  favorites,
  removeFavorite,
  updateFavoriteField,
  onRecheckFavorite,
  recheckingDomain,
}) {
  return (
    <section className="mode-section mode-section--static mode-section--wide glass">
      <div className="monitor-header">
        <h2 className="mb-1">Favorites</h2>
        <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
          Keep track of domains you care about, even if they are currently taken. Re-check anytime
          for status updates.
        </p>
      </div>

      <FavoritesPanel
        favorites={favorites}
        onRemove={removeFavorite}
        onRecheck={onRecheckFavorite}
        onUpdateFavorite={updateFavoriteField}
        recheckingDomain={recheckingDomain}
      />
    </section>
  );
}
