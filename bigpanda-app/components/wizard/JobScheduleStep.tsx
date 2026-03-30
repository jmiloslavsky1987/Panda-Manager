'use client'

import type { Frequency } from '../../lib/scheduler-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobScheduleStepProps {
  frequency: Frequency
  hour: number
  minute: number
  dayOfWeek: number
  dayOfMonth: number
  customCron: string
  timezone: string
  onChange: (field: string, value: unknown) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
]

// Get all IANA timezones supported by the runtime
const TIMEZONES: string[] = (() => {
  try {
    // Intl.supportedValuesOf is widely supported in modern engines
    return (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone')
  } catch {
    // Fallback for environments that don't support Intl.supportedValuesOf
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo']
  }
})()

// ─── Component ────────────────────────────────────────────────────────────────

export function JobScheduleStep({
  frequency,
  hour,
  minute,
  dayOfWeek,
  dayOfMonth,
  customCron,
  timezone,
  onChange,
}: JobScheduleStepProps) {
  const showDayOfWeek = frequency === 'weekly' || frequency === 'biweekly'
  const showDayOfMonth = frequency === 'monthly'
  const showCustomCron = frequency === 'custom'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Set Schedule</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure how often this job should run and at what time.
        </p>
      </div>

      {/* Frequency */}
      <div className="space-y-1">
        <label htmlFor="job-frequency" className="block text-sm font-medium text-gray-700">
          Frequency
        </label>
        <select
          id="job-frequency"
          value={frequency}
          onChange={(e) => onChange('frequency', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="once">Once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom Cron</option>
        </select>
      </div>

      {/* Day of week (only for weekly / biweekly) */}
      {showDayOfWeek && (
        <div className="space-y-1">
          <label htmlFor="job-day-of-week" className="block text-sm font-medium text-gray-700">
            Day of Week
          </label>
          <select
            id="job-day-of-week"
            value={dayOfWeek}
            onChange={(e) => onChange('dayOfWeek', Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Day of month (only for monthly) */}
      {showDayOfMonth && (
        <div className="space-y-1">
          <label htmlFor="job-day-of-month" className="block text-sm font-medium text-gray-700">
            Day of Month
          </label>
          <select
            id="job-day-of-month"
            value={dayOfMonth}
            onChange={(e) => onChange('dayOfMonth', Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom cron input */}
      {showCustomCron && (
        <div className="space-y-1">
          <label htmlFor="job-custom-cron" className="block text-sm font-medium text-gray-700">
            Custom Cron Expression
          </label>
          <input
            id="job-custom-cron"
            type="text"
            value={customCron}
            onChange={(e) => onChange('customCron', e.target.value)}
            placeholder="e.g. 0 9 * * MON"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400">e.g. 0 9 * * MON (standard 5-field cron)</p>
        </div>
      )}

      {/* Time: hour + minute */}
      {!showCustomCron && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="job-hour" className="block text-sm font-medium text-gray-700">
              Hour
            </label>
            <select
              id="job-hour"
              value={hour}
              onChange={(e) => onChange('hour', Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="job-minute" className="block text-sm font-medium text-gray-700">
              Minute
            </label>
            <select
              id="job-minute"
              value={minute}
              onChange={(e) => onChange('minute', Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>
                  :{String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Timezone */}
      <div className="space-y-1">
        <label htmlFor="job-timezone" className="block text-sm font-medium text-gray-700">
          Timezone
        </label>
        <select
          id="job-timezone"
          value={timezone}
          onChange={(e) => onChange('timezone', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
