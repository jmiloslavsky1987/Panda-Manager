'use client';

import { useEffect, useState, useCallback } from 'react';

interface TimeTrackingConfig {
  id: number;
  enabled: boolean;
  weekly_capacity_hours: string;
  working_days: string[];
  submission_due_day: string;
  submission_due_time: string;
  reminder_days_before: number;
  categories: string[];
  restrict_to_assigned: boolean;
  active_projects_only: boolean;
  lock_after_approval: boolean;
  exempt_users: string[];
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const LABEL_CLASS = 'block text-sm font-medium text-zinc-700 mb-1';
const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900';
const SECTION_CLASS = 'border border-zinc-200 rounded-lg p-6 mb-4';

function ToggleSwitch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
          checked ? 'bg-zinc-900' : 'bg-zinc-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <label htmlFor={id} className="text-sm text-zinc-700 cursor-pointer select-none">
        {label}
      </label>
    </div>
  );
}

export default function TimeTrackingSettings() {
  const [config, setConfig] = useState<TimeTrackingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Category management
  const [newCategory, setNewCategory] = useState('');
  // Exempt users
  const [newExemptUser, setNewExemptUser] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/time-tracking');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TimeTrackingConfig = await res.json();
      setConfig(data);
    } catch (err) {
      setError('Failed to load time tracking configuration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const patch = useCallback(
    async (partial: Partial<TimeTrackingConfig>) => {
      if (!config) return;
      const optimistic = { ...config, ...partial };
      setConfig(optimistic);
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/settings/time-tracking', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const updated: TimeTrackingConfig = await res.json();
        setConfig(updated);
        setSavedAt(new Date());
      } catch (err) {
        setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
        // Revert optimistic update
        setConfig(config);
      } finally {
        setSaving(false);
      }
    },
    [config]
  );

  const toggleWorkingDay = (day: string) => {
    if (!config) return;
    const days = config.working_days.includes(day)
      ? config.working_days.filter((d) => d !== day)
      : [...config.working_days, day];
    patch({ working_days: days });
  };

  const addCategory = () => {
    if (!config || !newCategory.trim()) return;
    const trimmed = newCategory.trim();
    if (config.categories.includes(trimmed)) return;
    patch({ categories: [...config.categories, trimmed] });
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    if (!config) return;
    patch({ categories: config.categories.filter((c) => c !== cat) });
  };

  const addExemptUser = () => {
    if (!config || !newExemptUser.trim()) return;
    const trimmed = newExemptUser.trim();
    if (config.exempt_users.includes(trimmed)) return;
    patch({ exempt_users: [...config.exempt_users, trimmed] });
    setNewExemptUser('');
  };

  const removeExemptUser = (user: string) => {
    if (!config) return;
    patch({ exempt_users: config.exempt_users.filter((u) => u !== user) });
  };

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading time tracking configuration...</p>;
  }

  if (!config) {
    return (
      <div className="text-sm text-red-600">
        {error ?? 'Configuration not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Save status bar */}
      <div className="flex items-center gap-3 text-sm min-h-[20px]">
        {saving && <span className="text-zinc-500">Saving...</span>}
        {!saving && savedAt && (
          <span className="text-green-600">Saved {savedAt.toLocaleTimeString()}</span>
        )}
        {error && <span className="text-red-600">{error}</span>}
      </div>

      {/* ── Section 1: Enable / Disable (TTADV-01) ── */}
      <div className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Time Tracking</h2>
        <ToggleSwitch
          id="tt-enabled"
          checked={config.enabled}
          onChange={(v) => patch({ enabled: v })}
          label={config.enabled ? 'Enabled — time tracking is active' : 'Disabled — time tracking is off'}
        />
        {!config.enabled && (
          <p className="mt-3 text-xs text-zinc-500">
            When disabled, users cannot submit time entries and the Time tab is hidden.
          </p>
        )}
      </div>

      {/* ── Section 2: Capacity + Submission Schedule (TTADV-02) ── */}
      <div className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Capacity & Schedule</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="weekly-capacity" className={LABEL_CLASS}>
              Weekly Capacity (hours)
            </label>
            <input
              id="weekly-capacity"
              type="number"
              min={1}
              max={168}
              step={0.5}
              value={config.weekly_capacity_hours}
              onChange={(e) =>
                setConfig((c) => c ? { ...c, weekly_capacity_hours: e.target.value } : c)
              }
              onBlur={() => patch({ weekly_capacity_hours: config.weekly_capacity_hours })}
              className={`${INPUT_CLASS} max-w-[120px]`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Working Days</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_DAYS.map((day, i) => (
                <label
                  key={day}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={config.working_days.includes(day)}
                    onChange={() => toggleWorkingDay(day)}
                    className="cursor-pointer"
                  />
                  {ALL_DAY_NAMES[i]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="due-day" className={LABEL_CLASS}>
                Submission Due Day
              </label>
              <select
                id="due-day"
                value={config.submission_due_day}
                onChange={(e) => patch({ submission_due_day: e.target.value })}
                className={INPUT_CLASS}
              >
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="due-time" className={LABEL_CLASS}>
                Due Time (24h)
              </label>
              <input
                id="due-time"
                type="time"
                value={config.submission_due_time}
                onChange={(e) =>
                  setConfig((c) => c ? { ...c, submission_due_time: e.target.value } : c)
                }
                onBlur={() => patch({ submission_due_time: config.submission_due_time })}
                className={`${INPUT_CLASS} max-w-[140px]`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reminder-days" className={LABEL_CLASS}>
              Reminder (days before due date)
            </label>
            <input
              id="reminder-days"
              type="number"
              min={0}
              max={7}
              value={config.reminder_days_before}
              onChange={(e) =>
                setConfig((c) => c ? { ...c, reminder_days_before: parseInt(e.target.value, 10) || 0 } : c)
              }
              onBlur={() => patch({ reminder_days_before: config.reminder_days_before })}
              className={`${INPUT_CLASS} max-w-[120px]`}
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Categories (TTADV-03) ── */}
      <div className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Time Entry Categories</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Categories available to users when logging time entries.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {config.categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-800 text-sm rounded-full"
            >
              {cat}
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="text-zinc-400 hover:text-zinc-700 focus:outline-none leading-none"
                aria-label={`Remove ${cat}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="New category name"
            className={`${INPUT_CLASS} max-w-xs`}
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCategory.trim()}
            className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Section 4: Project Restrictions (TTADV-04) ── */}
      <div className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Project Restrictions</h2>

        <div className="space-y-4">
          <ToggleSwitch
            id="restrict-assigned"
            checked={config.restrict_to_assigned}
            onChange={(v) => patch({ restrict_to_assigned: v })}
            label="Restrict users to projects they are assigned to"
          />
          <ToggleSwitch
            id="active-only"
            checked={config.active_projects_only}
            onChange={(v) => patch({ active_projects_only: v })}
            label="Show active projects only (exclude archived and closed)"
          />
        </div>
      </div>

      {/* ── Section 5: Exempt Users (TTADV-05) ── */}
      <div className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Exempt Users</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Users listed here are not required to submit weekly time entries. Enter email addresses or usernames.
        </p>

        {config.exempt_users.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {config.exempt_users.map((user) => (
              <span
                key={user}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-full"
              >
                {user}
                <button
                  type="button"
                  onClick={() => removeExemptUser(user)}
                  className="text-amber-400 hover:text-amber-700 focus:outline-none leading-none"
                  aria-label={`Remove ${user}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {config.exempt_users.length === 0 && (
          <p className="text-xs text-zinc-400 mb-3">No exempt users configured.</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newExemptUser}
            onChange={(e) => setNewExemptUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExemptUser()}
            placeholder="user@example.com or username"
            className={`${INPUT_CLASS} max-w-xs`}
          />
          <button
            type="button"
            onClick={addExemptUser}
            disabled={!newExemptUser.trim()}
            className="px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Section 6: Locking (TTADV-06) ── */}
      <div className={SECTION_CLASS}>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Entry Locking</h2>
        <ToggleSwitch
          id="lock-after-approval"
          checked={config.lock_after_approval}
          onChange={(v) => patch({ lock_after_approval: v })}
          label="Lock time entries after approval (prevents edits)"
        />
        <p className="mt-3 text-xs text-zinc-500">
          When enabled, approved entries are permanently locked. Managers can unlock individual
          entries if corrections are needed.
        </p>
      </div>
    </div>
  );
}
