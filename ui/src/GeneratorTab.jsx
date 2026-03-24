import React from 'react';
import VerificationResultsSection from './VerificationResultsSection';

const PREDEFINED_TLDS = ['.com', '.io', '.co', '.ai', '.net', '.org', '.app', '.dev', '.tech', '.me', '.pro'];

// ── Helper: a single domain leaf card ─────────────────────────────────────────
function DomainLeaf({ domain, selected, onToggle, disabled, bulkResults }) {
  const result = bulkResults[domain];
  let statusBadge = null;
  if (result) {
    if (result.loading) statusBadge = <span className="compact-badge checking">Checking…</span>;
    else if (result.error) statusBadge = <span className="compact-badge error">Error</span>;
    else if (result.data?.available) statusBadge = <span className="compact-badge available">✓ Free</span>;
    else statusBadge = <span className="compact-badge taken">Taken</span>;
  }

  return (
    <div
      className={`tree-leaf-card glass ${selected ? 'selected' : ''}`}
      onClick={(e) => { if (e.target.tagName !== 'INPUT') onToggle(domain); }}
    >
      <label className="tree-checkbox-label">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(domain)}
          disabled={disabled}
          aria-label={`Select ${domain}`}
        />
        <span className="tree-domain-text">{domain}</span>
      </label>
      {statusBadge && <div className="leaf-badge-wrap">{statusBadge}</div>}
    </div>
  );
}

// ── Helper: a group branch (original or a suggestion) ─────────────────────────
function DomainGroup({ label, domains, selectedDomains, onToggle, bulkVerifying, bulkResults, onToggleGroup }) {
  const allSelected = domains.every((d) => selectedDomains.has(d));
  const someSelected = domains.some((d) => selectedDomains.has(d));

  return (
    <div className="tree-group">
      <div className="tree-group-header" onClick={() => onToggleGroup(domains, !allSelected)}>
        <span className={`tree-group-dot ${allSelected ? 'all' : someSelected ? 'some' : 'none'}`} />
        <span className="tree-group-label">{label}</span>
        <span className="tree-group-count">{domains.length} variant{domains.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="tree-leaves">
        {domains.map((d) => (
          <DomainLeaf
            key={d}
            domain={d}
            selected={selectedDomains.has(d)}
            onToggle={onToggle}
            disabled={bulkVerifying}
            bulkResults={bulkResults}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main GeneratorTab ─────────────────────────────────────────────────────────
export default function GeneratorTab({
  genName, setGenName,
  genPrompt, setGenPrompt,
  genPrefixes, setGenPrefixes,
  genSuffixes, setGenSuffixes,
  generating,
  generationResult,
  genError,
  selectedTLDs, toggleTLD,
  customTLD, setCustomTLD,
  customTLDError,
  handleAddCustomTLD,
  selectedDomains, toggleDomainSelection,
  bulkVerifying,
  bulkResults,
  handleBulkVerify,
  verifyProgress,
  onGenerate,
}) {
  const hasResult = generationResult !== null;

  // Toggle all domains in a group on/off
  const handleToggleGroup = (domains, shouldSelect) => {
    domains.forEach((d) => {
      const isSelected = selectedDomains.has(d);
      if (shouldSelect && !isSelected) toggleDomainSelection(d);
      if (!shouldSelect && isSelected) toggleDomainSelection(d);
    });
  };

  return (
    <section className="mode-section glass" style={{ animation: 'none', opacity: 1 }}>
      <h2 className="sr-only">Idea Generator</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Let AI brainstorm domain names based on your product's context.
      </p>

      <form className="generator-form" onSubmit={onGenerate}>
        <div className="form-group">
          <label htmlFor="gen-name">
            Base Name <span className="required">*</span>
          </label>
          <input
            id="gen-name"
            type="text"
            placeholder="e.g. Tamojunto"
            value={genName}
            onChange={(e) => setGenName(e.target.value)}
            disabled={generating}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gen-prompt">Product Context / Prompt</label>
          <textarea
            id="gen-prompt"
            placeholder="e.g. A marketplace connecting local services…"
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
            disabled={generating}
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="gen-prefixes">Prefixes (comma-separated)</label>
            <input
              id="gen-prefixes"
              type="text"
              placeholder="e.g. get, try, my"
              value={genPrefixes}
              onChange={(e) => setGenPrefixes(e.target.value)}
              disabled={generating}
            />
          </div>
          <div className="form-group">
            <label htmlFor="gen-suffixes">Suffixes (comma-separated)</label>
            <input
              id="gen-suffixes"
              type="text"
              placeholder="e.g. app, hq, tech"
              value={genSuffixes}
              onChange={(e) => setGenSuffixes(e.target.value)}
              disabled={generating}
            />
          </div>
        </div>

        <div className="form-group tld-section">
          <label>TLDs (Optional)</label>
          <div className="tld-chips">
            {PREDEFINED_TLDS.map((tld) => (
              <button
                key={tld}
                type="button"
                className={`tld-chip ${selectedTLDs.has(tld) ? 'selected' : ''}`}
                onClick={() => toggleTLD(tld)}
                disabled={generating}
              >
                {tld}
              </button>
            ))}
            {Array.from(selectedTLDs)
              .filter((tld) => !PREDEFINED_TLDS.includes(tld))
              .map((tld) => (
                <button
                  key={tld}
                  type="button"
                  className="tld-chip selected custom"
                  onClick={() => toggleTLD(tld)}
                  disabled={generating}
                  title="Remove custom TLD"
                >
                  {tld} &times;
                </button>
              ))}
          </div>
          <div className="custom-tld-input">
            <input
              type="text"
              placeholder="Add custom (.xyz)"
              value={customTLD}
              onChange={(e) => setCustomTLD(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTLD(e); }
              }}
              disabled={generating}
              aria-label="Custom TLD input"
            />
            <button
              type="button"
              className="add-tld-btn"
              onClick={handleAddCustomTLD}
              disabled={generating || !customTLD.trim()}
            >
              Add
            </button>
          </div>
          {customTLDError && (
            <p className="tld-error-msg" role="alert">{customTLDError}</p>
          )}
        </div>

        <button
          type="submit"
          className="search-btn generate-btn"
          disabled={generating || !genName.trim()}
        >
          {generating ? 'Brainstorming…' : 'Generate with AI'}
        </button>
      </form>

      {genError && (
        <div className="error-msg" role="alert" style={{ marginTop: '1rem' }}>{genError}</div>
      )}

      {generating && (
        <div className="loader-container">
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Asking Gemini to weave some magic…</p>
        </div>
      )}

      {/* ── Tree results ────────────────────────────────────────────────── */}
      {hasResult && (
        <div className="generated-results">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>
            Ideas for &ldquo;{genName}&rdquo;
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.75rem', fontWeight: 400 }}>
              {1 + generationResult.suggestions.length} groups ·{' '}
              {generationResult.original.domains.length +
                generationResult.suggestions.reduce((a, s) => a + s.domains.length, 0)} domains
            </span>
          </h3>

          <div className="tree-container">
            {/* Root node */}
            <div className="tree-root">
              <span className="tree-root-name">{genName}</span>
            </div>

            <div className="tree-branches">
              {/* Original name branch */}
              <div className="tree-branch">
                <div className="tree-line" />
                <DomainGroup
                  label={`${generationResult.original.base} (original)`}
                  domains={generationResult.original.domains}
                  selectedDomains={selectedDomains}
                  onToggle={toggleDomainSelection}
                  bulkVerifying={bulkVerifying}
                  bulkResults={bulkResults}
                  onToggleGroup={handleToggleGroup}
                />
              </div>

              {/* AI suggestion branches */}
              {generationResult.suggestions.map((suggestion, idx) => (
                <div key={suggestion.base} className="tree-branch">
                  <div className="tree-line" />
                  <DomainGroup
                    label={`${suggestion.base}`}
                    domains={suggestion.domains}
                    selectedDomains={selectedDomains}
                    onToggle={toggleDomainSelection}
                    bulkVerifying={bulkVerifying}
                    bulkResults={bulkResults}
                    onToggleGroup={handleToggleGroup}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Verify button */}
          {selectedDomains.size > 0 && (
            <div className="verify-action-container">
              {bulkVerifying && verifyProgress && (
                <span className="verify-progress">
                  {verifyProgress.done} / {verifyProgress.total} verified
                </span>
              )}
              <button
                className="verify-btn"
                onClick={handleBulkVerify}
                disabled={bulkVerifying}
              >
                {bulkVerifying
                  ? 'Verifying…'
                  : `Verify Selected (${selectedDomains.size})`}
              </button>
            </div>
          )}

          <VerificationResultsSection bulkResults={bulkResults} />
        </div>
      )}
    </section>
  );
}
