/**
 * Shared helpers for verification result entries and aggregate summaries.
 */

export function normalizeFavoriteRow(f) {
  return {
    domain: f.domain,
    status: f.status,
    price: f.price,
    currency: f.currency,
    notes: f.notes ?? '',
    tags: f.tags ?? '',
    addedAt: f.addedAt ?? new Date().toISOString(),
    checkedAt: f.checkedAt ?? null,
    expirationDate: f.expirationDate ?? null,
    whoisError: f.whoisError ?? null,
  };
}

export function getEntryStatus(result) {
  if (result.loading) return 'loading';
  if (result.error) return 'error';
  if (result.data?.available) return 'available';

  if (result.data?.expirationDate && result.data.expirationDate !== 'Unknown') {
    const expiry = new Date(result.data.expirationDate);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30 && diffDays > 0) return 'expiring-soon';
  }

  if (result.data?.whoisError) return 'unavailable';
  return 'taken';
}

/**
 * @param {Record<string, unknown>} bulkResults
 * @returns {{ counts: Record<string, number>, bestPick: { domain: string, price: number, currency: string } | null }}
 */
export function summarizeBulkResults(bulkResults) {
  const counts = {
    available: 0,
    'expiring-soon': 0,
    taken: 0,
    unavailable: 0,
    error: 0,
    loading: 0,
  };

  let bestPick = null;

  for (const [domain, result] of Object.entries(bulkResults)) {
    const status = getEntryStatus(result);
    if (counts[status] !== undefined) counts[status]++;
    if (status === 'available' && result.data?.price != null) {
      const price = parseFloat(result.data.price);
      if (!Number.isNaN(price)) {
        if (!bestPick || price < bestPick.price) {
          bestPick = {
            domain,
            price,
            currency: result.data.currency || 'USD',
          };
        }
      }
    }
  }

  return { counts, bestPick };
}

export function registrarSearchUrl(domain) {
  return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;
}
