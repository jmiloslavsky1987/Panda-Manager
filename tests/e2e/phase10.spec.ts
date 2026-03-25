import { test, expect } from '@playwright/test';

// Wave 0 RED stubs — Phase 10 FTS Expansion + Code Polish
// These tests fail immediately until implementation plans (10-02+) activate them.
// Pattern: expect(false, 'stub').toBe(true) as FIRST assertion — visibly RED without server.
// Requirement IDs in test names enable --grep targeting by activation plans.

test('SRCH-01: searching for onboarding step owner returns result from onboarding_steps table', async ({ page }) => {
  expect(false, 'stub').toBe(true);
});

test('SRCH-01: searching for time entry description returns result from time_entries table', async ({ page }) => {
  expect(false, 'stub').toBe(true);
});

test('INT-UI-01: /skills/custom link is absent from skills tab', async ({ page }) => {
  expect(false, 'stub').toBe(true);
});
