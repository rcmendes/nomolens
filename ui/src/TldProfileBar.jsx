import React from 'react';
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
  return (
    <section className="tld-profile-bar" aria-label="TLD preferences">
      <div className="tld-profile-inner">
        <FieldInfo
          label={<span className="tld-profile-label">TLDs</span>}
          ariaLabel="About custom TLDs"
        >
          <p>
            Click any TLD to toggle it. Type a custom one (e.g. <code>.xyz</code>) in the
            input and press <strong>Enter</strong> to add it — custom TLDs are saved in
            your browser and persist across sessions.
          </p>
        </FieldInfo>
        <div className="tld-chips" role="group" aria-label="Select target TLDs">
          {PREDEFINED_TLDS.map((tld) => (
            <button
              key={tld}
              type="button"
              className={`tld-chip ${selectedTLDs.has(tld) ? 'selected' : ''}`}
              onClick={() => toggleTLD(tld)}
              disabled={disabled}
            >
              {tld}
            </button>
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
                  title={selectedTLDs.has(tld) ? 'Deselect TLD' : 'Select TLD'}
                >
                  {tld}
                </button>
                <button
                  type="button"
                  className="tld-chip-remove"
                  onClick={() => removeCustomTLD(tld)}
                  disabled={disabled}
                  aria-label={`Remove ${tld}`}
                  title="Remove from list"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}
          <input
            type="text"
            className="tld-input-inline"
            placeholder="+ .xyz"
            value={customTLD}
            onChange={(e) => setCustomTLD(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomTLD(e);
              }
            }}
            disabled={disabled}
            aria-label="Custom TLD input"
          />
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
