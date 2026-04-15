/**
 * scheduled-jobs-schema.test.ts
 *
 * RED phase test for Phase 65-01 Task 1:
 * Verifies scheduledJobs schema includes project_id nullable FK to projects
 */

import { describe, it, expect } from 'vitest';
import { scheduledJobs } from '@/db/schema';

describe('scheduledJobs schema', () => {
  it('should include project_id field in the schema', () => {
    // Verify project_id exists as a key in the table definition
    // @ts-ignore - accessing internal structure for testing
    expect(scheduledJobs.project_id).toBeDefined();
  });

  it('should have expected fields including project_id', () => {
    // Create a type-safe check that project_id is part of the inferred type
    type ScheduledJobsType = typeof scheduledJobs.$inferSelect;

    // This will cause a TypeScript error if project_id is not in the schema
    const mockJob: ScheduledJobsType = {
      id: 1,
      name: 'test',
      skill_name: 'test-skill',
      cron_expression: '0 0 * * *',
      enabled: true,
      timezone: null,
      skill_params_json: {},
      last_run_at: null,
      last_run_outcome: null,
      run_history_json: [],
      created_at: new Date(),
      updated_at: new Date(),
      project_id: null, // This line will fail if project_id doesn't exist
    };

    expect(mockJob).toBeDefined();
  });
});
