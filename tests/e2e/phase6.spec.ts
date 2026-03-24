import { test, expect } from '@playwright/test';

/**
 * Phase 6: MCP Integrations E2E Tests
 *
 * Tests: DASH-04, DASH-05, SKILL-10, MCP Settings UI (4 total)
 *
 * Wave 0: All 4 tests are RED stubs. The expect(false, 'stub').toBe(true) stub
 * line is removed during implementation plans when the feature lands.
 *
 * Each test name contains its requirement ID for --grep targeting:
 *   npx playwright test tests/e2e/phase6.spec.ts --grep "DASH-04"
 *   npx playwright test tests/e2e/phase6.spec.ts --grep "SKILL-10"
 */

test.describe('Phase 6: MCP Integrations', () => {

  test('DASH-04: Risk Heat Map panel visible on Dashboard', async ({ page }) => {
    // Navigate to /, assert data-testid="risk-heat-map" exists
    await page.goto('/');
    await expect(page.locator('[data-testid="risk-heat-map"]')).toBeVisible();
  });

  test('DASH-05: Cross-Account Watch List panel visible on Dashboard', async ({ page }) => {
    // Navigate to /, assert data-testid="watch-list" exists
    await page.goto('/');
    await expect(page.locator('[data-testid="watch-list"]')).toBeVisible();
  });

  test('SKILL-10: Customer Project Tracker skill exists and is triggerable', async ({ page }) => {
    // Navigate to Skills tab for any project, assert skill-card[data-skill="customer-project-tracker"] exists
    await page.goto('/customer/1/skills');
    await expect(page.locator('[data-skill="customer-project-tracker"]')).toBeVisible();
  });

  test('MCP: Settings page has MCP Servers tab', async ({ page }) => {
    // Navigate to /settings, click "MCP Servers" tab, assert form is visible
    await page.goto('/settings');
    await page.getByRole('tab', { name: 'MCP Servers' }).click();
    await expect(page.locator('[data-testid="mcp-servers-form"]')).toBeVisible();
  });

});
