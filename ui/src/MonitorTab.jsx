import React from 'react';
import MonitoredPanel from './MonitoredPanel';

export default function MonitorTab({
  monitored,
  removeMonitored,
  updateMonitoredField,
  onRecheckMonitored,
  recheckingMonitoredDomain,
}) {
  return (
    <section className="mode-section glass" style={{ animation: 'none', opacity: 1 }}>
      <div className="monitor-header">
        <h2 style={{ marginBottom: '0.5rem' }}>Monitor List</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Keep track of domains you care about, even if they are currently taken. Re-check anytime
          for status updates.
        </p>
      </div>

      <MonitoredPanel
        monitored={monitored}
        onRemove={removeMonitored}
        onRecheck={onRecheckMonitored}
        onUpdateMonitored={updateMonitoredField}
        recheckingDomain={recheckingMonitoredDomain}
      />
    </section>
  );
}
