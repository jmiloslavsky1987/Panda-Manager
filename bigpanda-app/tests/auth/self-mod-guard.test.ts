// tests/auth/self-mod-guard.test.ts
// RED stub — AUTH-02: admin cannot deactivate/delete their own account
// These tests will turn GREEN when app/api/settings/users/[id]/route.ts is implemented in Wave 3.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

// Import the target (does NOT exist yet — will resolve when API route is implemented)
// import { PUT, DELETE } from '@/app/api/settings/users/[id]/route';

describe('Self-modification guard — AUTH-02', () => {
  it('PUT /api/settings/users/[id] where id === session.user.id returns 403', async () => {
    // RED: route.ts does not exist yet
    // When GREEN: mock session with user.id = '1', PUT request with id = '1', expect 403
    const PUT: any = undefined;
    expect(PUT).toBeDefined();
  });

  it('DELETE /api/settings/users/[id] where id === session.user.id returns 403', async () => {
    // RED: route.ts does not exist yet
    // When GREEN: mock session with user.id = '1', DELETE request with id = '1', expect 403
    const DELETE: any = undefined;
    expect(DELETE).toBeDefined();
  });
});
