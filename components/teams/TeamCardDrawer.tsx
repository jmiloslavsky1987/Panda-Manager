'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { TeamCard } from '@/db/schema';

interface Props {
  projectId: number;
  card: TeamCard | null; // null = drawer closed
  onClose: () => void;
  onSaved: (updated: TeamCard) => void;
}

export default function TeamCardDrawer({ projectId, card, onClose, onSaved }: Props) {
  const open = card !== null;
  const [form, setForm] = useState<Partial<TeamCard>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setForm({
        success_definition: card.success_definition,
        overall_status: card.overall_status,
        notes: card.notes,
        latest_activity_text: card.latest_activity_text,
      });
    }
  }, [card]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/team-cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = (await res.json()) as TeamCard;
        onSaved(updated);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop scrim */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel — right slide-in, 360px wide */}
      <aside
        role="dialog"
        aria-label="Edit team card"
        aria-modal="true"
        className={`fixed top-0 right-0 z-50 h-full w-[360px] bg-background border-l border-border shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">{card?.team_name ?? 'Edit team'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Form */}
        {card && (
          <form className="p-4 space-y-3" onSubmit={handleSave}>
            <label className="block text-xs">
              <span className="block font-medium mb-1">Success Definition</span>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm resize-none"
                value={form.success_definition ?? ''}
                onChange={(e) => setForm({ ...form, success_definition: e.target.value })}
              />
            </label>

            <label className="block text-xs">
              <span className="block font-medium mb-1">Overall Status</span>
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                value={form.overall_status ?? 'not_started'}
                onChange={(e) =>
                  setForm({ ...form, overall_status: e.target.value as TeamCard['overall_status'] })
                }
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="blocked">Blocked</option>
                <option value="not_started">Not Started</option>
              </select>
            </label>

            <label className="block text-xs">
              <span className="block font-medium mb-1">Latest Activity</span>
              <textarea
                rows={2}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm resize-none"
                value={form.latest_activity_text ?? ''}
                onChange={(e) => setForm({ ...form, latest_activity_text: e.target.value })}
              />
            </label>

            <label className="block text-xs">
              <span className="block font-medium mb-1">Notes</span>
              <textarea
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm resize-none"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}
