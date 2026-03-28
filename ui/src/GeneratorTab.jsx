import React, { useState, useEffect, forwardRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import VerificationResultsSection from './VerificationResultsSection';
import { FieldInfo } from './FieldInfo';
import { MicIcon, PlusIcon } from './icons';

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

function TldPill({ domain, selected, onToggle, disabled, bulkResults, tldOnly }) {
  const { t } = useTranslation();
  const result = bulkResults[domain];
  const displayText = tldOnly ? domain.slice(domain.indexOf('.')) : domain;

  let statusLabel = null;
  let modifier = '';

  if (result) {
    if (result.loading) {
      statusLabel = t('card.checking');
      modifier = 'checking';
    } else if (result.error) {
      statusLabel = t('card.error');
      modifier = 'error';
    } else if (result.data?.available) {
      statusLabel = t('card.available');
      modifier = 'available';
    } else {
      statusLabel = t('card.taken');
      modifier = 'taken';
    }
  }

  const classNames = [
    'tld-pill',
    modifier && `tld-pill--${modifier}`,
    selected && 'tld-pill--selected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onToggle(domain)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${selected ? t('generate.deselectToggle', { domain }) : t('generate.selectToggle', { domain })}${statusLabel ? ` — ${statusLabel}` : ''}`}
    >
      <span className="tld-pill-domain">{displayText}</span>
      {statusLabel && <span className="tld-pill-status">{statusLabel}</span>}
    </button>
  );
}

function TreeRoot({ bulkVerifying }) {
  const { t } = useTranslation();
  const phrases = t('generate.phrases', { returnObjects: true });
  const [phrase, setPhrase] = useState(null);

  useEffect(() => {
    if (!bulkVerifying) {
      setPhrase(null);
      return;
    }
    let idx = 0;
    setPhrase(phrases[idx]);
    const id = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setPhrase(phrases[idx]);
    }, 2500);
    return () => clearInterval(id);
  }, [bulkVerifying, phrases]);

  return (
    <div className="tree-root-centered">
      <span className="tree-root-icon">◈</span>
      <span className="tree-root-label">{phrase ?? t('generate.nameSeeds')}</span>
    </div>
  );
}

function TreeNode({ base, domains, selectedDomains, onToggle, bulkVerifying, bulkResults, onToggleGroup }) {
  const { t } = useTranslation();
  const allSelected = domains.every((d) => selectedDomains.has(d));
  const hasFreeDomain = domains.some((d) => bulkResults[d]?.data?.available);

  return (
    <div className={`tree-node${hasFreeDomain ? ' tree-node--has-free' : ''}`}>
      <div className="tree-node-header">
        <button
          type="button"
          className={`tree-node-label ${allSelected ? 'tree-node-label--all' : ''}`}
          onClick={() => onToggleGroup(domains, !allSelected)}
          disabled={bulkVerifying}
          aria-label={allSelected ? t('generate.deselectAll', { base }) : t('generate.selectAll', { base })}
          title={allSelected ? t('generate.deselectAll', { base }) : t('generate.selectAll', { base })}
        >
          ● {base}
        </button>
      </div>
      <div className="tree-node-tlds">
        {domains.map((d, i) => {
          const isLastTld = i === domains.length - 1;
          return (
            <div key={d} className="tree-tld-row">
              <span className="tree-connector">{isLastTld ? '└──' : '├──'}</span>
              <TldPill
                domain={d}
                selected={selectedDomains.has(d)}
                onToggle={onToggle}
                disabled={bulkVerifying}
                bulkResults={bulkResults}
                tldOnly
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GeneratorTab = forwardRef(function GeneratorTab(
  {
    tldBar,
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
  const { t } = useTranslation();
  const hasResult = generationResult !== null;
  const [isListening, setIsListening] = useState(false);
  const [dictationLang, setDictationLang] = useState('en-US');

  const handleSubmitGenerate = (e) => {
    e.preventDefault();
    onGenerate();
  };

  const handleDictate = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('generate.speechNotSupported'));
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
      <h2 className="sr-only">{t('generate.leadTitle')}</h2>
      <div className="generator-lead">
        <div className="generator-lead__eyebrow">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '0.1rem' }}
          >
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
          {t('generate.leadTitle')}
        </div>
        <p className="generator-lead__copy">
          <Trans i18nKey="generate.leadCopy">
            Describe what you're building in <span className="generator-lead__accent">plain language</span>—we'll suggest <span className="generator-lead__accent">memorable name roots</span> to pair with the extensions below.
          </Trans>
        </p>
      </div>

      <form className="generator-form" onSubmit={handleSubmitGenerate}>
        <div className="gen-form-grid">

          {/* LEFT COLUMN */}
          <div className="gen-form-left">

            {/* Prompt textarea field group */}
            <div className="form-group">
              <FieldInfo
                label={
                  <label htmlFor="gen-prompt">
                    {t('generate.promptLabel')} <span className="required">*</span>
                  </label>
                }
                ariaLabel={t('generate.promptLabel')}
              >
                <p>
                  {t('generate.promptInfo1')}
                </p>
                <p dangerouslySetInnerHTML={{ __html: t('generate.promptInfo2') }} />
              </FieldInfo>
              <div className="prompt-textarea-wrapper">
                <textarea
                  ref={ref}
                  id="gen-prompt"
                  placeholder={t('generate.promptPlaceholder')}
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  disabled={generating}
                  rows="8"
                  required
                  maxLength={MAX_PROMPT_CHARS}
                  aria-describedby="gen-prompt-char-count"
                />
              </div>
              {/* prompt-footer row below the textarea */}
              <div className="prompt-footer">
                <p
                  id="gen-prompt-char-count"
                  className={`prompt-char-count${genPrompt.length >= MAX_PROMPT_CHARS ? ' prompt-char-count--max' : ''}`}
                >
                  {t('generate.charCount', { count: genPrompt.length, max: MAX_PROMPT_CHARS })}
                </p>
                {/* Mic button moved here from inside the textarea wrapper */}
                <div className={`mic-split-btn ${isListening ? 'listening' : ''}`}>
                  <select
                    className="mic-split-lang"
                    value={dictationLang}
                    onChange={(e) => setDictationLang(e.target.value)}
                    disabled={generating || isListening}
                    title={t('generate.dictationLang')}
                    aria-label={t('generate.dictationLang')}
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
                    aria-label={t('generate.dictatePrompt')}
                    title={t('generate.dictatePrompt')}
                  >
                    <MicIcon isListening={isListening} />
                  </button>
                </div>
              </div>
            </div>

            {/* Focus words field group */}
            <div className="form-group tld-section">
              <FieldInfo
                label={
                  <span id="gen-keywords-label" className="field-section-label">
                    {t('generate.focusWords')}
                  </span>
                }
                ariaLabel={t('generate.focusWords')}
              >
                <p>{t('generate.focusWordsInfo1')}</p>
                <p>{t('generate.focusWordsInfo2')}</p>
              </FieldInfo>
              <div className="tld-chips">
                {genKeywords.map((kw) => (
                  <div key={kw} className="tld-chip selected">
                    <span className="tld-chip-text">{kw}</span>
                    <button
                      type="button"
                      className="tld-chip-remove"
                      onClick={() => handleRemoveGenKeyword(kw)}
                      aria-label={t('generate.removeKeyword', { kw })}
                      title={t('favorites.remove')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="custom-tld-input">
                <input
                  type="text"
                  placeholder={t('generate.focusWordsPlaceholder')}
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
                  <PlusIcon size={18} />
                  <span>{t('generate.focusWordsAdd')}</span>
                </button>
              </div>
              <p className="keyword-count-hint">
                {t('generate.focusWordsCount', { count: genKeywords.length, max: MAX_WEIGHTED_WORDS })}
              </p>
              {genKeywordError && (
                <p className="tld-error-msg" role="alert">
                  {genKeywordError}
                </p>
              )}
            </div>

          </div>
          {/* END LEFT COLUMN */}

          {/* RIGHT COLUMN */}
          <div className="gen-form-right">

            {/* Intro text for the right column (replaces accordion header) */}
            <div className="gen-form-right-intro">
              <FieldInfo
                label={
                  <p className="advanced-panel-intro-text">
                    {t('generate.advancedIntro')}
                  </p>
                }
                ariaLabel={t('generate.advancedIntro')}
              >
                <p dangerouslySetInnerHTML={{ __html: t('generate.advancedInfo1') }} />
                <p>{t('generate.advancedInfo2')}</p>
              </FieldInfo>
            </div>

            {/* Prefixes + Suffixes always visible (no accordion) */}
            <div className="form-row">
              <div className="form-group">
                <FieldInfo
                  label={<label htmlFor="gen-prefixes">{t('generate.prefixesLabel')}</label>}
                  ariaLabel={t('generate.prefixesLabel')}
                >
                  <p dangerouslySetInnerHTML={{ __html: t('generate.prefixesInfo') }} />
                </FieldInfo>
                <input
                  id="gen-prefixes"
                  type="text"
                  placeholder={t('generate.prefixesPlaceholder')}
                  value={genPrefixes}
                  onChange={(e) => setGenPrefixes(e.target.value)}
                  disabled={generating}
                />
              </div>
              <div className="form-group">
                <FieldInfo
                  label={<label htmlFor="gen-suffixes">{t('generate.suffixesLabel')}</label>}
                  ariaLabel={t('generate.suffixesLabel')}
                >
                  <p dangerouslySetInnerHTML={{ __html: t('generate.suffixesInfo') }} />
                </FieldInfo>
                <input
                  id="gen-suffixes"
                  type="text"
                  placeholder={t('generate.suffixesPlaceholder')}
                  value={genSuffixes}
                  onChange={(e) => setGenSuffixes(e.target.value)}
                  disabled={generating}
                />
              </div>
            </div>

            <button
              type="submit"
              className="search-btn generate-btn gen-submit-btn"
              disabled={generating || !genPrompt.trim() || genPrompt.length > MAX_PROMPT_CHARS}
            >
              {generating ? t('generate.buttonLoading') : t('generate.buttonActive')}
            </button>

          </div>
          {/* END RIGHT COLUMN */}

        </div>

        {tldBar}

      </form>

      {/* Error and loading states — sibling to form */}
      {genError && (
        <div className="error-msg" role="alert">
          {genError}
        </div>
      )}

      {generating && (
        <div className="loader-container">
          <div className="spinner" />
          <p className="text-muted">
            {t('generate.loadingText')}
          </p>
        </div>
      )}

      {/* Results area — unchanged */}
      {hasResult && (
        <div className="generated-results">
          <div className="tree-root-section">
            <TreeRoot bulkVerifying={bulkVerifying} />
            <div className="tree-body">
              {generationResult.suggestions.map((suggestion, idx) => (
                <TreeNode
                  key={`${suggestion.base}-${idx}`}
                  base={suggestion.base}
                  domains={suggestion.domains}
                  selectedDomains={selectedDomains}
                  onToggle={toggleDomainSelection}
                  bulkVerifying={bulkVerifying}
                  bulkResults={bulkResults}
                  onToggleGroup={handleToggleGroup}
                />
              ))}
            </div>
          </div>

          {selectedDomains.size > 0 && (
            <div className="verify-action-container">
              {bulkVerifying && verifyProgress && (
                <span className="verify-progress">
                  {t('generate.verifyProgress', { done: verifyProgress.done, total: verifyProgress.total })}
                </span>
              )}
              <div className="verify-action-col">
                <button
                  className="verify-btn"
                  onClick={handleBulkVerify}
                  disabled={verifyDisabled}
                >
                  {bulkVerifying ? t('generate.verifyingButton') : t('generate.verifyButton', { count: selectedDomains.size })}
                </button>
                {showVerifyHint && (
                  <p className="verify-hint" role="note">
                    {t('generate.verifyHint')}
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
