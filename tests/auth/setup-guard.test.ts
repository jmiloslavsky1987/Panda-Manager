// tests/auth/setup-guard.test.ts
// RED stub — AUTH-01: /setup redirects to /login when users exist
// These tests will turn GREEN when app/setup/page.tsx is implemented in Wave 2.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

// Import the target (does NOT exist yet — will resolve when app/setup/page.tsx is implemented)
// import SetupPage from '@/app/setup/page';

describe('SetupPage guard — AUTH-01', () => {
  it('renders "Create Admin Account" form when users table has 0 rows', async () => {
    // RED: SetupPage does not exist yet
    // When GREEN: mock db to return empty users array, render SetupPage,
    // expect(screen.getByText(/Create Admin Account/i)).toBeInTheDocument()
    const SetupPage: any = undefined;
    expect(SetupPage).toBeDefined();
  });

  it('calls redirect("/login") when users table has 1+ rows', async () => {
    // RED: SetupPage does not exist yet
    // When GREEN: mock db to return 1 user, render SetupPage,
    // expect(redirect).toHaveBeenCalledWith('/login')
    const redirect = vi.fn();
    const SetupPage: any = undefined;
    expect(SetupPage).toBeDefined();
    expect(redirect).not.toHaveBeenCalled(); // placeholder assertion
  });
});
