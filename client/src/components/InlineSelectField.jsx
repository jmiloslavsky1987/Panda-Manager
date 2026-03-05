// client/src/components/InlineSelectField.jsx
// Shared inline select component — extracted from ActionManager.jsx (Phase 4 Plan 04)
// Controlled select; placeholder option prevents first-option-never-fires onChange bug
import React from 'react';

export default function InlineSelectField({ value, options, onSave, isPending }) {
  if (isPending) return <span className="text-gray-400 italic text-sm">Saving...</span>;
  return (
    <select className="text-sm border border-gray-200 rounded px-1 py-0.5 bg-white"
      value={value ?? ''} onChange={e => { if (e.target.value) onSave(e.target.value); }}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
