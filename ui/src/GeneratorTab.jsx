import React, { useState, forwardRef } from 'react';
import VerificationResultsSection from './VerificationResultsSection';
import { FieldInfo, FieldInfoIcon } from './FieldInfo';
import { MicIcon } from './icons';

const MAX_WEIGHTED_WORDS = 5;
/** Matches server.js /api/generate prompt length check */
const MAX_PROMPT_CHARS = 1000;

function SeedRootIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ marginRight: '0.45rem', verticalAlign: 'text-bottom' }}
    >
      <path d="M11 13v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 19c-1.5 0-3-.7-4-1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 19c1.5 0 3-.7 4-1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 13c-2.4 0-4.4-2-4.4-4.4V7.8h.8c2.3 0 4.2 1.9 4.2 4.2V13Z" fill="currentColor" opacity="0.7" />
      <path d="M11 13c2.4 0 4.4-2 4.4-4.4V7.8h-.8c-2.3 0-4.2 1.9-4.2 4.2V13Z" fill="currentColor" />
    </svg>
  );
}

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
    <button
      type="button"
      className={`tree-leaf-card glass ${selected ? 'selected' : ''}`}
      onClick={(e) => {
        if (e.target.closest('.tree-checkbox-label')) return;
        onToggle(domain);
      }}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Toggle ${domain}`}
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
    </button>
  );
}

function DomainGroup({ label, domains, selectedDomains, onToggle, bulkVerifying, bulkResults, onToggleGroup }) {
  const allSelected = domains.every((d) => selectedDomains.has(d));
  const someSelected = domains.some((d) => selectedDomains.has(d));

  return (
    <div className="tree-group">
      <button
        type="button"
        className="tree-group-header"
        onClick={() => onToggleGroup(domains, !allSelected)}
        disabled={bulkVerifying}
        aria-label={`${allSelected ? 'Deselect' : 'Select'} all variants for ${label}`}
      >
        <span className={`tree-group-dot ${allSelected ? 'all' : someSelected ? 'some' : 'none'}`} />
        <span className="tree-group-label">{label}</span>
        <span className="tree-group-count">
          {domains.length} variant{domains.length !== 1 ? 's' : ''}
        </span>
      </button>
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

const GeneratorTab = forwardRef(function GeneratorTab(
  {
    genPrompt,
    setGenPrompt,
    genKeywords,
    genKeywordInput,
    setGenKeywordInput,
    genKeywordError,
    setGenKeywordError,
    handleAddGenKeyword,
    handleRemoveGenKeyword,
    genPrefixes,
    setGenPrefixes,
    genSuffixes,
    setGenSuffixes,
    generating,
    generationResult,
    genError,
    selectedDomains,
    toggleDomainSelection,
    bulkVerifying,
    bulkResults,
    handleBulkVerify,
    hasSelectionChanged,
    verifyProgress,
    onGenerate,
    addFavorite,
    removeFavorite,
    isFavorite,
    verificationSectionRef,
    onRefreshDomain,
    showVerificationResults,
  },
  ref
) {
  const hasResult = generationResult !== null;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dictationLang, setDictationLang] = useState('en-US');

  const handleDictate = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = dictationLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setGenPrompt((prev) => {
        const newPrompt = prev ? prev + ' ' + transcript : transcript;
        return newPrompt.slice(0, MAX_PROMPT_CHARS);
      });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleToggleGroup = (domains, shouldSelect) => {
    domains.forEach((d) => {
      const isSelected = selectedDomains.has(d);
      if (shouldSelect && !isSelected) toggleDomainSelection(d);
      if (!shouldSelect && isSelected) toggleDomainSelection(d);
    });
  };

  const verifyDisabled = bulkVerifying || !hasSelectionChanged;
  const showVerifyHint = selectedDomains.size > 0 && verifyDisabled && !bulkVerifying;

  return (
    <section className="mode-section mode-section--static mode-section--wide glass">
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 className="sr-only">Generate names with AI</h2>
        <p className="lead-muted-center">
          <SeedRootIcon />
          Describe what you are building in plain language—we suggest memorable name roots you can pair with the
          extensions you select in the bar above.
        </p>

        <form className="generator-form" onSubmit={onGenerate}>
          <div className="form-group">
            <FieldInfo
              label={
                <label htmlFor="gen-prompt">
                  What are you building? <span className="required">*</span>
                </label>
              }
              ariaLabel="More about the product description"
            >
              <p>
                A short pitch works best: who it is for, the problem you solve, and the vibe you want. We send this
                text to the model as the main story behind your names.
              </p>
              <p>
                Suggestions are <strong>base names only</strong> (no “.com” in the list). Pick your TLDs in the
                profile bar—they apply when you verify availability.
              </p>
            </FieldInfo>
            <div className="prompt-textarea-wrapper">
              <textarea
                ref={ref}
                id="gen-prompt"
                placeholder="e.g. A calm budgeting app for couples who want shared goals without the spreadsheet…"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                disabled={generating}
                rows="3"
                required
                maxLength={MAX_PROMPT_CHARS}
                aria-describedby="gen-prompt-char-count"
              />
              <div className={`mic-split-btn ${isListening ? 'listening' : ''}`}>
                <select
                  className="mic-split-lang"
                  value={dictationLang}
                  onChange={(e) => setDictationLang(e.target.value)}
                  disabled={generating || isListening}
                  title="Select dictation language"
                  aria-label="Select dictation language"
                >
                  <option value="en-US">EN</option>
                  <option value="es-ES">ES</option>
                  <option value="fr-FR">FR</option>
                  <option value="pt-BR">PT</option>
                </select>
                <div className="mic-split-divider"></div>
                <button
                  type="button"
                  className="mic-split-action"
                  onClick={handleDictate}
                  disabled={generating}
                  aria-label="Dictate prompt"
                  title="Dictate prompt"
                >
                  <MicIcon isListening={isListening} />
                </button>
              </div>
            </div>
            <p
              id="gen-prompt-char-count"
              className={`prompt-char-count${genPrompt.length >= MAX_PROMPT_CHARS ? ' prompt-char-count--max' : ''}`}
            >
              {genPrompt.length}/{MAX_PROMPT_CHARS} characters
            </p>
          </div>

          <div className="form-group tld-section">
            <FieldInfo
              label={
                <span id="gen-keywords-label" className="field-section-label">
                  Focus words (optional)
                </span>
              }
              ariaLabel="More about focus words"
            >
              <p>
                Add up to five single words (no spaces) that should weigh more heavily than the rest of your
                description—think “trust,” “speed,” or a niche you want in the name.
              </p>
              <p>They are optional; the model still reads your full description when you do not add any.</p>
            </FieldInfo>
            <div className="tld-chips">
              {genKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  className="tld-chip selected custom"
                  onClick={() => handleRemoveGenKeyword(keyword)}
                  disabled={generating}
                  title="Remove this focus word"
                >
                  {keyword} &times;
                </button>
              ))}
            </div>
            <div className="custom-tld-input">
              <input
                type="text"
                placeholder="Type a word, then Add"
                value={genKeywordInput}
                onChange={(e) => {
                  setGenKeywordInput(e.target.value);
                  if (genKeywordError) setGenKeywordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGenKeyword(e);
                  }
                }}
                disabled={generating}
                aria-labelledby="gen-keywords-label"
              />
              <button
                type="button"
                className="add-tld-btn"
                onClick={handleAddGenKeyword}
                disabled={generating || !genKeywordInput.trim() || genKeywords.length >= MAX_WEIGHTED_WORDS}
              >
                Add
              </button>
            </div>
            <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {genKeywords.length}/{MAX_WEIGHTED_WORDS} focus words—each one nudges the AI more than the surrounding
              text.
            </p>
            {genKeywordError && (
              <p className="tld-error-msg" role="alert">
                {genKeywordError}
              </p>
            )}
          </div>

          <div className="advanced-accordion">
            <button
              type="button"
              className="advanced-accordion-trigger"
              onClick={() => setAdvancedOpen((o) => !o)}
              aria-expanded={advancedOpen}
              id="advanced-label"
            >
              <span>Fine-tune name style (optional)</span>
              <span className="advanced-chevron" aria-hidden>
                {advancedOpen ? '▾' : '▸'}
              </span>
            </button>
            <div
              className="advanced-accordion-panel"
              role="region"
              aria-labelledby="advanced-label"
              hidden={!advancedOpen}
            >
              <div className="advanced-panel-intro">
                <p className="advanced-panel-intro-text">
                  Optional hints for how names might sound—the model treats them as inspiration, not a checklist.
                </p>
                <FieldInfoIcon ariaLabel="More about fine-tuning name style">
                  <p>
                    Prefixes and suffixes are comma-separated tokens (for example <code>get, try</code> or{' '}
                    <code>app, ly</code>). We pass them to the model as ideas it may blend in when they still feel
                    natural.
                  </p>
                  <p>You will not get every combination, and you can leave both fields empty.</p>
                </FieldInfoIcon>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <FieldInfo
                    label={<label htmlFor="gen-prefixes">Prefixes (optional)</label>}
                    ariaLabel="More about prefixes"
                  >
                    <p>
                      Words or fragments that could appear <strong>before</strong> the core name (for example “get”
                      in “getflow”). Separate entries with commas.
                    </p>
                  </FieldInfo>
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
                  <FieldInfo
                    label={<label htmlFor="gen-suffixes">Suffixes (optional)</label>}
                    ariaLabel="More about suffixes"
                  >
                    <p>
                      Words or fragments that could appear <strong>after</strong> the core name (for example “ly” or
                      “hq”). Separate entries with commas.
                    </p>
                  </FieldInfo>
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
            </div>
          </div>

          <button
            type="submit"
            className="search-btn generate-btn"
            disabled={generating || !genPrompt.trim() || genPrompt.length > MAX_PROMPT_CHARS}
          >
            {generating ? 'Cooking up names…' : 'Generate ideas'}
          </button>
        </form>

        {genError && (
          <div className="error-msg" role="alert" style={{ marginTop: '1rem' }}>
            {genError}
          </div>
        )}

        {generating && (
          <div className="loader-container">
            <div className="spinner" />
            <p className="text-muted">
              Asking Gemini for fresh angles—usually just a few seconds.
            </p>
          </div>
        )}
      </div>

      {hasResult && (
        <div className="generated-results">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>
            Name ideas worth a closer look
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginLeft: '0.75rem',
                fontWeight: 400,
              }}
            >
              {generationResult.suggestions.length} groups ·{' '}
              {generationResult.suggestions.reduce((a, s) => a + s.domains.length, 0)} domains
            </span>
          </h3>

          <div className="tree-container">
            <div className="tree-root">
              <span className="tree-root-name">Your latest run</span>
            </div>

            <div className="tree-branches">
              {generationResult.suggestions.map((suggestion, idx) => (
                <div key={`${suggestion.base}-${idx}`} className="tree-branch">
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

          {selectedDomains.size > 0 && (
            <div className="verify-action-container">
              {bulkVerifying && verifyProgress && (
                <span className="verify-progress">
                  {verifyProgress.done} / {verifyProgress.total} verified
                </span>
              )}
              <div className="verify-action-col">
                <button
                  className="verify-btn"
                  onClick={handleBulkVerify}
                  disabled={verifyDisabled}
                >
                  {bulkVerifying ? 'Verifying…' : `Verify Selected (${selectedDomains.size})`}
                </button>
                {showVerifyHint && (
                  <p className="verify-hint" role="note">
                    This selection matches your last verification. Pick different domains if you want to run a
                    fresh check.
                  </p>
                )}
              </div>
            </div>
          )}

          {showVerificationResults && (
            <VerificationResultsSection
              ref={verificationSectionRef}
              bulkResults={bulkResults}
              isFavorite={isFavorite}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              onRefreshDomain={onRefreshDomain}
            />
          )}
        </div>
      )}
    </section>
  );
});

export default GeneratorTab;
