/**
 * Test scaffold for SKLS-02: Job Cancellation
 *
 * Covers: cancel endpoint, DB status update, queue cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/skills/runs/[runId]/cancel/route'

// Mock database and BullMQ
vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  skillRuns: {},
  eq: vi.fn(),
}))

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    remove: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(true),
  })),
}))

describe('POST /api/skills/runs/[runId]/cancel (SKLS-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with success and status cancelled', async () => {
    const request = new Request('http://localhost/api/skills/runs/run-123/cancel', {
      method: 'POST',
    })

    const response = await POST(request, {
      params: { runId: 'run-123' },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({
      success: true,
      status: 'cancelled',
    })
  })

  it('updates skill_runs DB row status to cancelled', async () => {
    const { db, eq, skillRuns } = await import('@/lib/db')

    const request = new Request('http://localhost/api/skills/runs/run-123/cancel', {
      method: 'POST',
    })

    await POST(request, {
      params: { runId: 'run-123' },
    })

    // Should call db.update with skillRuns table
    expect(db.update).toHaveBeenCalledWith(skillRuns)

    // Should set status to 'cancelled'
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
      })
    )

    // Should filter by run_id
    expect(eq).toHaveBeenCalledWith(expect.anything(), 'run-123')
  })

  it('calls queue.remove() on the BullMQ queue', async () => {
    const { Queue } = await import('bullmq')

    const request = new Request('http://localhost/api/skills/runs/run-123/cancel', {
      method: 'POST',
    })

    await POST(request, {
      params: { runId: 'run-123' },
    })

    // Should create Queue instance
    expect(Queue).toHaveBeenCalled()

    // Get the mocked queue instance
    const queueInstance = vi.mocked(Queue).mock.results[0].value

    // Should call remove with job ID
    expect(queueInstance.remove).toHaveBeenCalledWith('skill-run-run-123')
  })

  it('calls queue.close() in finally block', async () => {
    const { Queue } = await import('bullmq')

    const request = new Request('http://localhost/api/skills/runs/run-123/cancel', {
      method: 'POST',
    })

    await POST(request, {
      params: { runId: 'run-123' },
    })

    // Get the mocked queue instance
    const queueInstance = vi.mocked(Queue).mock.results[0].value

    // Should call close to clean up connection
    expect(queueInstance.close).toHaveBeenCalled()
  })

  it('handles errors gracefully', async () => {
    const { db } = await import('@/lib/db')
    vi.mocked(db.update).mockImplementationOnce(() => {
      throw new Error('Database error')
    })

    const request = new Request('http://localhost/api/skills/runs/run-123/cancel', {
      method: 'POST',
    })

    const response = await POST(request, {
      params: { runId: 'run-123' },
    })

    // Should return error response
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })
})
