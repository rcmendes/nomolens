import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';

export default function CommandPalette({
  open,
  onClose,
  setActiveTab,
  focusSearchInput,
  focusGenPrompt,
  onVerifySelected,
  canVerifySelected,
  onShowOnlyAvailable,
  onResetFilters,
  onCopyAvailable,
  hasAvailableToCopy,
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const actions = useMemo(() => {
    const list = [
      { id: 'tab-search', label: 'Go to Direct Search', keywords: 'search check', run: () => setActiveTab('search') },
      { id: 'tab-gen', label: 'Go to Generate with AI', keywords: 'ai brainstorm', run: () => setActiveTab('generate') },
      { id: 'tab-monitor', label: 'Go to Monitor List', keywords: 'watchlist monitor bell tracking', run: () => setActiveTab('monitor') },
      { id: 'focus-search', label: 'Focus domain search field', keywords: 'input', run: () => focusSearchInput?.() },
      { id: 'focus-prompt', label: 'Focus AI prompt', keywords: 'generate', run: () => focusGenPrompt?.() },
    ];
    if (canVerifySelected) {
      list.push({
        id: 'verify',
        label: 'Verify selected domains',
        keywords: 'check whois',
        run: () => onVerifySelected?.(),
      });
    }
    list.push(
      {
        id: 'filter-available',
        label: 'Show only available domains',
        keywords: 'free filter',
        run: () => onShowOnlyAvailable?.(),
      },
      {
        id: 'reset-filters',
        label: 'Reset result filters',
        keywords: 'clear all',
        run: () => onResetFilters?.(),
      }
    );
    if (hasAvailableToCopy) {
      list.push({
        id: 'copy-available',
        label: 'Copy all available domains',
        keywords: 'clipboard',
        run: () => onCopyAvailable?.(),
      });
    }
    return list;
  }, [
    setActiveTab,
    focusSearchInput,
    focusGenPrompt,
    onVerifySelected,
    canVerifySelected,
    onShowOnlyAvailable,
    onResetFilters,
    onCopyAvailable,
    hasAvailableToCopy,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.keywords && a.keywords.toLowerCase().includes(q))
    );
  }, [actions, query]);

  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const runHighlighted = useCallback(() => {
    const item = filtered[highlight];
    if (item) {
      item.run();
      onClose();
    }
  }, [filtered, highlight, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        runHighlighted();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered.length, runHighlighted, onClose]);

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="command-palette glass"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="search"
          className="command-palette-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-autocomplete="list"
          aria-controls="command-palette-list"
        />
        <ul id="command-palette-list" className="command-palette-list" role="listbox">
          {filtered.length === 0 ? (
            <li className="command-palette-empty">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={`command-palette-item ${i === highlight ? 'highlight' : ''}`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="command-palette-hint">
          <kbd>↑</kbd> <kbd>↓</kbd> navigate · <kbd>Enter</kbd> run · <kbd>Esc</kbd> close
        </p>
      </div>
    </div>
  );
}
