import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TldContext = createContext();

const TLD_STORAGE_KEY = 'nomoLens_selectedTLDs';
const CUSTOM_TLDS_STORAGE_KEY = 'nomoLens_customTLDs';

export const TldProvider = ({ children }) => {
  const [selectedTLDs, setSelectedTLDs] = useState(() => {
    try {
      const saved = localStorage.getItem(TLD_STORAGE_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        return new Set(list);
      }
    } catch (e) {
      console.warn('Failed to hydrate TLDs', e);
    }
    return new Set(['.com']); // Default
  });

  const [customTLDs, setCustomTLDs] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TLDS_STORAGE_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        return new Set(list);
      }
    } catch (e) {
      console.warn('Failed to hydrate custom TLD list', e);
    }
    return new Set();
  });

  const [customTLD, setCustomTLD] = useState('');
  const [customTLDError, setCustomTLDError] = useState('');

  // Persist TLDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TLD_STORAGE_KEY, JSON.stringify(Array.from(selectedTLDs)));
    } catch (e) {
      console.warn('Failed to persist TLDs', e);
    }
  }, [selectedTLDs]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_TLDS_STORAGE_KEY, JSON.stringify(Array.from(customTLDs)));
    } catch (e) {
      console.warn('Failed to persist custom TLD list', e);
    }
  }, [customTLDs]);

  const toggleTLD = useCallback((tld) => {
    setSelectedTLDs((prev) => {
      const next = new Set(prev);
      if (next.has(tld)) {
        next.delete(tld);
      } else {
        next.add(tld);
      }
      return next;
    });
  }, []);

  const handleAddCustomTLD = useCallback((e) => {
    e?.preventDefault?.();
    const raw = customTLD.trim();
    if (!raw) return;

    let tld = `.${raw.toLowerCase().replace(/^\.+/, '')}`;
    const tldRegex = /^\.[a-z]{2,}(\.[a-z]{2,})*$/;
    if (!tldRegex.test(tld)) {
      setCustomTLDError(
        'Invalid TLD. Must be 2+ letters (e.g. .xyz) or multi-part (e.g. .co.uk). Numbers and special characters are not allowed.'
      );
      return;
    }
    setCustomTLDError('');
    setCustomTLDs((prev) => new Set([...prev, tld]));
    setSelectedTLDs((prev) => new Set([...prev, tld]));
    setCustomTLD('');
  }, [customTLD]);

  const removeCustomTLD = useCallback((tld) => {
    setCustomTLDs((prev) => {
      const next = new Set(prev);
      next.delete(tld);
      return next;
    });
    setSelectedTLDs((prev) => {
      const next = new Set(prev);
      next.delete(tld);
      return next;
    });
  }, []);

  const value = {
    selectedTLDs,
    setSelectedTLDs,
    toggleTLD,
    customTLDs,
    removeCustomTLD,
    customTLD,
    setCustomTLD,
    customTLDError,
    setCustomTLDError,
    handleAddCustomTLD,
  };

  return <TldContext.Provider value={value}>{children}</TldContext.Provider>;
};

export const useTld = () => {
  const context = useContext(TldContext);
  if (!context) {
    throw new Error('useTld must be used within a TldProvider');
  }
  return context;
};
