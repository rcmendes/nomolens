import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TldContext = createContext();

const TLD_STORAGE_KEY = 'nomoLens_selectedTLDs';

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
    setSelectedTLDs((prev) => new Set([...prev, tld]));
    setCustomTLD('');
  }, [customTLD]);

  const value = {
    selectedTLDs,
    setSelectedTLDs,
    toggleTLD,
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
