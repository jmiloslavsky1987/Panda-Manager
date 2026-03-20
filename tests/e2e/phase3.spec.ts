import { test, expect } from '@playwright/test';

/**
 * Phase 3 E2E Test Stubs — Wave 0 (RED baseline)
 *
 * All tests are intentionally failing. They exist to establish the Nyquist baseline:
 * every Phase 3 user-observable behavior has a named test. Implementation plans
 * 03-02 through 03-07 will flip these tests GREEN.
 *
 * Use `npx playwright test tests/e2e/phase3.spec.ts --grep "WORK-02"` to run a
 * specific requirement's test during implementation.
 *
 * Base URL: http://localhost:3000 (configured in playwright.config.ts)
 *
 * Requirements covered: WORK-02, PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05,
 *                        PLAN-06, PLAN-07, PLAN-08, PLAN-09, PLAN-10, PLAN-11
 */

// ─────────────────────────────────────────────────────────────────────────────
// WORK-02: Action Editing with xlsx dual-write
// ─────────────────────────────────────────────────────────────────────────────

test.describe('WORK-02: Action Editing with xlsx dual-write', () => {
  test('WORK-02: Action edit modal opens when clicking an action row', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/actions');
    await page.click('[data-testid="action-row"]');
    await expect(page.locator('[data-testid="action-edit-modal"]')).toBeVisible();
  });

  test('WORK-02: Saving action change reflects in the actions list', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/actions');
    await page.click('[data-testid="action-row"]');
    const modal = page.locator('[data-testid="action-edit-modal"]');
    await expect(modal).toBeVisible();
    // Change status to completed
    await modal.locator('[data-testid="status-select"]').selectOption('completed');
    await modal.getByRole('button', { name: /save/i }).click();
    // Modal closes and list updates
    await expect(modal).not.toBeVisible();
    await expect(page.locator('[data-testid="action-row"]').first().locator('[data-testid="action-status"]')).toContainText('completed');
  });

  test('WORK-02: Action save returns 200 and no error toast is shown', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    let patchStatus = 0;
    page.on('response', (res) => {
      if (res.url().includes('/api/actions/') && res.request().method() === 'PATCH') {
        patchStatus = res.status();
      }
    });

    await page.goto('/customer/1/actions');
    await page.click('[data-testid="action-row"]');
    const modal = page.locator('[data-testid="action-edit-modal"]');
    await modal.getByRole('button', { name: /save/i }).click();

    expect(patchStatus).toBe(200);
    await expect(page.locator('[data-testid="error-toast"]')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-01: Task Creation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-01: Task Creation', () => {
  test('PLAN-01: Create task modal opens from Plan Tasks page', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/tasks');
    await page.click('[data-testid="create-task-btn"]');
    await expect(page.locator('[data-testid="task-edit-modal"]')).toBeVisible();
  });

  test('PLAN-01: New task appears in task list after creation', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/tasks');
    await page.click('[data-testid="create-task-btn"]');
    const modal = page.locator('[data-testid="task-edit-modal"]');
    await expect(modal).toBeVisible();

    // Fill task form
    await modal.locator('[data-testid="task-title-input"]').fill('E2E Test Task');
    await modal.locator('[data-testid="task-owner-input"]').fill('Test Owner');
    await modal.locator('[data-testid="task-due-input"]').fill('2026-04-01');
    await modal.locator('[data-testid="task-priority-select"]').selectOption('high');
    await modal.getByRole('button', { name: /save/i }).click();

    // New task appears in list
    await expect(page.locator('[data-testid="task-list"]')).toContainText('E2E Test Task');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-02/03: Phase Board and Task Board
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-02/03: Phase Board and Task Board', () => {
  test('PLAN-02: Phase Board renders at /customer/1/plan/board', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/board');
    const board = page.locator('[data-testid="phase-board"]');
    await expect(board).toBeVisible();
    // At least one column
    await expect(board.locator('[data-testid="phase-column"]').first()).toBeVisible();
  });

  test('PLAN-03: Task Board renders at /customer/1/plan/tasks', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/tasks');
    const board = page.locator('[data-testid="task-board"]');
    await expect(board).toBeVisible();
    // Required columns
    await expect(board.getByText('To Do')).toBeVisible();
    await expect(board.getByText('In Progress')).toBeVisible();
    await expect(board.getByText('Blocked')).toBeVisible();
    await expect(board.getByText('Done')).toBeVisible();
  });

  test('PLAN-02: Dragging a card to a different phase column updates the task phase', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    let patchCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/tasks/') && req.method() === 'PATCH') {
        patchCalled = true;
      }
    });

    await page.goto('/customer/1/plan/board');
    const board = page.locator('[data-testid="phase-board"]');
    await expect(board).toBeVisible();

    const firstCard = board.locator('[data-testid="task-card"]').first();
    const secondColumn = board.locator('[data-testid="phase-column"]').nth(1);

    // Drag card to second column
    await firstCard.dragTo(secondColumn);

    expect(patchCalled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-04/PLAN-06: Gantt Timeline and Dependencies
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-04/PLAN-06: Gantt Timeline and Dependencies', () => {
  test('PLAN-04: Gantt tab renders at /customer/1/plan/gantt', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/gantt');
    const container = page.locator('[data-testid="gantt-container"]');
    await expect(container).toBeVisible();
    // Must contain an SVG element
    await expect(container.locator('svg').first()).toBeVisible();
  });

  test('PLAN-06: Task with blocked_by shows dependency arrow in Gantt', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/gantt');
    const container = page.locator('[data-testid="gantt-container"]');
    await expect(container).toBeVisible();
    // SVG should contain a dependency arrow when tasks have blocked_by set
    const arrow = container.locator('svg').locator('.dependency-arrow, .arrow').first();
    await expect(arrow).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-05: Swimlane View
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-05: Swimlane View', () => {
  test('PLAN-05: Swimlane view renders at /customer/1/plan/swimlane', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/swimlane');
    const swimlane = page.locator('[data-testid="swimlane-view"]');
    await expect(swimlane).toBeVisible();
    // At least one swim lane row
    await expect(swimlane.locator('[data-testid="swimlane-row"]').first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-07: Bulk Operations
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-07: Bulk Operations', () => {
  test('PLAN-07: Selecting multiple tasks enables bulk action toolbar', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/tasks');
    // Select two task checkboxes
    const checkboxes = page.locator('[data-testid="task-checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Bulk toolbar appears
    const toolbar = page.locator('[data-testid="bulk-toolbar"]');
    await expect(toolbar).toBeVisible();
    // At least one action button
    await expect(toolbar.getByRole('button').first()).toBeVisible();
  });

  test('PLAN-07: Bulk reassign owner applies to all selected tasks', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    let bulkPatchCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/tasks-bulk') && req.method() === 'PATCH') {
        bulkPatchCalled = true;
      }
    });

    await page.goto('/customer/1/plan/tasks');
    // Select 2 tasks
    const checkboxes = page.locator('[data-testid="task-checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Click reassign in bulk toolbar
    const toolbar = page.locator('[data-testid="bulk-toolbar"]');
    await toolbar.getByText('Reassign Owner').click();

    // Fill new owner
    const ownerInput = page.locator('[data-testid="bulk-owner-input"]');
    await ownerInput.fill('New Owner Name');
    await page.getByRole('button', { name: /confirm/i }).click();

    expect(bulkPatchCalled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-08: Task Templates
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-08: Task Templates', () => {
  test('PLAN-08: Template button opens template picker on Phase Board', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/board');
    await page.click('[data-testid="template-btn"]');
    await expect(page.locator('[data-testid="template-picker"]')).toBeVisible();
  });

  test('PLAN-08: Instantiating Biggy Activation template creates multiple tasks', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/board');
    await page.click('[data-testid="template-btn"]');

    const picker = page.locator('[data-testid="template-picker"]');
    await expect(picker).toBeVisible();

    // Click the Biggy Activation template
    await picker.getByText('Biggy Activation').click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Multiple task rows should now appear
    const taskList = page.locator('[data-testid="task-list"]');
    const taskCount = await taskList.locator('[data-testid="task-card"]').count();
    expect(taskCount).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-09: Progress Rollup
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-09: Progress Rollup', () => {
  test('PLAN-09: Completing a task updates workstream percent_complete', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    // Get initial progress value
    await page.goto('/customer/1/overview');
    const progressBar = page.locator('[data-testid="workstream-progress"]').first();
    await expect(progressBar).toBeVisible();
    const initialValue = await progressBar.getAttribute('aria-valuenow');

    // Mark a task as done via PATCH
    await page.request.patch('/api/tasks/1', {
      data: { status: 'done' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Navigate back to overview
    await page.goto('/customer/1/overview');
    const updatedValue = await page.locator('[data-testid="workstream-progress"]').first().getAttribute('aria-valuenow');

    // Progress should have changed
    expect(updatedValue).not.toBe(initialValue);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-10/11: Excel Import and Export
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PLAN-10/11: Excel Import and Export', () => {
  test('PLAN-10: Importing a KAISER-format xlsx populates tasks', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    // POST to import endpoint with test fixture
    const response = await page.request.post('/api/plan-import', {
      multipart: {
        projectId: '1',
        file: {
          name: 'test-plan.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: Buffer.from('placeholder'),
        },
      },
    });
    expect(response.status()).toBe(201);

    // Tasks should now appear in task list
    await page.goto('/customer/1/plan/tasks');
    await expect(page.locator('[data-testid="task-list"]').locator('[data-testid="task-card"]').first()).toBeVisible();
  });

  test('PLAN-11: Exporting plan produces a downloadable xlsx', async ({ page }) => {
    expect(false, 'stub — implement Phase 3').toBe(true);

    await page.goto('/customer/1/plan/board');

    // Listen for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-btn"]');
    const download = await downloadPromise;

    // Verify the download has the correct content type
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });
});
