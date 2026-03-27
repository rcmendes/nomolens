import { useState, useEffect, useCallback } from 'react';
import { normalizeFavoriteRow, getEntryStatus } from '../domainResultUtils';
import { saveToCache } from '../utils/domainCache';

const FAVORITES_STORAGE_KEY = 'nomoLens_monitored'; // Keep historical key for data preservation
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(normalizeFavoriteRow) : [];
    } catch {
      return [];
    }
  });

  const [recheckingDomain, setRecheckingDomain] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to persist favorites list', e);
    }
  }, [favorites]);

  const addFavorite = useCallback((domain, resultData) => {
    setFavorites((prev) => {
      if (prev.some((m) => m.domain === domain)) return prev;
      return [
        normalizeFavoriteRow({
          domain,
          notes: '',
          tags: '',
          addedAt: new Date().toISOString(),
          checkedAt: new Date().toISOString(),
          ...resultData,
        }),
        ...prev,
      ];
    });
  }, []);

  const removeFavorite = useCallback((domain) => {
    setFavorites((prev) => prev.filter((m) => m.domain !== domain));
  }, []);

  const updateFavoriteField = useCallback((domain, patch) => {
    setFavorites((prev) => prev.map((m) => (m.domain === domain ? { ...m, ...patch } : m)));
  }, []);

  const isFavorite = useCallback(
    (domain) => favorites.some((m) => m.domain === domain),
    [favorites]
  );

  const refreshFavorite = useCallback(
    async (domain) => {
      setRecheckingDomain(domain);
      try {
        const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(domain)}`);
        const data = await res.json();
        const apiError = !res.ok ? data.error || 'Error' : null;
        const synthetic = { loading: false, data, error: apiError };
        const status = getEntryStatus(synthetic);
        
        if (!apiError && !data.available) {
            saveToCache(domain, data);
        }

        setFavorites((prev) =>
          prev.map((m) =>
            m.domain === domain
              ? normalizeFavoriteRow({
                  ...m,
                  status,
                  price: data?.price,
                  currency: data?.currency,
                  checkedAt: new Date().toISOString(),
                  expirationDate: data?.expirationDate ?? null,
                  whoisError: data?.whoisError ?? null,
                })
              : m
          )
        );
      } catch (e) {
        console.warn('Re-check failed', e);
      } finally {
        setRecheckingDomain(null);
      }
    },
    []
  );

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavoriteField,
    isFavorite,
    refreshFavorite,
    recheckingDomain,
  };
};
