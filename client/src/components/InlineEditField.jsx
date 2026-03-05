// client/src/components/InlineEditField.jsx
// Shared inline edit component — extracted from ActionManager.jsx (Phase 4 Plan 04)
// Shows value as text; click to enter edit mode; saves on blur or Enter key
import React from 'react';
import clsx from 'clsx';

export default function InlineEditField({ value, onSave, isPending, className = '', type = 'text' }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? '');

  const handleBlur = () => {
    if (draft !== (value ?? '')) onSave(draft);
    setEditing(false);
  };

  if (isPending) return <span className="text-gray-400 italic text-sm">Saving...</span>;
  if (editing) {
    return (
      <input autoFocus type={type}
        className="border border-teal-300 rounded px-1 py-0.5 text-sm w-full"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }
  return (
    <span className={clsx('cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 text-sm', className)}
      title="Click to edit" onClick={() => { setDraft(value ?? ''); setEditing(true); }}>
      {value || <span className="text-gray-400">—</span>}
    </span>
  );
}
