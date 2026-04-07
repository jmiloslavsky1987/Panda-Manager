// @vitest-environment jsdom
/**
 * Test scaffold for SRCH-01: Global Search Bar
 *
 * Covers: debounce behavior, result grouping, navigation, dropdown close
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GlobalSearchBar from '@/components/GlobalSearchBar'

// Mock Next.js navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  }),
}))

describe('GlobalSearchBar (SRCH-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders search input', () => {
    render(<GlobalSearchBar projectId={1} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('does not fetch for 1-char query', async () => {
    const user = userEvent.setup({ delay: null })
    render(<GlobalSearchBar projectId={1} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'a')

    // Wait for any potential debounce
    await new Promise(resolve => setTimeout(resolve, 350))

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fetches after 300ms debounce for 2+ char query', async () => {
    vi.useFakeTimers()

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 1,
            table: 'actions',
            section: 'Actions',
            title: 'Deploy fix',
            snippet: '',
            project_id: 1,
            project_name: 'BigPanda',
            customer: 'BigPanda',
            date: null,
          },
        ],
      }),
    })

    render(<GlobalSearchBar projectId={1} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'ri' } })

    // Should not call fetch immediately
    expect(global.fetch).not.toHaveBeenCalled()

    // Advance 300ms to trigger debounce
    await vi.advanceTimersByTimeAsync(300)

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=ri&account=1'),
        expect.any(Object)
      )
    })

    vi.useRealTimers()
  })

  it('groups results by section', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 1,
            table: 'actions',
            section: 'Actions',
            title: 'Deploy fix',
            snippet: '',
            project_id: 1,
            project_name: 'BigPanda',
            customer: 'BigPanda',
            date: null,
          },
        ],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(<GlobalSearchBar projectId={1} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'deploy')

    // Wait for debounce timer (300ms) + a bit extra
    await new Promise(resolve => setTimeout(resolve, 400))

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Expect section header
    await waitFor(() => {
      expect(screen.getByText(/Actions \(1\)/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('navigates on result click', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 1,
            table: 'actions',
            section: 'Actions',
            title: 'Deploy fix',
            snippet: '',
            project_id: 1,
            project_name: 'BigPanda',
            customer: 'BigPanda',
            date: null,
          },
        ],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(<GlobalSearchBar projectId={1} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'deploy')

    // Wait for debounce timer (300ms) + a bit extra
    await new Promise(resolve => setTimeout(resolve, 400))

    await waitFor(() => {
      expect(screen.getByText('Deploy fix')).toBeInTheDocument()
    }, { timeout: 2000 })

    const resultItem = screen.getByText('Deploy fix')
    await user.click(resultItem)

    expect(mockPush).toHaveBeenCalledWith('/customer/1/actions')
  })

  it('closes dropdown on Escape', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 1,
            table: 'actions',
            section: 'Actions',
            title: 'Deploy fix',
            snippet: '',
            project_id: 1,
            project_name: 'BigPanda',
            customer: 'BigPanda',
            date: null,
          },
        ],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(<GlobalSearchBar projectId={1} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'deploy')

    // Wait for debounce timer (300ms) + a bit extra
    await new Promise(resolve => setTimeout(resolve, 400))

    await waitFor(() => {
      expect(screen.getByText('Deploy fix')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    // Dropdown should close (result no longer visible)
    await waitFor(() => {
      expect(screen.queryByText('Deploy fix')).not.toBeInTheDocument()
    })
  })
})
