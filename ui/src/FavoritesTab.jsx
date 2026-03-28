import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import FavoritesPanel from './FavoritesPanel';

export default function FavoritesTab({
  favorites,
  removeFavorite,
  updateFavoriteField,
  onRecheckFavorite,
  recheckingDomain,
}) {
  const { t } = useTranslation();
  return (
    <section className="mode-section mode-section--static mode-section--wide glass">
      <div className="monitor-header">
        <h2 className="mb-1">{t('favorites.title')}</h2>
        <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
          {t('favorites.description')}
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
