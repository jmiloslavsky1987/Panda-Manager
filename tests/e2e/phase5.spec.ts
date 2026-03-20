import { test, expect } from '@playwright/test';

test.describe('Phase 5: Skill Engine', () => {

  test('SKILL-01: Skills tab visible in workspace nav and Run button triggers job', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/customer/1/skills');
    await expect(page.getByRole('link', { name: 'Skills' })).toBeVisible();
    const runBtn = page.getByRole('button', { name: 'Run' }).first();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    // Expect navigation to run page
    await expect(page).toHaveURL(/\/skills\/\w+/);
  });

  test('SKILL-02: Token count logged before every Claude call', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    // Trigger a skill run via API and verify token count appears in response metadata
    const res = await page.request.post('/api/skills/weekly-customer-status/run', {
      data: { projectId: 1 }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.runId).toBeTruthy();
  });

  test('SKILL-03: Weekly Customer Status produces output; draft appears in Drafts Inbox', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/customer/1/skills');
    // Trigger weekly-customer-status
    const runBtn = page.locator('[data-skill="weekly-customer-status"] button[data-run]');
    await runBtn.click();
    await expect(page).toHaveURL(/\/skills\/\w+/);
    await expect(page.locator('[data-testid="skill-output"]')).toBeVisible({ timeout: 30000 });
    // Draft should appear in Drafts Inbox on Dashboard
    await page.goto('/');
    await expect(page.locator('[data-testid="drafts-inbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="draft-item"]').first()).toBeVisible();
  });

  test('SKILL-04: Meeting Summary skill run page shows streamed output', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    const res = await page.request.post('/api/skills/meeting-summary/run', {
      data: { projectId: 1, input: { transcript: 'Test meeting notes' } }
    });
    expect(res.ok()).toBeTruthy();
    const { runId } = await res.json();
    await page.goto(`/customer/1/skills/${runId}`);
    await expect(page.locator('[data-testid="skill-output"]')).toBeVisible({ timeout: 30000 });
  });

  test('SKILL-11: Morning Briefing skill produces DB-stored output visible on Dashboard', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    const res = await page.request.post('/api/skills/morning-briefing/run', {
      data: { projectId: 1 }
    });
    expect(res.ok()).toBeTruthy();
    await page.goto('/');
    await expect(page.locator('[data-testid="morning-briefing-panel"]')).toBeVisible();
  });

  test('SKILL-12: Context Updater skill run page shows streamed output', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    const res = await page.request.post('/api/skills/context-updater/run', {
      data: { projectId: 1, input: { transcript: 'Test update notes' } }
    });
    expect(res.ok()).toBeTruthy();
    const { runId } = await res.json();
    await page.goto(`/customer/1/skills/${runId}`);
    await expect(page.locator('[data-testid="skill-output"]')).toBeVisible({ timeout: 30000 });
  });

  test('SKILL-13: Handoff Doc Generator skill run page shows streamed output', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    const res = await page.request.post('/api/skills/handoff-doc-generator/run', {
      data: { projectId: 1 }
    });
    expect(res.ok()).toBeTruthy();
    const { runId } = await res.json();
    await page.goto(`/customer/1/skills/${runId}`);
    await expect(page.locator('[data-testid="skill-output"]')).toBeVisible({ timeout: 30000 });
  });

  test('SKILL-14: Missing SKILL.md shows error badge; changing file takes effect on next run', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/customer/1/skills');
    // A skill with no SKILL.md on disk should render error badge
    await expect(page.locator('[data-testid="skill-missing-badge"]')).toBeVisible();
  });

  test('DASH-09: Drafts Inbox section visible on Dashboard', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/');
    await expect(page.locator('[data-testid="drafts-inbox"]')).toBeVisible();
    // If no drafts: shows "No pending drafts"
    const hasDrafts = await page.locator('[data-testid="draft-item"]').count() > 0;
    if (!hasDrafts) {
      await expect(page.getByText('No pending drafts')).toBeVisible();
    }
  });

  test('OUT-01: Completed skill run appears in Output Library', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/outputs');
    await expect(page.locator('[data-testid="output-library"]')).toBeVisible();
  });

  test('OUT-02: Output Library filters by account, skill type, date range', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/outputs');
    await expect(page.locator('[data-testid="filter-account"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-skill-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-date-range"]')).toBeVisible();
  });

  test('OUT-03: HTML output renders in iframe; non-HTML shows Open button', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/outputs');
    // If an HTML output exists, iframe should be present
    const htmlOutput = page.locator('[data-output-type="html"]').first();
    const count = await htmlOutput.count();
    if (count > 0) {
      await htmlOutput.click();
      await expect(page.locator('iframe[sandbox]')).toBeVisible();
    }
  });

  test('OUT-04: Regenerate button creates new output and archives old one', async ({ page }) => {
    expect(false, 'stub').toBe(true);
    await page.goto('/outputs');
    const regenBtn = page.locator('[data-testid="regenerate-btn"]').first();
    const count = await regenBtn.count();
    if (count > 0) {
      await regenBtn.click();
      await expect(page.locator('[data-testid="output-archived-badge"]')).toBeVisible({ timeout: 15000 });
    }
  });

});
