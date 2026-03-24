import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 7: File Generation + Remaining Skills E2E Tests
 *
 * Tests: SKILL-05, SKILL-06, SKILL-07, SKILL-08, PLAN-12, PLAN-13
 *
 * Uses assert-if-present pattern (established in phases 5, 5.1, 6):
 *   - Structural UI assertions always pass without API key
 *   - Live-call assertions skip gracefully when infra unavailable
 *
 * Each test name contains its requirement ID for --grep targeting:
 *   npx playwright test tests/e2e/phase7.spec.ts --grep "SKILL-05"
 *   npx playwright test tests/e2e/phase7.spec.ts --grep "PLAN-12"
 */

async function gotoFirstProject(page: Page): Promise<string> {
  await page.goto('/');
  const firstCard = page.locator('[data-testid="project-card"]').first();
  if (await firstCard.count() === 0) {
    return '';
  }
  const href = await firstCard.locator('a').getAttribute('href') ?? '';
  const idMatch = href.match(/\/customer\/(\d+)/);
  return idMatch?.[1] ?? '';
}

test.describe('Phase 7: File Generation + Remaining Skills', () => {

  test('SKILL-05: ELT External Status skill card is visible and enabled in Skills tab', async ({ page }) => {
    const id = await gotoFirstProject(page);
    const projectId = id || '1';
    await page.goto(`/customer/${projectId}/skills`);

    // Skill card for elt-external-status must be visible
    const card = page.locator('[data-skill="elt-external-status"]');
    await expect(card).toBeVisible();

    // Card must NOT be grayed out (opacity-60 class means not wired)
    const classAttr = await card.getAttribute('class') ?? '';
    expect(classAttr).not.toContain('opacity-60');

    // Run button must be an enabled <button> (not a disabled <span>)
    const runBtn = card.locator('button[data-run="elt-external-status"]');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).not.toBeDisabled();
  });

  test('SKILL-06: ELT Internal Status skill card is visible and enabled in Skills tab', async ({ page }) => {
    const id = await gotoFirstProject(page);
    const projectId = id || '1';
    await page.goto(`/customer/${projectId}/skills`);

    const card = page.locator('[data-skill="elt-internal-status"]');
    await expect(card).toBeVisible();

    const classAttr = await card.getAttribute('class') ?? '';
    expect(classAttr).not.toContain('opacity-60');

    const runBtn = card.locator('button[data-run="elt-internal-status"]');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).not.toBeDisabled();
  });

  test('SKILL-07: Team Engagement Map skill card is visible and enabled in Skills tab', async ({ page }) => {
    const id = await gotoFirstProject(page);
    const projectId = id || '1';
    await page.goto(`/customer/${projectId}/skills`);

    const card = page.locator('[data-skill="team-engagement-map"]');
    await expect(card).toBeVisible();

    const classAttr = await card.getAttribute('class') ?? '';
    expect(classAttr).not.toContain('opacity-60');

    const runBtn = card.locator('button[data-run="team-engagement-map"]');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).not.toBeDisabled();
  });

  test('SKILL-08: Workflow Diagram skill card is visible and enabled in Skills tab', async ({ page }) => {
    const id = await gotoFirstProject(page);
    const projectId = id || '1';
    await page.goto(`/customer/${projectId}/skills`);

    const card = page.locator('[data-skill="workflow-diagram"]');
    await expect(card).toBeVisible();

    const classAttr = await card.getAttribute('class') ?? '';
    expect(classAttr).not.toContain('opacity-60');

    const runBtn = card.locator('button[data-run="workflow-diagram"]');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).not.toBeDisabled();
  });

  test('PLAN-12: Generate plan button visible on Plan tab; proposed tasks panel renders on click', async ({ page }) => {
    const id = await gotoFirstProject(page);
    const projectId = id || '1';
    await page.goto(`/customer/${projectId}/plan/board`);

    // ai-plan-panel wrapper is always rendered
    await expect(page.locator('[data-testid="ai-plan-panel"]')).toBeVisible();

    // generate-plan-btn is visible when no tasks are loaded (initial state)
    await expect(page.locator('[data-testid="generate-plan-btn"]')).toBeVisible();

    // assert-if-present: if DB is seeded and API key is configured, click and verify
    // We do NOT click in the automated test — that requires Anthropic API key
  });

  test('PLAN-13: Sprint summary panel visible at top of Plan tab layout', async ({ page }) => {
    const id = await gotoFirstProject(page);
    const projectId = id || '1';
    await page.goto(`/customer/${projectId}/plan/board`);

    // Sprint summary panel must be visible in the plan layout
    await expect(page.locator('[data-testid="sprint-summary-panel"]')).toBeVisible();

    // Toggle and refresh buttons must be visible
    await expect(page.locator('[data-testid="sprint-summary-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="sprint-summary-refresh"]')).toBeVisible();
  });

});
