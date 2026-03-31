// tests/auth/login-page.test.tsx
// RED stub — AUTH-01: Login page renders without Sidebar/SearchBar
// These tests will turn GREEN when app/login/page.tsx is implemented in Wave 2.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

// Import the target (does NOT exist yet — will resolve when app/login/page.tsx is implemented)
// import LoginPage from '@/app/login/page';

describe('LoginPage — AUTH-01', () => {
  it('renders without throwing', async () => {
    // RED: LoginPage does not exist yet
    const LoginPage: any = undefined;
    expect(LoginPage).toBeDefined();
  });

  it('renders an email input, password input, and submit button', async () => {
    // RED: LoginPage does not exist yet
    // When GREEN: expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    // When GREEN: expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    // When GREEN: expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    const LoginPage: any = undefined;
    expect(LoginPage).toBeDefined();
  });

  it('does NOT render a Sidebar or SearchBar component', async () => {
    // RED: LoginPage does not exist yet
    // When GREEN: verify no Sidebar or SearchBar in rendered output
    const LoginPage: any = undefined;
    expect(LoginPage).toBeDefined();
  });
});
