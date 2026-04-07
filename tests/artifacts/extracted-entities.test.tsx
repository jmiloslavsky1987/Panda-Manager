// @vitest-environment jsdom
/**
 * Test scaffold for ARTF-01: Extracted Entities Reverse Lookup
 *
 * Covers: artifact modal tabs, entity grouping with counts, navigation links
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArtifactEditModal from '@/components/ArtifactEditModal'

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

const mockArtifact = {
  id: 1,
  project_id: 1,
  title: 'Technical Architecture Document',
  content: 'Architecture details...',
  type: 'technical',
  created_at: new Date('2026-03-15T10:00:00Z'),
  updated_at: new Date('2026-03-15T10:00:00Z'),
}

describe('ArtifactEditModal - Extracted Entities (ARTF-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('modal has two tabs: Details and Extracted Entities', () => {
    render(
      <ArtifactEditModal
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Extracted Entities')).toBeInTheDocument()
  })

  it('Extracted Entities tab shows risks with count', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risks: [
          {
            id: 1,
            external_id: 'R-001',
            description: 'Database scalability risk',
            severity: 'high',
          },
        ],
        actions: [],
        milestones: [],
        decisions: [],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(
      <ArtifactEditModal
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    // Should fetch entities
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/artifacts/1/entities'),
        expect.any(Object)
      )
    })

    // Should show "Risks (1)" heading
    await waitFor(() => {
      expect(screen.getByText(/Risks \(1\)/i)).toBeInTheDocument()
    })
  })

  it('each entity item has a link to the correct tab path', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risks: [
          {
            id: 1,
            external_id: 'R-001',
            description: 'Database scalability risk',
            severity: 'high',
            project_id: 1,
          },
        ],
        actions: [],
        milestones: [],
        decisions: [],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(
      <ArtifactEditModal
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    await waitFor(() => {
      expect(screen.getByText('R-001')).toBeInTheDocument()
    })

    // Risk link should point to /customer/1/risks
    const riskLink = screen.getByText('R-001').closest('a')
    expect(riskLink).toHaveAttribute('href', '/customer/1/risks')
  })

  it('clicking a link closes the modal', async () => {
    const mockOnClose = vi.fn()

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risks: [
          {
            id: 1,
            external_id: 'R-001',
            description: 'Database scalability risk',
            severity: 'high',
            project_id: 1,
          },
        ],
        actions: [],
        milestones: [],
        decisions: [],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(
      <ArtifactEditModal
        artifact={mockArtifact}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    await waitFor(() => {
      expect(screen.getByText('R-001')).toBeInTheDocument()
    })

    // Click the risk link
    const riskLink = screen.getByText('R-001')
    await user.click(riskLink)

    // Modal should close
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows all entity types grouped with counts', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risks: [{ id: 1, external_id: 'R-001', description: 'Risk 1' }],
        actions: [
          { id: 2, external_id: 'A-001', description: 'Action 1' },
          { id: 3, external_id: 'A-002', description: 'Action 2' },
        ],
        milestones: [{ id: 4, external_id: 'M-001', name: 'Milestone 1' }],
        decisions: [{ id: 5, decision: 'Decision 1' }],
      }),
    })

    const user = userEvent.setup({ delay: null })
    render(
      <ArtifactEditModal
        artifact={mockArtifact}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    await waitFor(() => {
      expect(screen.getByText(/Risks \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Actions \(2\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Milestones \(1\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Decisions \(1\)/i)).toBeInTheDocument()
    })
  })
})
