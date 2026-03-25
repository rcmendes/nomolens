import React, { useCallback, useEffect, useId, useState } from 'react';

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 10.5v5M12 8.2v-.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function useFieldInfoEscape(open, setOpen) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);
}

/**
 * Label row + toggle info panel (flow layout below the row).
 * @param {{ label: React.ReactNode, ariaLabel: string, children: React.ReactNode }} props
 */
export function FieldInfo({ label, ariaLabel, children }) {
  const reactId = useId();
  const panelId = `field-info-${reactId.replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  useFieldInfoEscape(open, setOpen);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className="field-label-stack">
      <div className="field-label-row">
        {label}
        <button
          type="button"
          className="field-info-btn"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <InfoIcon />
        </button>
      </div>
      <div
        id={panelId}
        role="region"
        className="field-info-panel"
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Standalone info toggle for use beside another control (e.g. accordion trigger).
 * @param {{ ariaLabel: string, children: React.ReactNode, className?: string }} props
 */
export function FieldInfoIcon({ ariaLabel, children, className = '' }) {
  const reactId = useId();
  const panelId = `field-info-${reactId.replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  useFieldInfoEscape(open, setOpen);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className={`field-info-icon-root ${className}`.trim()}>
      <button
        type="button"
        className="field-info-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <InfoIcon />
      </button>
      <div id={panelId} role="region" className="field-info-panel" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
