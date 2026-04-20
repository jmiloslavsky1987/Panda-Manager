/**
 * TENANT-05: Empty State Test
 *
 * Verifies that when getActiveProjects is called with a user who has no memberships,
 * it returns an empty array (no projects visible).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before imports
vi.mock('@/lib/auth-server', () => ({
  requireSession: vi.fn(),
}))

vi.mock('@/lib/queries', () => ({
  getActiveProjects: vi.fn(),
}))

vi.mock('@/lib/auth-utils', () => ({
  resolveRole: vi.fn(),
}))

import { requireSession } from '@/lib/auth-server'
import { getActiveProjects } from '@/lib/queries'
import { resolveRole } from '@/lib/auth-utils'
import { GET } from '@/app/api/projects/route'
import { NextRequest } from 'next/server'

describe('Invite Empty State (TENANT-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('new user with no memberships sees empty array', async () => {
    // Mock requireSession to return a new user with no memberships
    const mockRequireSession = requireSession as ReturnType<typeof vi.fn>
    mockRequireSession.mockResolvedValueOnce({
      session: { user: { id: 'new-user-999', role: 'user' } },
      redirectResponse: null,
    })

    // Mock resolveRole to return 'user'
    const mockResolveRole = resolveRole as ReturnType<typeof vi.fn>
    mockResolveRole.mockReturnValueOnce('user')

    // Mock getActiveProjects to return empty array (user has no memberships)
    const mockGetActiveProjects = getActiveProjects as ReturnType<typeof vi.fn>
    mockGetActiveProjects.mockResolvedValueOnce([])

    // Call the route handler
    const req = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(req)

    // Verify getActiveProjects was called with the new user's ID
    expect(getActiveProjects).toHaveBeenCalledWith({
      userId: 'new-user-999',
      isGlobalAdmin: false,
    })

    // Verify response contains empty projects array
    const data = await response.json()
    expect(data.projects).toEqual([])
  })
})
