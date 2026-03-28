import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useTld } from './context/TldContext';
import { useFavorites } from './hooks/useFavorites';
import { useDomainVerification } from './hooks/useDomainVerification';
import { useGenerator } from './hooks/useGenerator';
import ErrorBoundary from './components/ErrorBoundary';
import TldProfileBar from './TldProfileBar';
import CommandPalette from './CommandPalette';
import { MoonIcon, SunIcon } from './icons';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';
import { getEntryStatus } from './domainResultUtils';

// Lazy loaded tab components
const DirectSearchTab = lazy(() => import('./DirectSearchTab'));
const GeneratorTab = lazy(() => import('./GeneratorTab'));
const FavoritesTab = lazy(() => import('./FavoritesTab'));

function AppInner() {
  const toast = useToast();
  const { 
    selectedTLDs, toggleTLD, customTLD, setCustomTLD, 
    customTLDError, handleAddCustomTLD 
  } = useTld();
  
  const {
    favorites, addFavorite: _addFavorite, removeFavorite: _removeFavorite, updateFavoriteField,
    isFavorite, refreshFavorite, recheckingDomain
  } = useFavorites();

  const {
    bulkResults, setBulkResults, bulkVerifying, verifyProgress,
    loading, error, doSearch, handleBulkVerify, refreshDomainCheck
  } = useDomainVerification();

  // Wrap favorite actions with toast feedback
  const addFavorite = useCallback((domain, data) => {
    _addFavorite(domain, data);
    toast.show(`Added ${domain} to favorites`, { kind: 'success' });
  }, [_addFavorite, toast]);

  const removeFavorite = useCallback((domain) => {
    _removeFavorite(domain);
    toast.show(`Removed ${domain} from favorites`, { kind: 'info' });
  }, [_removeFavorite, toast]);

  const {
    genPrompt, setGenPrompt, genKeywords, genKeywordInput, setGenKeywordInput,
    genKeywordError, setGenKeywordError, genPrefixes, setGenPrefixes,
    genSuffixes, setGenSuffixes, generating, generationResult, genError,
    selectedDomains, setSelectedDomains, lastVerifiedDomains, setLastVerifiedDomains,
    hasSelectionChanged, handleGenerate, toggleDomainSelection,
    handleAddGenKeyword, handleRemoveGenKeyword
  } = useGenerator();

  const [theme, setTheme] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  );
  const [activeTab, setActiveTab] = useState('search');

  const searchInputRef = useRef(null);
  const genPromptRef = useRef(null);
  const verificationSectionRef = useRef(null);
  const tabSearchRef = useRef(null);
  const tabGenerateRef = useRef(null);
  const tabFavoritesRef = useRef(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const platform = navigator.platform || '';
    return /Mac|iPhone|iPad|iPod/i.test(platform);
  }, []);
  const paletteShortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const [query, setQuery] = useState('');
  const [debouncedQueryForUrl, setDebouncedQueryForUrl] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQueryForUrl(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLastVerifiedDomains(new Set()); // Clear generator verification state
    doSearch(query, selectedTLDs);
  };

  const handleRetry = () => {
    if (query.trim()) {
      setLastVerifiedDomains(new Set());
      doSearch(query, selectedTLDs);
    }
  };

  const skipInitialUrlWrite = useRef(true);

  // Hydrate from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (['generate', 'search', 'favorites'].includes(tab)) {
      setActiveTab(tab);
    }
    const q = params.get('q');
    if (q) setQuery(decodeURIComponent(q));
    
    // Generator state recovery (partially using URL or potentially local/session storage)
    // For now we fulfill the requirement: URL sync what's already there + TLDs
  }, []);

  // Sync to URL
  useEffect(() => {
    if (skipInitialUrlWrite.current) {
      skipInitialUrlWrite.current = false;
      return;
    }
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    if (debouncedQueryForUrl.trim()) params.set('q', debouncedQueryForUrl.trim());
    
    const tldArr = Array.from(selectedTLDs).sort();
    if (tldArr.length) {
      params.set('tlds', tldArr.map((t) => t.replace(/^\./, '')).join(','));
    }
    
    // Sync generator prompts if they exist
    if (genPrompt.trim()) params.set('genPrompt', genPrompt.trim());

    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, [activeTab, debouncedQueryForUrl, selectedTLDs, genPrompt]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const copyAvailableDomains = useCallback(async () => {
    const available = Object.entries(bulkResults)
      .filter(([, r]) => getEntryStatus(r) === 'available')
      .map(([d]) => d)
      .sort();
    if (available.length === 0) return;
    try {
      await navigator.clipboard.writeText(available.join('\n'));
      toast.show(`Copied ${available.length} domain${available.length === 1 ? '' : 's'} to clipboard`, {
        kind: 'success',
      });
    } catch {
      toast.show('Could not copy to clipboard', { kind: 'danger' });
    }
  }, [bulkResults, toast]);

  const hasAvailableToCopy = useMemo(
    () => Object.entries(bulkResults).some(([, r]) => getEntryStatus(r) === 'available'),
    [bulkResults]
  );

  const onTabListKeyDown = (e) => {
    const order = ['search', 'generate', 'favorites'];
    const refs = [tabSearchRef, tabGenerateRef, tabFavoritesRef];
    const i = order.indexOf(activeTab);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? (i + 1) % order.length : (i - 1 + order.length) % order.length;
      setActiveTab(order[next]);
      // Move focus to the newly active tab (ARIA tablist pattern)
      setTimeout(() => refs[next].current?.focus(), 0);
    }
  };

  const sharedTldBar = (
    <TldProfileBar
      selectedTLDs={selectedTLDs}
      toggleTLD={toggleTLD}
      customTLD={customTLD}
      setCustomTLD={setCustomTLD}
      customTLDError={customTLDError}
      handleAddCustomTLD={handleAddCustomTLD}
      disabled={generating}
    />
  );

  // Track which tab last populated bulkResults to avoid cross-contamination
  const showDirectVerification = activeTab === 'search' && Object.keys(bulkResults).length > 0;
  // Generator verification: only show if the user has actually verified generated domains
  // (lastVerifiedDomains.size > 0 means the bulk verify was run from the generator)
  const showGenerateVerification = activeTab === 'generate' && generationResult && lastVerifiedDomains.size > 0 && Object.keys(bulkResults).length > 0;

  return (
    <div className="page-shell">
      <div className="header-actions">
        <button type="button" className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button type="button" className="command-palette-trigger-btn" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
          {paletteShortcutLabel}
        </button>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        focusSearchInput={() => searchInputRef.current?.focus()}
        focusGenPrompt={() => genPromptRef.current?.focus()}
        onVerifySelected={() => handleBulkVerify(selectedDomains)}
        canVerifySelected={selectedDomains.size > 0 && (!bulkVerifying && hasSelectionChanged)}
        onShowOnlyAvailable={() => verificationSectionRef.current?.showOnlyAvailable?.()}
        onResetFilters={() => verificationSectionRef.current?.resetFilters?.()}
        onCopyAvailable={copyAvailableDomains}
        hasAvailableToCopy={hasAvailableToCopy}
      />

      <div className="layout-wrapper">
        <div className="app-container">
          <header className="brand-composition">
            <img src="/logo.png" alt="Nomo Lens Logo" className="brand-logo-img" />
            <div className="brand-text-content">
              <div className="brand-eyebrow">AI · DOMAIN INTELLIGENCE</div>
              <div className="brand-text-container">
                <span className="brand-nomo">Nomo</span>
                <span className="brand-lens">Lens</span>
              </div>
              <div className="brand-tagline">
                <span className="brand-tagline-line1">BRING YOUR IDEA.</span>
                <span className="brand-tagline-line2">WE'LL FIND THE NAME.</span>
              </div>
            </div>
          </header>

          <div className="tabs-container" role="tablist" aria-label="Main modes" onKeyDown={onTabListKeyDown}>
            {['search', 'generate', 'favorites'].map((tab) => (
              <button
                key={tab}
                ref={tab === 'search' ? tabSearchRef : tab === 'generate' ? tabGenerateRef : tabFavoritesRef}
                id={`tab-${tab}`}
                role="tab"
                type="button"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'favorites' && favorites.length > 0 && (
                  <>
                    <span className="sr-only">({favorites.length} items)</span>
                    <span className="tab-badge" aria-hidden="true">{favorites.length}</span>
                  </>
                )}
              </button>
            ))}
          </div>

          <Suspense fallback={<div className="tab-loading-spinner" />}>
            <ErrorBoundary>
              <div id="panel-search" role="tabpanel" aria-labelledby="tab-search" hidden={activeTab !== 'search'}>
                <DirectSearchTab
                  ref={searchInputRef}
                  tldBar={sharedTldBar}
                  query={query}
                  setQuery={setQuery}
                  loading={loading}
                  bulkResults={bulkResults}
                  error={error}
                  onSearch={handleSearch}
                  onRetry={handleRetry}
                  addFavorite={addFavorite}
                  removeFavorite={removeFavorite}
                  isFavorite={isFavorite}
                  verificationSectionRef={verificationSectionRef}
                  onRefreshDomain={refreshDomainCheck}
                  showVerificationResults={showDirectVerification}
                />
              </div>

              <div id="panel-generate" role="tabpanel" aria-labelledby="tab-generate" hidden={activeTab !== 'generate'}>
                <GeneratorTab
                  ref={genPromptRef}
                  tldBar={sharedTldBar}
                  genPrompt={genPrompt}
                  setGenPrompt={setGenPrompt}
                  genKeywords={genKeywords}
                  genKeywordInput={genKeywordInput}
                  setGenKeywordInput={setGenKeywordInput}
                  genKeywordError={genKeywordError}
                  setGenKeywordError={setGenKeywordError}
                  handleAddGenKeyword={handleAddGenKeyword}
                  handleRemoveGenKeyword={handleRemoveGenKeyword}
                  genPrefixes={genPrefixes}
                  setGenPrefixes={setGenPrefixes}
                  genSuffixes={genSuffixes}
                  setGenSuffixes={setGenSuffixes}
                  generating={generating}
                  generationResult={generationResult}
                  genError={genError}
                  selectedDomains={selectedDomains}
                  toggleDomainSelection={toggleDomainSelection}
                  hasSelectionChanged={hasSelectionChanged}
                  bulkVerifying={bulkVerifying}
                  bulkResults={bulkResults}
                  handleBulkVerify={async () => {
                    await handleBulkVerify(selectedDomains);
                    setLastVerifiedDomains(new Set(selectedDomains));
                  }}
                  verifyProgress={verifyProgress}
                  onGenerate={() => {
                    setBulkResults({});
                    handleGenerate(selectedTLDs);
                  }}
                  addFavorite={addFavorite}
                  removeFavorite={removeFavorite}
                  isFavorite={isFavorite}
                  verificationSectionRef={verificationSectionRef}
                  onRefreshDomain={refreshDomainCheck}
                  showVerificationResults={showGenerateVerification}
                />
              </div>

              <div id="panel-favorites" role="tabpanel" aria-labelledby="tab-favorites" hidden={activeTab !== 'favorites'}>
                <FavoritesTab
                  favorites={favorites}
                  removeFavorite={removeFavorite}
                  updateFavoriteField={updateFavoriteField}
                  onRecheckFavorite={refreshFavorite}
                  recheckingDomain={recheckingDomain}
                />
              </div>
            </ErrorBoundary>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
