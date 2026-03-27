import { useState, useCallback, useMemo } from 'react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export const useGenerator = () => {
  const [genPrompt, setGenPrompt] = useState('');
  const [genKeywords, setGenKeywords] = useState([]);
  const [genKeywordInput, setGenKeywordInput] = useState('');
  const [genKeywordError, setGenKeywordError] = useState('');
  const [genPrefixes, setGenPrefixes] = useState('');
  const [genSuffixes, setGenSuffixes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [genError, setGenError] = useState(null);
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [lastVerifiedDomains, setLastVerifiedDomains] = useState(new Set());

  const hasSelectionChanged = useMemo(() => {
    if (selectedDomains.size !== lastVerifiedDomains.size) return true;
    for (const d of selectedDomains) {
      if (!lastVerifiedDomains.has(d)) return true;
    }
    return false;
  }, [selectedDomains, lastVerifiedDomains]);

  const handleGenerate = useCallback(async (selectedTLDs) => {
    if (!genPrompt.trim()) return;

    setGenerating(true);
    setGenError(null);
    setGenerationResult(null);
    setLastVerifiedDomains(new Set());
    setSelectedDomains(new Set());

    try {
      // Small helper to get cache keys for exclusion
      const cacheRaw = localStorage.getItem('nomoLens_cache') || '{}';
      const cache = JSON.parse(cacheRaw);
      const exclude = Object.keys(cache);

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: genPrompt.trim(),
          keywords: genKeywords,
          prefixes: genPrefixes.split(',').map((p) => p.trim()).filter(Boolean),
          suffixes: genSuffixes.split(',').map((s) => s.trim()).filter(Boolean),
          tlds: Array.from(selectedTLDs),
          exclude,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate names');

      setGenerationResult(data);

      const allDomains = data.suggestions.flatMap((s) => s.domains);
      setSelectedDomains(new Set(allDomains));
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [genPrompt, genKeywords, genPrefixes, genSuffixes]);

  const toggleDomainSelection = useCallback((domain) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }, []);

  const handleAddGenKeyword = useCallback((e) => {
    e?.preventDefault?.();

    const raw = genKeywordInput.trim();
    if (!raw) return;

    if (/\s/.test(raw)) {
      setGenKeywordError('Each weighted word must be a single token (no spaces).');
      return;
    }

    if (genKeywords.length >= 5) {
      setGenKeywordError('You can add up to 5 weighted words.');
      return;
    }

    const normalized = raw.toLowerCase();
    if (genKeywords.includes(normalized)) {
      setGenKeywordError('This weighted word is already added.');
      return;
    }

    setGenKeywords((prev) => [...prev, normalized]);
    setGenKeywordInput('');
    setGenKeywordError('');
  }, [genKeywordInput, genKeywords]);

  const handleRemoveGenKeyword = useCallback((keyword) => {
    setGenKeywords((prev) => prev.filter((k) => k !== keyword));
    setGenKeywordError('');
  }, []);

  return {
    genPrompt,
    setGenPrompt,
    genKeywords,
    genKeywordInput,
    setGenKeywordInput,
    genKeywordError,
    setGenKeywordError,
    genPrefixes,
    setGenPrefixes,
    genSuffixes,
    setGenSuffixes,
    generating,
    generationResult,
    genError,
    selectedDomains,
    setSelectedDomains,
    lastVerifiedDomains,
    setLastVerifiedDomains,
    hasSelectionChanged,
    handleGenerate,
    toggleDomainSelection,
    handleAddGenKeyword,
    handleRemoveGenKeyword,
  };
};
