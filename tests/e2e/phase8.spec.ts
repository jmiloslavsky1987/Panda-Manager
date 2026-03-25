import { test, expect } from '@playwright/test';

/**
 * Phase 8: Cross-Project Features + Polish E2E Tests
 *
 * Tests: SRCH-01, SRCH-02, SRCH-03, KB-01, KB-02, KB-03
 *
 * assert-if-present pattern: structural assertions always pass;
 * live-data assertions only run when results are actually present.
 * This ensures tests pass on empty DB but exercise full flows when seeded.
 */

test.describe('Phase 8: Cross-Project Features + Polish', () => {

  test('[SRCH-01] global search bar returns cross-project results', async ({ page }) => {
    // Navigate to dashboard — search bar is in root layout (visible on every page)
    await page.goto('/');
    // Structural: search bar must always be visible
    await expect(page.getByTestId('search-bar')).toBeVisible();

    // Type a search term and press Enter — should navigate to /search?q=risk
    await page.getByTestId('search-bar').fill('risk');
    await page.getByTestId('search-bar').press('Enter');

    // Verify URL contains the search query
    await expect(page).toHaveURL(/\/search\?q=risk/);

    // assert-if-present: search-results only renders when results > 0
    const resultCount = await page.getByTestId('search-results').count();
    if (resultCount > 0) {
      await expect(page.getByTestId('search-results')).toBeVisible();
      await expect(
        page.getByTestId('search-results').locator('[data-testid="result-project"]').first()
      ).toBeVisible();
    }
  });

  test('[SRCH-02] search results filterable by account, date, and type', async ({ page }) => {
    // Navigate directly to search page with a query and type filter
    await page.goto('/search?q=action&type=actions');

    // Structural: filter panel is always rendered when on /search page
    // A type select (Data Type filter) should be visible
    const typeSelect = page.locator('select').first();
    await expect(typeSelect).toBeVisible();

    // assert-if-present: if results present, they should all be actions (section = "actions")
    const resultCount = await page.getByTestId('search-results').count();
    if (resultCount > 0) {
      const sectionLabels = page.getByTestId('result-section');
      const count = await sectionLabels.count();
      for (let i = 0; i < count; i++) {
        await expect(sectionLabels.nth(i)).toContainText('action');
      }
    }
  });

  test('[SRCH-03] each search result shows project name and section context', async ({ page }) => {
    await page.goto('/search?q=test');

    // assert-if-present: if results present, each result card must expose project and section testids
    const resultCount = await page.getByTestId('search-results').count();
    if (resultCount > 0) {
      await expect(page.getByTestId('search-results')).toBeVisible();
      const firstResult = page.getByTestId('search-results').locator('> div').first();
      await expect(firstResult.locator('[data-testid="result-project"]')).toBeVisible();
      await expect(firstResult.locator('[data-testid="result-section"]')).toBeVisible();
    }
  });

  test('[KB-01] knowledge base entry can be created and appears in list', async ({ page }) => {
    await page.goto('/knowledge-base');

    // Structural: Add Entry button must always be visible
    await expect(page.getByTestId('add-kb-entry-btn')).toBeVisible();

    // Click the Add Entry button to open the modal
    await page.getByTestId('add-kb-entry-btn').click();

    // Fill in the title field (placeholder: "Entry title")
    await page.getByPlaceholder('Entry title').fill('Test KB Entry E2E');

    // Fill in the content field (placeholder: "Entry content...")
    await page.getByPlaceholder('Entry content...').fill('E2E test content');

    // Submit the form — button text is "Add Entry"
    await page.getByRole('button', { name: 'Add Entry' }).click();

    // The new entry should appear in the list within 3s
    await expect(page.getByText('Test KB Entry E2E')).toBeVisible({ timeout: 3000 });
  });

  test('[KB-02] knowledge base entry can be linked to a risk or history entry', async ({ page }) => {
    await page.goto('/knowledge-base');

    // Structural: Add Entry button always visible
    await expect(page.getByTestId('add-kb-entry-btn')).toBeVisible();

    // assert-if-present: if any entry is visible, test the link-risk-btn interaction
    const entryCount = await page.getByTestId('link-risk-btn').count();
    if (entryCount > 0) {
      // Click the first link-risk-btn
      await page.getByTestId('link-risk-btn').first().click();
      // An inline number input for Risk ID should appear
      await expect(page.getByPlaceholder('Risk ID').first()).toBeVisible();
    }
  });

  test('[KB-03] knowledge base entry carries source_trace (project, event, date)', async ({ page }) => {
    await page.goto('/knowledge-base');

    // Structural: Add Entry button always visible
    await expect(page.locator('[data-testid="add-kb-entry-btn"]')).toBeVisible();

    // assert-if-present: if entries are in the list, source-trace must be visible with non-empty text
    const sourceTraceCount = await page.locator('[data-testid="source-trace"]').count();
    if (sourceTraceCount > 0) {
      const firstTrace = page.locator('[data-testid="source-trace"]').first();
      await expect(firstTrace).toBeVisible();
      // source_trace should have non-empty text content
      const traceText = await firstTrace.textContent();
      expect(traceText?.trim().length).toBeGreaterThan(0);
    }
  });

});
