// bigpanda-app/worker/lock-ids.ts
/**
 * Advisory lock ID constants for pg_try_advisory_xact_lock.
 * Each job has a unique integer. These are stable — never reuse a retired ID.
 * Transaction-scoped variant (xact) auto-releases at transaction end — safe with connection pools.
 */
export const LOCK_IDS = {
  ACTION_SYNC:     1001,
  HEALTH_REFRESH:  1002,
  WEEKLY_BRIEFING: 1003,
  CONTEXT_UPDATER: 1004,
  GANTT_SNAPSHOT:  1005,
  RISK_MONITOR:    1006,
  SKILL_RUN:       1007,  // Added Phase 5
} as const;
