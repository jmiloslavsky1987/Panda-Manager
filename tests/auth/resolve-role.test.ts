// tests/auth/resolve-role.test.ts
// GREEN — AUTH-03, AUTH-04: resolveRole() with credential + OIDC session shapes
import { describe, it, expect } from 'vitest';
import { resolveRole } from '@/lib/auth-utils';

describe('resolveRole() — credential session (better-auth)', () => {
  it('returns "admin" for credential session with role: "admin"', () => {
    expect(resolveRole({ user: { role: 'admin' } })).toBe('admin');
  });

  it('returns "user" for credential session with role: "user"', () => {
    expect(resolveRole({ user: { role: 'user' } })).toBe('user');
  });

  it('returns "user" (default) for credential session with empty user object', () => {
    expect(resolveRole({ user: {} })).toBe('user');
  });
});

describe('resolveRole() — OIDC session (future Okta)', () => {
  it('returns "admin" for OIDC session with groups: ["Admins"]', () => {
    expect(resolveRole({ claims: { groups: ['Admins'] } })).toBe('admin');
  });

  it('returns "admin" for OIDC session with roles: ["admin"]', () => {
    expect(resolveRole({ claims: { roles: ['admin'] } })).toBe('admin');
  });

  it('returns "user" for OIDC session with empty claims (no matching groups)', () => {
    expect(resolveRole({ claims: {} })).toBe('user');
  });
});
