/**
 * schema-v2.test.ts — Wave 0 RED scaffold for Phase 17
 *
 * Asserts that all 10 new Drizzle table exports and 5 new enum exports
 * are present in db/schema.ts.
 *
 * These tests MUST fail RED until Wave 1 (plan 17-02) adds the exports.
 */

import { describe, it, expect } from 'vitest';

import {
  // New table exports
  discoveryItems,
  auditLog,
  businessOutcomes,
  e2eWorkflows,
  workflowSteps,
  focusAreas,
  architectureIntegrations,
  beforeState,
  teamOnboardingStatus,
  scheduledJobs,
  // New enum exports
  discoveryItemStatusEnum,
  ingestionStatusEnum,
  jobRunOutcomeEnum,
  deliveryStatusEnum,
  integrationTrackStatusEnum,
} from '../db/schema';

// ─── New table exports ────────────────────────────────────────────────────────

describe('New table exports', () => {
  it('discoveryItems table must be exported from schema.ts', () => {
    expect(discoveryItems, 'discoveryItems table must be exported from schema.ts').toBeDefined();
  });

  it('auditLog table must be exported from schema.ts', () => {
    expect(auditLog, 'auditLog table must be exported from schema.ts').toBeDefined();
  });

  it('businessOutcomes table must be exported from schema.ts', () => {
    expect(businessOutcomes, 'businessOutcomes table must be exported from schema.ts').toBeDefined();
  });

  it('e2eWorkflows table must be exported from schema.ts', () => {
    expect(e2eWorkflows, 'e2eWorkflows table must be exported from schema.ts').toBeDefined();
  });

  it('workflowSteps table must be exported from schema.ts', () => {
    expect(workflowSteps, 'workflowSteps table must be exported from schema.ts').toBeDefined();
  });

  it('focusAreas table must be exported from schema.ts', () => {
    expect(focusAreas, 'focusAreas table must be exported from schema.ts').toBeDefined();
  });

  it('architectureIntegrations table must be exported from schema.ts', () => {
    expect(architectureIntegrations, 'architectureIntegrations table must be exported from schema.ts').toBeDefined();
  });

  it('beforeState table must be exported from schema.ts', () => {
    expect(beforeState, 'beforeState table must be exported from schema.ts').toBeDefined();
  });

  it('teamOnboardingStatus table must be exported from schema.ts', () => {
    expect(teamOnboardingStatus, 'teamOnboardingStatus table must be exported from schema.ts').toBeDefined();
  });

  it('scheduledJobs table must be exported from schema.ts', () => {
    expect(scheduledJobs, 'scheduledJobs table must be exported from schema.ts').toBeDefined();
  });
});

// ─── New enum exports ─────────────────────────────────────────────────────────

describe('New enum exports', () => {
  it('discoveryItemStatusEnum must be exported from schema.ts', () => {
    expect(discoveryItemStatusEnum, 'discoveryItemStatusEnum must be exported from schema.ts').toBeDefined();
  });

  it('ingestionStatusEnum must be exported from schema.ts', () => {
    expect(ingestionStatusEnum, 'ingestionStatusEnum must be exported from schema.ts').toBeDefined();
  });

  it('jobRunOutcomeEnum must be exported from schema.ts', () => {
    expect(jobRunOutcomeEnum, 'jobRunOutcomeEnum must be exported from schema.ts').toBeDefined();
  });

  it('deliveryStatusEnum must be exported from schema.ts', () => {
    expect(deliveryStatusEnum, 'deliveryStatusEnum must be exported from schema.ts').toBeDefined();
  });

  it('integrationTrackStatusEnum must be exported from schema.ts', () => {
    expect(integrationTrackStatusEnum, 'integrationTrackStatusEnum must be exported from schema.ts').toBeDefined();
  });
});
