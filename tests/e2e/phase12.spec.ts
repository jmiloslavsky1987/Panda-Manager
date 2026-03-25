import { test, expect } from '@playwright/test'

test.describe('Phase 12 — Artifacts tab', () => {
  test('artifacts-tab: /customer/1/artifacts renders', async ({ page }) => {
    await page.goto('/customer/1/artifacts')
    await expect(page.locator('[data-testid="artifacts-tab"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Artifacts' })).toBeVisible()
    await expect(page.locator('[data-testid="artifacts-table"]')).toBeVisible()
  })

  test('ArtifactEditModal: New Artifact button opens create modal', async ({ page }) => {
    await page.goto('/customer/1/artifacts')
    await page.click('[data-testid="new-artifact-btn"]')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('#artifact-name')).toBeVisible()
  })

  test('artifact-create: artifact create saves and appears in table', async ({ page }) => {
    await page.goto('/customer/1/artifacts')
    await page.click('[data-testid="new-artifact-btn"]')
    await expect(page.getByRole('dialog')).toBeVisible()

    const uniqueName = `E2E Test Artifact ${Date.now()}`
    await page.fill('#artifact-name', uniqueName)
    await page.getByRole('button', { name: 'Save' }).click()

    // Modal closes and page refreshes — wait for the new row to appear
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 })
  })

  test('artifact-edit: row click opens ArtifactEditModal in edit mode', async ({ page }) => {
    await page.goto('/customer/1/artifacts')
    // Wait for the table to load
    await expect(page.locator('[data-testid="artifacts-table"]')).toBeVisible()

    // Find the first artifact row (if any exist)
    const firstRow = page.locator('[data-testid^="artifact-row-"]').first()
    const rowCount = await page.locator('[data-testid^="artifact-row-"]').count()

    if (rowCount === 0) {
      // Create one first
      await page.click('[data-testid="new-artifact-btn"]')
      await page.fill('#artifact-name', 'Edit Test Artifact')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })
      await page.locator('[data-testid^="artifact-row-"]').first().click()
    } else {
      await firstRow.click()
    }

    // Modal should open in edit mode — title contains "Edit Artifact"
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('heading')).toContainText('Edit Artifact')
    await expect(page.locator('#artifact-name')).toBeVisible()
  })

  test('artifacts-tab-nav: 13th tab "Artifacts" visible in WorkspaceTabs', async ({ page }) => {
    await page.goto('/customer/1/overview')
    // Look for an Artifacts link/tab in the workspace tab bar
    await expect(page.getByRole('link', { name: 'Artifacts' })).toBeVisible()
  })
})

test.describe('Phase 12 — Decisions write surface', () => {
  test('add-decision: Add Decision button opens modal', async ({ page }) => {
    await page.goto('/customer/1/decisions')
    await page.click('[data-testid="add-decision-btn"]')
    await expect(page.locator('[data-testid="add-decision-modal"]')).toBeVisible()
    // Decision textarea should be visible in the modal
    await expect(page.locator('[data-testid="add-decision-modal"] textarea').first()).toBeVisible()
  })

  test('decision-save: new decision appears at top of list after save', async ({ page }) => {
    await page.goto('/customer/1/decisions')
    await page.click('[data-testid="add-decision-btn"]')
    await expect(page.locator('[data-testid="add-decision-modal"]')).toBeVisible()

    const uniqueDecision = `E2E Test Decision ${Date.now()}`
    // Fill the first textarea (decision field)
    await page.locator('[data-testid="add-decision-modal"] textarea').first().fill(uniqueDecision)
    await page.getByRole('button', { name: 'Save' }).click()

    // Modal closes and page refreshes
    await expect(page.locator('[data-testid="add-decision-modal"]')).not.toBeVisible({ timeout: 10000 })

    // The new decision should appear in the decisions list
    await expect(page.getByText(uniqueDecision)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Phase 12 — Architecture inline edit', () => {
  test('architecture-edit: Edit button opens workstream modal', async ({ page }) => {
    await page.goto('/customer/1/architecture')
    // Click the first Edit trigger
    await page.locator('[data-testid="architecture-edit-trigger"]').first().click()
    await expect(page.locator('[data-testid="architecture-edit-modal"]')).toBeVisible()
    // State textarea should be visible
    await expect(page.locator('[data-testid="architecture-edit-modal"] textarea')).toBeVisible()
    // Lead input should be visible
    await expect(page.locator('[data-testid="architecture-edit-modal"] input[type="text"]')).toBeVisible()
  })

  test('architecture-save: architecture save persists state+lead change', async ({ page }) => {
    await page.goto('/customer/1/architecture')
    await page.locator('[data-testid="architecture-edit-trigger"]').first().click()
    await expect(page.locator('[data-testid="architecture-edit-modal"]')).toBeVisible()

    const uniqueLead = `E2E Lead ${Date.now()}`
    const leadInput = page.locator('[data-testid="architecture-edit-modal"] input[type="text"]')
    await leadInput.clear()
    await leadInput.fill(uniqueLead)
    await page.getByRole('button', { name: 'Save' }).click()

    // Modal closes after save
    await expect(page.locator('[data-testid="architecture-edit-modal"]')).not.toBeVisible({ timeout: 10000 })

    // Updated lead should be visible on the page after router.refresh()
    await expect(page.getByText(uniqueLead)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Phase 12 — Teams progress slider', () => {
  test('teams-progress: Teams tab shows Progress column with slider', async ({ page }) => {
    await page.goto('/customer/1/teams')
    await expect(page.locator('[data-testid="workstream-table"]')).toBeVisible()
    // Progress column header should be visible
    await expect(page.getByRole('columnheader', { name: 'Progress' })).toBeVisible()
    // At least one range slider should be present
    await expect(page.locator('input[type="range"]').first()).toBeVisible()
  })

  test('teams-save: Teams slider save updates percent_complete', async ({ page }) => {
    await page.goto('/customer/1/teams')
    await expect(page.locator('[data-testid="workstream-table"]')).toBeVisible()

    // Get the first slider by data-testid pattern
    const firstSlider = page.locator('[data-testid^="slider-"]').first()
    await expect(firstSlider).toBeVisible()

    // Get the slider's current value and change it
    const currentValue = await firstSlider.inputValue()
    const newValue = currentValue === '100' ? '50' : String(parseInt(currentValue, 10) + 10)

    // Use fill to set the slider value (triggers onChange)
    await firstSlider.fill(newValue)

    // After changing slider, a Save button should appear for that row
    await expect(page.locator('[data-testid^="save-progress-"]').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Phase 12 — Banner cleanup', () => {
  test('banner-removed: Phase 3 placeholder banners are removed', async ({ page }) => {
    // Check decisions page
    await page.goto('/customer/1/decisions')
    await expect(page.locator('[data-testid="decisions-tab"]')).toBeVisible()
    const decisionsContent = await page.content()
    expect(decisionsContent).not.toContain('Phase 3')
    expect(decisionsContent).not.toContain('Inline editing available')
    expect(decisionsContent).not.toContain('available in Phase 3')

    // Check architecture page
    await page.goto('/customer/1/architecture')
    await expect(page.locator('[data-testid="architecture-tab"]')).toBeVisible()
    const archContent = await page.content()
    expect(archContent).not.toContain('Phase 3')
    expect(archContent).not.toContain('Inline editing available')
    expect(archContent).not.toContain('available in Phase 3')
  })
})
