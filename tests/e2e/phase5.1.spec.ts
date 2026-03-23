import { test, expect } from '@playwright/test';

/**
 * Phase 5.1: Onboarding Dashboard E2E Tests
 *
 * Tests: OVER-01, OVER-02, OVER-03, OVER-04 (4 total)
 *
 * Pattern: assert-if-present (from 03-09 / 04-05 decisions) — structural
 * UI assertions are unconditional; DB-dependent assertions wrapped in
 * if(count > 0) guards.
 *
 * Wave 0: All 4 tests are RED stubs. The expect(false).toBe(true) stub
 * line is removed during implementation plans (02–05) when the feature lands.
 *
 * Full test pass requires: PostgreSQL running with onboarding_phases migration,
 * App server running. Structural assertions pass regardless.
 */

test.describe('Phase 5.1: Onboarding Dashboard', () => {

  test('OVER-01: Overview tab shows onboarding dashboard with progress ring and integration tracker', async ({ page }) => {
    await page.goto('/customer/1/overview');
    // Structural: always passes once implemented
    await expect(page.locator('[data-testid="onboarding-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-ring"]')).toBeVisible();
    await expect(page.locator('[data-testid="integration-tracker"]')).toBeVisible();
    // Assert-if-present: DB-dependent phase cards
    const phaseCount = await page.locator('[data-testid="phase-card"]').count();
    if (phaseCount > 0) {
      await expect(page.locator('[data-testid="phase-card"]').first()).toBeVisible();
    }
  });

  test('OVER-02: Step status badge is clickable and reflects updated status; notes field present', async ({ page }) => {
    await page.goto('/customer/1/overview');
    // Assert-if-present: DB-dependent — only test interaction when phase cards exist
    const phaseCount = await page.locator('[data-testid="phase-card"]').count();
    if (phaseCount > 0) {
      const firstBadge = page.locator('[data-testid="step-status-badge"]').first();
      const originalClass = await firstBadge.getAttribute('class');
      await firstBadge.click();
      // After click, badge class should reflect updated status
      const updatedClass = await firstBadge.getAttribute('class');
      expect(updatedClass).not.toBe(originalClass);
    }
    // Structural: notes field is always present once implemented
    await expect(page.locator('[data-testid="step-update-notes"]')).toBeVisible();
  });

  test('OVER-03: Integration tracker visible; integration cards show pipeline bar and notes', async ({ page }) => {
    await page.goto('/customer/1/overview');
    // Structural: integration tracker always visible once implemented
    await expect(page.locator('[data-testid="integration-tracker"]')).toBeVisible();
    // Assert-if-present: DB-dependent integration cards
    const integrationCount = await page.locator('[data-testid="integration-card"]').count();
    if (integrationCount > 0) {
      await expect(page.locator('[data-testid="integration-card"]').first().locator('[data-testid="pipeline-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="integration-card"]').first().locator('[data-testid="integration-notes"]')).toBeVisible();
    }
  });

  test('OVER-04: Step owner field is editable and YAML round-trip via yaml-export endpoint returns 200', async ({ page }) => {
    expect(false, 'stub: OVER-04 not yet implemented').toBe(true);
    await page.goto('/customer/1/overview');
    // Assert-if-present: DB-dependent — only test edit when phase cards exist
    const phaseCount = await page.locator('[data-testid="phase-card"]').count();
    if (phaseCount > 0) {
      // Locate first step owner field and update it
      const ownerField = page.locator('[data-testid="step-owner"]').first();
      await ownerField.fill('Test Owner');
      // POST to yaml-export endpoint to verify YAML write-back
      const res = await page.request.post('/api/yaml-export', {
        data: { projectId: 1 },
        timeout: 10000,
      });
      expect(res.status()).toBe(200);
    }
  });

});
