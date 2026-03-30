/**
 * scheduler-utils.ts
 *
 * Utility functions for the Scheduler Enhanced feature (Phase 24).
 * Converts human-friendly frequency + options into BullMQ-compatible cron strings.
 *
 * BullMQ uses 6-field cron with seconds as the first field:
 *   0 <minute> <hour> <day-of-month> <month> <day-of-week>
 */

export type Frequency = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface FrequencyOptions {
  hour?: number;
  minute?: number;
  dayOfWeek?: number;   // 0-6 (Sunday-Saturday)
  dayOfMonth?: number;  // 1-31
  cron?: string;        // used when frequency === 'custom'
}

/**
 * Convert a frequency + options object to a BullMQ 6-field cron string.
 * Returns null for 'once' and 'biweekly' (handled separately via BullMQ every:ms).
 *
 * @example
 *   frequencyToCron('daily', { hour: 9, minute: 0 })    → '0 0 9 * * *'
 *   frequencyToCron('weekly', { hour: 9, minute: 30, dayOfWeek: 1 }) → '0 30 9 * * 1'
 *   frequencyToCron('monthly', { hour: 8, minute: 0, dayOfMonth: 1 }) → '0 0 8 1 * *'
 *   frequencyToCron('custom', { cron: '0 9 * * MON' }) → '0 9 * * MON'
 *   frequencyToCron('once', {})   → null
 *   frequencyToCron('biweekly', {}) → null
 */
export function frequencyToCron(
  frequency: Frequency,
  options: FrequencyOptions,
): string | null {
  const h = options.hour ?? 9;
  const m = options.minute ?? 0;

  switch (frequency) {
    case 'once':
    case 'biweekly':
      return null;

    case 'daily':
      // 6-field: second minute hour day-of-month month day-of-week
      return `0 ${m} ${h} * * *`;

    case 'weekly': {
      const dow = options.dayOfWeek ?? 1; // default Monday
      return `0 ${m} ${h} * * ${dow}`;
    }

    case 'monthly': {
      const dom = options.dayOfMonth ?? 1;
      return `0 ${m} ${h} ${dom} * *`;
    }

    case 'custom':
      // Pass through as-is — caller is responsible for cron format
      return options.cron ?? null;

    default:
      return null;
  }
}
