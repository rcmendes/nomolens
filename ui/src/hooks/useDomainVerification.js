import { useState, useCallback } from 'react';
import pLimit from 'p-limit';
import { getCachedResult, saveToCache } from '../utils/domainCache';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
const CONCURRENCY_LIMIT = 5;

export const useDomainVerification = () => {
  const [bulkResults, setBulkResults] = useState({});
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkDomainApi = useCallback(async (domain) => {
    const checkedAt = new Date().toISOString();
    try {
      const res = await fetch(`${API_BASE}/api/check?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      const apiError = !res.ok ? data.error || 'Error' : null;
      if (!apiError && !data.available) {
        saveToCache(domain, data);
      }
      return { loading: false, data, error: apiError, checkedAt };
    } catch (e) {
      return { loading: false, error: e.message || 'Network error', checkedAt };
    }
  }, []);

  const doSearch = useCallback(async (domainQuery, selectedTLDs) => {
    let base = domainQuery.trim().toLowerCase();
    base = base.replace(/^https?:\/\//, '').split('/')[0];
    if (base.includes('.')) {
      base = base.split('.')[0];
    }

    if (!base) return;

    setLoading(true);
    setError(null);
    setBulkResults({});

    const domainsToVerify = Array.from(selectedTLDs).map((tld) => `${base}${tld}`);

    setBulkVerifying(true);
    setVerifyProgress({ done: 0, total: domainsToVerify.length });

    const resultsToUpdate = {};
    const domainsRequiringFetch = [];

    for (const d of domainsToVerify) {
      const cached = getCachedResult(d);
      if (cached) {
        resultsToUpdate[d] = {
          loading: false,
          data: cached,
          error: null,
          checkedAt: null,
        };
      } else {
        domainsRequiringFetch.push(d);
        resultsToUpdate[d] = { loading: true };
      }
    }
    setBulkResults(resultsToUpdate);

    const cachedCount = domainsToVerify.length - domainsRequiringFetch.length;

    if (domainsRequiringFetch.length === 0) {
      setVerifyProgress({ done: domainsToVerify.length, total: domainsToVerify.length });
      setBulkVerifying(false);
      setLoading(false);
      return;
    }

    if (cachedCount > 0) {
      setLoading(false);
      setVerifyProgress({ done: cachedCount, total: domainsToVerify.length });
    }

    const limit = pLimit(CONCURRENCY_LIMIT);
    let fetchFailures = 0;
    let completed = 0;

    await Promise.all(
      domainsRequiringFetch.map((d) =>
        limit(async () => {
          const outcome = await checkDomainApi(d);
          if (outcome.error) fetchFailures++;
          completed++;
          setBulkResults((prev) => ({ ...prev, [d]: outcome }));
          setVerifyProgress({ done: cachedCount + completed, total: domainsToVerify.length });
        })
      )
    );

    if (fetchFailures === domainsRequiringFetch.length) {
      setError('Could not verify domains. Check your connection and try again.');
    }

    setBulkVerifying(false);
    setLoading(false);
  }, [checkDomainApi]);

  const handleBulkVerify = useCallback(async (selectedDomains) => {
    if (selectedDomains.size === 0) return;

    const allSelected = Array.from(selectedDomains);
    const resultsToUpdate = { ...bulkResults };
    const domainsRequiringFetch = [];

    for (const d of allSelected) {
      const cached = getCachedResult(d);
      if (cached) {
        resultsToUpdate[d] = { loading: false, data: cached, error: null, checkedAt: null };
      } else if (!bulkResults[d] || bulkResults[d].loading || bulkResults[d].error) {
        domainsRequiringFetch.push(d);
        resultsToUpdate[d] = { loading: true };
      }
    }

    setBulkResults(resultsToUpdate);
    setBulkVerifying(true);
    const cachedInBatch = allSelected.length - domainsRequiringFetch.length;
    setVerifyProgress({ done: cachedInBatch, total: allSelected.length });

    const limit = pLimit(CONCURRENCY_LIMIT);
    let completed = 0;

    await Promise.all(
      domainsRequiringFetch.map((d) =>
        limit(async () => {
          const outcome = await checkDomainApi(d);
          completed++;
          setBulkResults((prev) => ({ ...prev, [d]: outcome }));
          setVerifyProgress({ done: cachedInBatch + completed, total: allSelected.length });
        })
      )
    );

    setVerifyProgress({ done: allSelected.length, total: allSelected.length });
    setBulkVerifying(false);
  }, [bulkResults, checkDomainApi]);

  const refreshDomainCheck = useCallback(async (domain) => {
    setBulkResults((prev) => ({
      ...prev,
      [domain]: { ...prev[domain], loading: true },
    }));
    const outcome = await checkDomainApi(domain);
    setBulkResults((prev) => ({ ...prev, [domain]: outcome }));
  }, [checkDomainApi]);

  return {
    bulkResults,
    setBulkResults,
    bulkVerifying,
    verifyProgress,
    loading,
    error,
    doSearch,
    handleBulkVerify,
    refreshDomainCheck,
  };
};
