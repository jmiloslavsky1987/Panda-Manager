// tests/auth/setup-guard.test.ts
// GREEN — AUTH-01: /setup redirects to /login when users exist
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so the mock factories can reference these without hoisting issues
const { mockRedirect, mockDbSelect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
  mockDbSelect: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        limit: mockDbSelect,
      }),
    }),
  },
}));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/components/SetupForm', () => ({
  SetupForm: () => null,
}));

import SetupPage from '@/app/setup/page';

describe('SetupPage guard — AUTH-01', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Create Admin Account" form when users table has 0 rows', async () => {
    // Mock DB to return empty users array (no users exist)
    mockDbSelect.mockResolvedValueOnce([]);

    // SetupPage is an async server component — call it directly
    const result = await SetupPage();

    // redirect should NOT have been called
    expect(mockRedirect).not.toHaveBeenCalled();
    // The page should render (return JSX, not null/undefined)
    expect(result).toBeDefined();
  });

  it('calls redirect("/login") when users table has 1+ rows', async () => {
    // Mock DB to return 1 existing user
    mockDbSelect.mockResolvedValueOnce([{ id: 'user-1' }]);

    // Simulate redirect throwing (Next.js redirect() throws internally)
    mockRedirect.mockImplementationOnce((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });

    await expect(SetupPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
