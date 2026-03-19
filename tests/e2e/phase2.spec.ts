import { test, expect } from '@playwright/test';

/**
 * Phase 2 E2E Test Stubs — Wave 0 (RED baseline)
 *
 * All tests are intentionally failing. They exist to establish the Nyquist baseline:
 * every Phase 2 user-observable behavior has a named test. Implementation plans
 * 02-02 through 02-07 will flip these tests GREEN.
 *
 * Use `npx playwright test tests/e2e/phase2.spec.ts --grep "DASH-01"` to run a
 * specific requirement's test during implementation.
 *
 * Base URL: http://localhost:3000 (configured in playwright.config.ts)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('DASH-02/03: health cards render for all active projects', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('[data-testid="health-card"]');
    const count = await cards.count();
    expect(count, 'Expected at least one health card').toBeGreaterThanOrEqual(1);
    // Each card should have a RAG badge
    await expect(cards.first().locator('[data-testid="rag-badge"]')).toBeVisible();
  });

  test('DASH-01: Today Briefing panel is visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="briefing-panel"]')).toBeVisible();
  });

  test('DASH-06: Recent Activity Feed shows entries', async ({ page }) => {
    await page.goto('/');

    const feed = page.locator('[data-testid="activity-feed"]');
    await expect(feed).toBeVisible();
    // At least one row present
    await expect(feed.locator('> *').first()).toBeVisible();
  });

  test('DASH-07: Quick Action Bar buttons are visible', async ({ page }) => {
    await page.goto('/');

    const bar = page.locator('[data-testid="quick-action-bar"]');
    await expect(bar).toBeVisible();
    await expect(bar.getByText('Run Tracker').first()).toBeVisible();
    await expect(bar.getByText('Generate Briefing').first()).toBeVisible();
    await expect(bar.getByText('Weekly Status Draft').first()).toBeVisible();
  });

  test('DASH-08: Notification badge appears for overdue actions', async ({ page }) => {
    await page.goto('/');

    // Badge lives in the page content area (not a header element) in Phase 2
    await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workspace tabs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Workspace tabs', () => {
  test('WORK-01: Overview tab renders workstream progress and milestone timeline', async ({ page }) => {
    await page.goto('/customer/1/overview');

    await expect(page.locator('[data-testid="overview-tab"]')).toBeVisible();
  });

  test('WORK-03: Risks tab renders risk register', async ({ page }) => {
    await page.goto('/customer/1/risks');

    await expect(page.locator('[data-testid="risks-tab"]')).toBeVisible();
  });

  test('WORK-04: Milestones tab renders milestone tracker', async ({ page }) => {
    await page.goto('/customer/1/milestones');

    await expect(page.locator('[data-testid="milestones-tab"]')).toBeVisible();
  });

  test('WORK-05: Teams tab renders onboarding status table', async ({ page }) => {
    await page.goto('/customer/1/teams');

    await expect(page.locator('[data-testid="teams-tab"]')).toBeVisible();
  });

  test('WORK-06: Architecture tab renders architecture state', async ({ page }) => {
    await page.goto('/customer/1/architecture');

    await expect(page.locator('[data-testid="architecture-tab"]')).toBeVisible();
  });

  test('WORK-07: Decisions tab renders key decisions', async ({ page }) => {
    await page.goto('/customer/1/decisions');

    await expect(page.locator('[data-testid="decisions-tab"]')).toBeVisible();
  });

  test('WORK-08: Engagement History tab renders history entries', async ({ page }) => {
    await page.goto('/customer/1/history');

    await expect(page.locator('[data-testid="history-tab"]')).toBeVisible();
  });

  test('WORK-09: Stakeholders tab renders contacts roster', async ({ page }) => {
    await page.goto('/customer/1/stakeholders');

    await expect(page.locator('[data-testid="stakeholders-tab"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Add Notes modal
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Add Notes modal', () => {
  test('DASH engagement: Add Notes modal opens and accepts input', async ({ page }) => {
    await page.goto('/customer/1/overview');

    // Open modal
    await page.click('[data-testid="add-notes-btn"]');
    // Modal should be visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    // Fill textarea
    await modal.locator('textarea').fill('Test note content from E2E spec');
    // Save
    await modal.getByRole('button', { name: /save/i }).click();
    // Modal should close
    await expect(modal).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// No console errors on tab load
// ─────────────────────────────────────────────────────────────────────────────

test.describe('No console errors on tab load', () => {
  const tabPaths = [
    '/customer/1/overview',
    '/customer/1/risks',
    '/customer/1/milestones',
    '/customer/1/teams',
    '/customer/1/architecture',
    '/customer/1/decisions',
    '/customer/1/history',
    '/customer/1/stakeholders',
    '/',
  ];

  for (const path of tabPaths) {
    test(`No console errors: ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      await page.goto(path);
      expect(errors, `Console errors found on ${path}: ${errors.join('; ')}`).toHaveLength(0);
    });
  }
});
