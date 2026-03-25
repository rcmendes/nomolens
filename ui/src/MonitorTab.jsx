import React from 'react';
import MonitoredPanel from './MonitoredPanel';

export default function MonitorTab({
  monitored,
  removeMonitored,
  removeFavorite,
  updateMonitoredField,
  onRecheckMonitored,
  recheckingMonitoredDomain,
  addFavorite,
  isFavorite,
}) {
  return (
    <section className="mode-section mode-section--static glass">
      <div className="monitor-header">
        <h2 className="mb-1">Monitor List</h2>
        <p className="text-muted mb-6" style={{ fontSize: '0.9rem' }}>
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
        addFavorite={addFavorite}
        removeFavorite={removeFavorite}
        isFavorite={isFavorite}
      />
    </section>
  );
}
