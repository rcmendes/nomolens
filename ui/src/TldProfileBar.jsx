import React from 'react';

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
    <section className="tld-profile-bar glass" aria-label="TLD preferences">
      <div className="tld-profile-inner">
        <span className="tld-profile-label">TLDs</span>
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
        </div>
        <div className="custom-tld-input custom-tld-input--bar">
          <input
            type="text"
            placeholder="Add custom (.xyz)"
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
          <button
            type="button"
            className="add-tld-btn"
            onClick={handleAddCustomTLD}
            disabled={disabled || !customTLD.trim()}
          >
            Add
          </button>
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
