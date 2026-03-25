import { test, expect } from '@playwright/test'

// Plan 01 — Skill launch buttons from contextual tabs (3 tests)

test.describe('History tab skill launch', () => {
  test('history tab has Generate Meeting Summary skill button and navigates to skills tab', async ({ page }) => {
    await page.goto('/customer/1/history')
    const btn = page.getByRole('link', { name: 'Generate Meeting Summary' })
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForURL('**/customer/1/skills')
    expect(page.url()).toContain('/customer/1/skills')
  })
})

test.describe('Stakeholders tab skill launch', () => {
  test('stakeholders tab has Create Handoff Doc skill button and navigates to skills tab', async ({ page }) => {
    await page.goto('/customer/1/stakeholders')
    const btn = page.getByRole('link', { name: 'Create Handoff Doc' })
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForURL('**/customer/1/skills')
    expect(page.url()).toContain('/customer/1/skills')
  })
})

test.describe('Navigate to skills tab', () => {
  test('navigate to skills tab from contextual skill launch button', async ({ page }) => {
    // The skills tab is accessible from both history and stakeholders.
    // Navigate via the history tab button and confirm we land on the skills page.
    await page.goto('/customer/1/history')
    await page.getByRole('link', { name: 'Generate Meeting Summary' }).click()
    await page.waitForURL('**/customer/1/skills')
    // Skills page should have a visible heading
    await expect(page.getByRole('heading', { name: /skill/i }).or(page.locator('[data-testid="skills-tab"]'))).toBeVisible()
  })
})

// Plan 02 — Draft modal, search date filter, template browser (8 tests)

test.describe('Draft edit modal', () => {
  let draftId: number

  test.beforeEach(async ({ request }) => {
    // Create a pending draft fixture via API
    const res = await request.post('/api/drafts', {
      data: {
        draft_type: 'email',
        content: 'Test draft content for E2E fixture',
        subject: 'E2E Test Subject',
        recipient: 'test@example.com',
      },
    })
    const draft = await res.json()
    draftId = draft.id
  })

  test.afterEach(async ({ request }) => {
    // Clean up: dismiss the draft so it no longer appears as pending
    if (draftId) {
      await request.patch(`/api/drafts/${draftId}`, {
        data: { action: 'dismiss' },
      })
    }
  })

  test('clicking draft card opens draft modal dialog', async ({ page }) => {
    await page.goto('/')
    // Wait for the drafts inbox to load
    await expect(page.locator('[data-testid="drafts-inbox"]')).toBeVisible()
    // Click the first draft card
    const draftCard = page.locator('[data-testid="draft-item"]').first()
    await expect(draftCard).toBeVisible()
    await draftCard.click()
    // Modal dialog should appear
    await expect(page.locator('[data-testid="draft-edit-modal"]')).toBeVisible()
  })

  test('draft modal exposes subject content and recipient fields', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="drafts-inbox"]')).toBeVisible()
    await page.locator('[data-testid="draft-item"]').first().click()
    // Verify all three fields are visible
    await expect(page.locator('[data-testid="draft-subject-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="draft-recipient-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="draft-content-input"]')).toBeVisible()
  })

  test('draft save updates draft card content after modal edit', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="drafts-inbox"]')).toBeVisible()
    await page.locator('[data-testid="draft-item"]').first().click()
    // Edit the subject
    const subjectInput = page.locator('[data-testid="draft-subject-input"]')
    await subjectInput.fill('Updated E2E Subject')
    // Save
    await page.getByRole('button', { name: 'Save' }).click()
    // Modal should close
    await expect(page.locator('[data-testid="draft-edit-modal"]')).not.toBeVisible()
    // The updated subject should appear in the card
    await expect(page.locator('[data-testid="draft-item"]').first()).toContainText('Updated E2E Subject')
  })

  test('dismiss button inside draft modal dismisses the draft', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="drafts-inbox"]')).toBeVisible()
    // Wait for at least one draft card to appear (our fixture)
    await expect(page.locator('[data-testid="draft-item"]').first()).toBeVisible()
    // Count drafts before dismiss (after they are loaded)
    const cardsBefore = await page.locator('[data-testid="draft-item"]').count()
    // Click the first draft card to open the modal
    await page.locator('[data-testid="draft-item"]').first().click()
    // Click dismiss inside modal
    await page.locator('[data-testid="draft-dismiss-btn"]').click()
    // Modal should close
    await expect(page.locator('[data-testid="draft-edit-modal"]')).not.toBeVisible()
    // Draft should be removed from the list (one fewer card, or empty message)
    const cardsAfter = await page.locator('[data-testid="draft-item"]').count()
    expect(cardsAfter).toBeLessThan(cardsBefore)
    // Mark as cleaned up so afterEach skip
    draftId = 0
  })
})

test.describe('Search date filter', () => {
  test('search page has from and to date inputs for filtering', async ({ page }) => {
    await page.goto('/search')
    // Date filter inputs are inside the filter panel
    const fromInput = page.locator('input[type="date"]').first()
    const toInput = page.locator('input[type="date"]').nth(1)
    await expect(fromInput).toBeVisible()
    await expect(toInput).toBeVisible()
  })

  test('date filter with past to-date returns empty results set', async ({ page }) => {
    // Navigate with a query param so results load
    await page.goto('/search?q=a')
    // Wait for loading to complete
    await page.waitForTimeout(500)
    // Set the "To" date to a past date — should return no results
    const toInput = page.locator('input[type="date"]').nth(1)
    await toInput.fill('2020-01-01')
    // Wait for debounced search (300ms) + response
    await page.waitForTimeout(600)
    // Should show "No results" message or empty results
    const noResults = page.getByText(/No results for/i)
    const searchResults = page.locator('[data-testid="search-results"]')
    // Either no-results text is visible OR search-results is absent
    const hasNoResults = await noResults.isVisible()
    const hasResults = await searchResults.isVisible()
    expect(hasNoResults || !hasResults).toBe(true)
  })
})

test.describe('Template browser modal', () => {
  let templateId: number

  test.beforeEach(async ({ request }) => {
    // Create a template fixture
    const res = await request.post('/api/plan-templates', {
      data: {
        name: 'E2E Test Template',
        template_type: 'standard',
        data: JSON.stringify({
          tasks: [
            { title: 'Task A', status: 'todo' },
            { title: 'Task B', status: 'todo' },
          ],
        }),
      },
    })
    const template = await res.json()
    templateId = template.id
  })

  test.afterEach(async ({ request }) => {
    if (templateId) {
      await request.delete(`/api/plan-templates/${templateId}`)
    }
  })

  test('templates button in PhaseBoard opens modal dialog', async ({ page }) => {
    await page.goto('/customer/1/plan')
    // Wait for the phase board to render
    await expect(page.locator('[data-testid="phase-board"]')).toBeVisible()
    // Click the Templates button
    await page.locator('[data-testid="template-btn"]').click()
    // Dialog should open
    await expect(page.locator('[data-testid="template-picker"]')).toBeVisible()
  })

  test('template list shows template count and tasks in parentheses', async ({ page }) => {
    await page.goto('/customer/1/plan')
    await expect(page.locator('[data-testid="phase-board"]')).toBeVisible()
    await page.locator('[data-testid="template-btn"]').click()
    await expect(page.locator('[data-testid="template-picker"]')).toBeVisible()
    // Our fixture template "E2E Test Template" with 2 tasks should appear
    await expect(page.locator('[data-testid="template-picker"]')).toContainText('E2E Test Template')
    await expect(page.locator('[data-testid="template-picker"]')).toContainText('(2 tasks)')
  })
})
