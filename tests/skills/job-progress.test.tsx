// @vitest-environment jsdom
/**
 * Test scaffold for SKLS-01: Job Progress Tracking
 *
 * Covers: elapsed timer, polling auto-stop on completed/failed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SkillsTabClient from '@/components/SkillsTabClient'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  }),
}))

const mockSkillRuns = [
  {
    id: 1,
    run_id: 'run-123',
    project_id: 1,
    skill_name: 'Extract Risks',
    status: 'completed' as const,
    started_at: new Date('2026-04-06T10:00:00Z'),
    completed_at: new Date('2026-04-06T10:05:00Z'),
    created_at: new Date('2026-04-06T10:00:00Z'),
  },
]

describe('SkillsTabClient - Job Progress (SKLS-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows elapsed time counter when job is running', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-06T10:05:00Z')
    vi.setSystemTime(now)

    const runningRun = {
      ...mockSkillRuns[0],
      status: 'running' as const,
      started_at: new Date('2026-04-06T10:04:00Z'), // Started 1 minute ago
      completed_at: null,
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'running' }),
    })

    render(<SkillsTabClient runs={[runningRun]} projectId={1} />)

    // Should show elapsed time
    await waitFor(() => {
      expect(screen.getByText(/0m 0s/)).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('after 61 seconds, displays "1m 1s"', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-06T10:05:00Z')
    vi.setSystemTime(now)

    const runningRun = {
      ...mockSkillRuns[0],
      status: 'running' as const,
      started_at: new Date('2026-04-06T10:03:59Z'), // Started 61 seconds ago
      completed_at: null,
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'running' }),
    })

    render(<SkillsTabClient runs={[runningRun]} projectId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/1m 1s/)).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('polling stops when job reaches completed state', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-06T10:05:00Z')
    vi.setSystemTime(now)

    const runningRun = {
      ...mockSkillRuns[0],
      status: 'running' as const,
      started_at: new Date('2026-04-06T10:04:00Z'),
      completed_at: null,
    }

    let pollCount = 0
    ;(global.fetch as any).mockImplementation(() => {
      pollCount++
      if (pollCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'running' }),
        })
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'completed' }),
        })
      }
    })

    render(<SkillsTabClient runs={[runningRun]} projectId={1} />)

    // Wait for first poll
    await waitFor(() => expect(pollCount).toBe(1))

    // Advance time to trigger second poll (typically 2-3 seconds)
    vi.advanceTimersByTime(3000)

    await waitFor(() => expect(pollCount).toBe(2))

    // Advance time again - should NOT poll because job is completed
    vi.advanceTimersByTime(3000)

    // Poll count should still be 2
    expect(pollCount).toBe(2)

    vi.useRealTimers()
  })

  it('polling stops when job reaches failed state', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-06T10:05:00Z')
    vi.setSystemTime(now)

    const runningRun = {
      ...mockSkillRuns[0],
      status: 'running' as const,
      started_at: new Date('2026-04-06T10:04:00Z'),
      completed_at: null,
    }

    let pollCount = 0
    ;(global.fetch as any).mockImplementation(() => {
      pollCount++
      if (pollCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'running' }),
        })
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'failed' }),
        })
      }
    })

    render(<SkillsTabClient runs={[runningRun]} projectId={1} />)

    // Wait for first poll
    await waitFor(() => expect(pollCount).toBe(1))

    // Advance time to trigger second poll
    vi.advanceTimersByTime(3000)

    await waitFor(() => expect(pollCount).toBe(2))

    // Advance time again - should NOT poll because job is failed
    vi.advanceTimersByTime(3000)

    // Poll count should still be 2
    expect(pollCount).toBe(2)

    vi.useRealTimers()
  })

  it('elapsed time increments each second', async () => {
    vi.useFakeTimers()
    const now = new Date('2026-04-06T10:05:00Z')
    vi.setSystemTime(now)

    const runningRun = {
      ...mockSkillRuns[0],
      status: 'running' as const,
      started_at: new Date('2026-04-06T10:04:57Z'), // Started 3 seconds ago
      completed_at: null,
    }

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'running' }),
    })

    render(<SkillsTabClient runs={[runningRun]} projectId={1} />)

    // Initial render should show 0m 3s
    await waitFor(() => {
      expect(screen.getByText(/0m 3s/)).toBeInTheDocument()
    })

    // Advance 1 second
    vi.advanceTimersByTime(1000)

    // Should now show 0m 4s
    await waitFor(() => {
      expect(screen.getByText(/0m 4s/)).toBeInTheDocument()
    })

    // Advance another second
    vi.advanceTimersByTime(1000)

    // Should now show 0m 5s
    await waitFor(() => {
      expect(screen.getByText(/0m 5s/)).toBeInTheDocument()
    })

    vi.useRealTimers()
  })
})
