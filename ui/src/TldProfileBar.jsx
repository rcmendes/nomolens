import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldInfo } from './FieldInfo.jsx';

const PREDEFINED_TLDS = ['.com', '.io', '.co', '.ai', '.net', '.org', '.app', '.dev', '.tech', '.me', '.pro'];

export default function TldProfileBar({
  selectedTLDs,
  toggleTLD,
  customTLDs,
  removeCustomTLD,
  customTLD,
  setCustomTLD,
  customTLDError,
  handleAddCustomTLD,
  disabled,
}) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleToggleAdd = () => {
    setIsAdding((prev) => !prev);
    setCustomTLD('');
  };

  const handleInputBlur = () => {
    if (!customTLD.trim()) {
      setIsAdding(false);
    }
  };

  return (
    <section className="tld-profile-bar" aria-label={t('tlds.preferencesAria')}>
      <div className="tld-profile-inner">
        <FieldInfo
          label={<span className="tld-profile-label">{t('tlds.label')}</span>}
          ariaLabel={t('tlds.label')}
        >
          <p dangerouslySetInnerHTML={{ __html: t('tlds.info') }} />
        </FieldInfo>
        <div className="tld-chips" role="group" aria-label={t('tlds.selectionAria')}>
          {PREDEFINED_TLDS.map((tld) => (
            <div
              key={tld}
              className={`tld-chip fixed ${selectedTLDs.has(tld) ? 'selected' : ''}`}
            >
              <button
                type="button"
                className="tld-chip-toggle-area"
                onClick={() => toggleTLD(tld)}
                disabled={disabled}
                aria-pressed={selectedTLDs.has(tld)}
                title={selectedTLDs.has(tld) ? t('tlds.deselect') : t('tlds.select')}
              >
                {tld}
              </button>
            </div>
          ))}
          {Array.from(customTLDs)
            .sort()
            .map((tld) => (
              <div
                key={tld}
                className={`tld-chip custom ${selectedTLDs.has(tld) ? 'selected' : ''}`}
              >
                <button
                  type="button"
                  className="tld-chip-toggle-area"
                  onClick={() => toggleTLD(tld)}
                  disabled={disabled}
                  aria-pressed={selectedTLDs.has(tld)}
                  title={selectedTLDs.has(tld) ? t('tlds.deselect') : t('tlds.select')}
                >
                  {tld}
                </button>
                <button
                  type="button"
                  className="tld-chip-remove"
                  onClick={() => removeCustomTLD(tld)}
                  disabled={disabled}
                  aria-label={t('tlds.remove', { tld })}
                  title={t('tlds.remove', { tld })}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}

          {isAdding ? (
            <div className="tld-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="tld-input-inline expanded"
                placeholder={t('tlds.inputPlaceholder')}
                value={customTLD}
                onChange={(e) => setCustomTLD(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTLD(e);
                  } else if (e.key === 'Escape') {
                    setCustomTLD('');
                    setIsAdding(false);
                  }
                }}
                disabled={disabled}
                aria-label={t('tlds.customAria')}
              />
            </div>
          ) : (
            <button
              type="button"
              className="tld-chip add-btn"
              onClick={handleToggleAdd}
              disabled={disabled}
              title={t('tlds.addCustom')}
              aria-label={t('tlds.addCustom')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
        </div>
        {customTLDError && (
          <p className="tld-error-msg tld-error-msg--bar" role="alert">
            {customTLDError}
          </p>
        )}
      </div>
    </section>
  );
}
