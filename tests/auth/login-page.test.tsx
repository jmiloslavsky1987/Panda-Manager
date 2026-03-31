// @vitest-environment jsdom
// tests/auth/login-page.test.tsx
// GREEN — AUTH-01: Login page renders without Sidebar/SearchBar
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Polyfill ResizeObserver — required by Radix UI Checkbox in jsdom
beforeAll(() => {
  if (typeof window !== 'undefined' && !window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/login'),
}));
vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: { email: vi.fn() },
    signOut: vi.fn(),
    useSession: vi.fn(),
    getSession: vi.fn(),
  })),
}));

import LoginPage from '@/app/login/page';

describe('LoginPage — AUTH-01', () => {
  it('renders without throwing', () => {
    expect(() => render(<LoginPage />)).not.toThrow();
  });

  it('renders an email input, password input, and submit button', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does NOT render a Sidebar or SearchBar component', () => {
    render(<LoginPage />);
    // Sidebar and SearchBar are NOT imported in login/page.tsx — verify no nav elements
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    // The login page should have the sign-in heading (card exists) without sidebar/nav chrome
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });
});
