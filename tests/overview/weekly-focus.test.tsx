// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { WeeklyFocus } from '../../components/WeeklyFocus'

// Mock Redis to avoid requiring a real Redis instance during tests
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('weeklyFocusJob', () => {
  it('generates 3-5 priority bullets and writes to Redis cache', () => {
    // Stub for WKFO-01 job behavior
    const jobResult: any = undefined
    expect(jobResult).toBeDefined()
  })

  it('GET /api/.../weekly-focus returns bullets from Redis cache', () => {
    // Stub for WKFO-01 GET endpoint with cached data
    const apiResponse: any = undefined
    expect(apiResponse).toBeDefined()
  })

  it('GET /api/.../weekly-focus returns null bullets when cache empty', () => {
    // Stub for WKFO-01 GET endpoint empty state
    const emptyResponse: any = undefined
    expect(emptyResponse).toBeDefined()
  })

  it('POST /api/.../weekly-focus enqueues job and returns { queued: true }', () => {
    // Stub for WKFO-01 on-demand trigger
    const postResponse: any = undefined
    expect(postResponse).toBeDefined()
  })
})

describe('WeeklyFocus component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ProgressRing with overall completion percentage', async () => {
    // Mock API responses
    const mockFetch = global.fetch as any
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bullets: ['Focus item 1', 'Focus item 2', 'Focus item 3'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stepCounts: [
            { track: 'adr', status: 'complete', count: 3 },
            { track: 'adr', status: 'in_progress', count: 2 },
            { track: 'biggy', status: 'complete', count: 4 },
            { track: 'biggy', status: 'in_progress', count: 6 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      })

    render(<WeeklyFocus projectId={1} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('progress-ring')).toBeInTheDocument()
    })

    // ADR: 3/5 = 60%, Biggy: 4/10 = 40%, Average: 50%
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('ProgressRing pct is average of ADR + Biggy stepCounts from overview-metrics', async () => {
    // Mock API responses
    const mockFetch = global.fetch as any
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bullets: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stepCounts: [
            { track: 'adr', status: 'complete', count: 8 },
            { track: 'adr', status: 'in_progress', count: 2 },
            { track: 'biggy', status: 'complete', count: 6 },
            { track: 'biggy', status: 'in_progress', count: 4 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      })

    render(<WeeklyFocus projectId={1} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('progress-ring')).toBeInTheDocument()
    })

    // ADR: 8/10 = 80%, Biggy: 6/10 = 60%, Average: 70%
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('renders bullet list when bullets are available', async () => {
    // Mock API responses
    const mockFetch = global.fetch as any
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bullets: [
            'Complete ADR integration validation',
            'Address 2 critical risks in platform config',
            'Prepare UAT environment for next week',
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stepCounts: [
            { track: 'adr', status: 'complete', count: 5 },
            { track: 'adr', status: 'in_progress', count: 5 },
            { track: 'biggy', status: 'complete', count: 5 },
            { track: 'biggy', status: 'in_progress', count: 5 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      })

    render(<WeeklyFocus projectId={1} />)

    // Wait for bullets to appear
    await waitFor(() => {
      expect(screen.getByTestId('weekly-focus-section')).toBeInTheDocument()
    })

    // Check that all three bullets are rendered
    const bullets = screen.getAllByTestId('weekly-focus-bullet')
    expect(bullets).toHaveLength(3)
    expect(screen.getByText('Complete ADR integration validation')).toBeInTheDocument()
    expect(screen.getByText('Address 2 critical risks in platform config')).toBeInTheDocument()
    expect(screen.getByText('Prepare UAT environment for next week')).toBeInTheDocument()
  })

  it('renders empty state with Generate Now button when bullets are null', async () => {
    // Mock API responses
    const mockFetch = global.fetch as any
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bullets: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stepCounts: [
            { track: 'adr', status: 'complete', count: 5 },
            { track: 'adr', status: 'in_progress', count: 5 },
            { track: 'biggy', status: 'complete', count: 5 },
            { track: 'biggy', status: 'in_progress', count: 5 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      })

    render(<WeeklyFocus projectId={1} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('weekly-focus-section')).toBeInTheDocument()
    })

    // Check for empty state elements
    expect(screen.getByText(/No weekly focus generated yet/i)).toBeInTheDocument()
    expect(screen.getByTestId('generate-now-btn')).toBeInTheDocument()
  })

  it('calls POST endpoint when Generate Now is clicked', async () => {
    // Mock API responses
    const mockFetch = global.fetch as any
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bullets: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stepCounts: [
            { track: 'adr', status: 'complete', count: 5 },
            { track: 'adr', status: 'in_progress', count: 5 },
            { track: 'biggy', status: 'complete', count: 5 },
            { track: 'biggy', status: 'in_progress', count: 5 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      })

    render(<WeeklyFocus projectId={1} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('generate-now-btn')).toBeInTheDocument()
    })

    // Mock POST response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ queued: true }),
    })

    // Click the Generate Now button
    const generateBtn = screen.getByTestId('generate-now-btn')
    fireEvent.click(generateBtn)

    // Wait for POST call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/1/weekly-focus',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows generating state while POST is in flight', async () => {
    // Mock API responses
    const mockFetch = global.fetch as any
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bullets: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stepCounts: [
            { track: 'adr', status: 'complete', count: 5 },
            { track: 'adr', status: 'in_progress', count: 5 },
            { track: 'biggy', status: 'complete', count: 5 },
            { track: 'biggy', status: 'in_progress', count: 5 },
          ],
          riskCounts: [],
          integrationCounts: [],
          milestoneOnTrack: [],
          weeklyRollup: [],
          weeklyTarget: null,
          totalHoursThisWeek: 0,
        }),
      })

    render(<WeeklyFocus projectId={1} />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTestId('generate-now-btn')).toBeInTheDocument()
    })

    // Mock slow POST response
    let resolvePost: any
    const postPromise = new Promise(resolve => {
      resolvePost = resolve
    })
    mockFetch.mockReturnValueOnce(postPromise)

    // Click the Generate Now button
    const generateBtn = screen.getByTestId('generate-now-btn')
    fireEvent.click(generateBtn)

    // Check for generating state
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument()
      expect(generateBtn).toBeDisabled()
    })

    // Resolve the POST
    resolvePost({ ok: true, json: async () => ({ queued: true }) })
  })
})
