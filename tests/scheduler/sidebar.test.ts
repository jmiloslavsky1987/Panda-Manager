import { describe, it, expect, vi } from 'vitest';

// Sidebar is a React Server Component; we test that the rendered output
// contains the scheduler navigation link.
// The Sidebar component will be created during implementation (Plan 24-03).

vi.mock('server-only', () => ({}));

// Mock next/link to avoid RSC resolution issues in node env
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown; [key: string]: unknown }) =>
    `<a href="${href}">${children}</a>`,
}));

import { SIDEBAR_NAV_ITEMS } from '../../lib/scheduler-skills';

describe('Sidebar scheduler link (SCHED-10)', () => {
  it("sidebar nav items include an entry with href='/scheduler'", () => {
    const schedulerItem = SIDEBAR_NAV_ITEMS.find(
      (item: { href: string }) => item.href === '/scheduler'
    );
    expect(schedulerItem).toBeDefined();
  });

  it("sidebar scheduler entry has data-testid='sidebar-scheduler-link'", () => {
    const schedulerItem = SIDEBAR_NAV_ITEMS.find(
      (item: { href: string }) => item.href === '/scheduler'
    );
    expect(schedulerItem).toBeDefined();
    expect((schedulerItem as { testId?: string }).testId).toBe('sidebar-scheduler-link');
  });
});
