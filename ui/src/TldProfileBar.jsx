import React from 'react';
import { FieldInfo } from './FieldInfo.jsx';

const PREDEFINED_TLDS = ['.com', '.io', '.co', '.ai', '.net', '.org', '.app', '.dev', '.tech', '.me', '.pro'];

export default function TldProfileBar({
  selectedTLDs,
  toggleTLD,
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
          {Array.from(selectedTLDs)
            .filter((tld) => !PREDEFINED_TLDS.includes(tld))
            .map((tld) => (
              <button
                key={tld}
                type="button"
                className="tld-chip selected custom"
                onClick={() => toggleTLD(tld)}
                disabled={disabled}
                title="Remove custom TLD"
              >
                {tld} &times;
              </button>
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
