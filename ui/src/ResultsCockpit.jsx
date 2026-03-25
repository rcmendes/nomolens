import React, { useCallback, useMemo } from 'react';
import { summarizeBulkResults, registrarSearchUrl, getEntryStatus } from './domainResultUtils';

export default function ResultsCockpit({ bulkResults }) {
  const { counts, bestPick } = useMemo(() => summarizeBulkResults(bulkResults), [bulkResults]);

  const availableDomains = useMemo(() => {
    return Object.entries(bulkResults)
      .filter(([, r]) => getEntryStatus(r) === 'available')
      .map(([d]) => d)
      .sort();
  }, [bulkResults]);

  const copyAvailable = useCallback(async () => {
    if (availableDomains.length === 0) return;
    try {
      await navigator.clipboard.writeText(availableDomains.join('\n'));
    } catch {
      // ignore
    }
  }, [availableDomains]);

  const openBestRegistrar = useCallback(() => {
    const d = bestPick?.domain ?? availableDomains[0];
    if (d) window.open(registrarSearchUrl(d), '_blank', 'noopener,noreferrer');
  }, [bestPick, availableDomains]);

  const total = Object.keys(bulkResults).length;
  if (total === 0) return null;

  return (
    <div className="results-cockpit glass" aria-label="Results summary">
      <div className="cockpit-stats">
        <span className="cockpit-stat cockpit-stat--free">
          <strong>{counts.available}</strong> free
        </span>
        <span className="cockpit-stat cockpit-stat--taken">
          <strong>{counts.taken + counts['expiring-soon']}</strong> taken
        </span>
        <span className="cockpit-stat cockpit-stat--na">
          <strong>{counts.unavailable}</strong> n/a
        </span>
        <span className="cockpit-stat cockpit-stat--err">
          <strong>{counts.error}</strong> errors
        </span>
        {counts.loading > 0 && (
          <span className="cockpit-stat cockpit-stat--loading">
            <strong>{counts.loading}</strong> checking…
          </span>
        )}
      </div>
      {bestPick && (
        <p className="cockpit-best-pick">
          Best value: <span className="cockpit-best-domain">{bestPick.domain}</span>
          {bestPick.currency === 'USD' ? ' $' : ` ${bestPick.currency} `}
          {bestPick.price}
        </p>
      )}
      <div className="cockpit-actions">
        <button
          type="button"
          className="cockpit-btn"
          onClick={copyAvailable}
          disabled={availableDomains.length === 0}
        >
          Copy all free ({availableDomains.length})
        </button>
        <button
          type="button"
          className="cockpit-btn cockpit-btn--primary"
          onClick={openBestRegistrar}
          disabled={availableDomains.length === 0}
        >
          Open in registrar
        </button>
      </div>
    </div>
  );
}
