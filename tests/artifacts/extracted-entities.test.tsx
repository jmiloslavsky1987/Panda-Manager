// @vitest-environment jsdom
/**
 * Test scaffold for ARTF-01: Extracted Entities Reverse Lookup
 *
 * Covers: artifact modal tabs, entity grouping with counts, navigation links
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArtifactEditModal } from '@/components/ArtifactEditModal'

// Mock router that can be updated per test
const mockRouter = { push: vi.fn(), refresh: vi.fn() }

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({
    get: vi.fn(() => null),
    toString: vi.fn(() => ''),
  }),
}))

const mockArtifact = {
  id: 1,
  external_id: 'ART-001',
  name: 'Technical Architecture Document',
  status: 'complete',
  owner: 'John Doe',
  description: 'Architecture details...',
  project_id: 1,
  created_at: new Date('2026-03-15T10:00:00Z'),
  updated_at: new Date('2026-03-15T10:00:00Z'),
}

describe('ArtifactEditModal - Extracted Entities (ARTF-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouter.push.mockClear()
    mockRouter.refresh.mockClear()
    global.fetch = vi.fn()
  })

  it('modal has two tabs: Details and Extracted Entities', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <ArtifactEditModal
        artifact={mockArtifact}
        projectId={1}
        trigger={<button>Edit</button>}
      />
    )

    // Click the trigger to open the modal
    await user.click(screen.getByText('Edit'))

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
        projectId={1}
        trigger={<button>Edit</button>}
      />
    )

    // Click the trigger to open modal
    await user.click(screen.getByText('Edit'))

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    // Should fetch entities
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/artifacts/1/extracted')
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
        projectId={1}
        trigger={<button>Edit</button>}
      />
    )

    // Click the trigger to open modal
    await user.click(screen.getByText('Edit'))

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    await waitFor(() => {
      expect(screen.getByText(/R-001/)).toBeInTheDocument()
    })

    // Click the risk button - should navigate
    const riskButton = screen.getByText(/R-001/).closest('button')
    await user.click(riskButton!)

    expect(mockRouter.push).toHaveBeenCalledWith('/customer/1/risks')
  })

  it('clicking a link closes the modal', async () => {
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
        projectId={1}
        trigger={<button>Edit</button>}
      />
    )

    // Click the trigger to open modal
    await user.click(screen.getByText('Edit'))

    // Click Extracted Entities tab
    const entitiesTab = screen.getByText('Extracted Entities')
    await user.click(entitiesTab)

    await waitFor(() => {
      expect(screen.getByText(/R-001/)).toBeInTheDocument()
    })

    // Verify modal is open (has title)
    expect(screen.getByText('Edit Artifact ART-001')).toBeInTheDocument()

    // Click the risk button
    const riskButton = screen.getByText(/R-001/).closest('button')
    await user.click(riskButton!)

    // Modal should close (title should disappear)
    await waitFor(() => {
      expect(screen.queryByText('Edit Artifact ART-001')).not.toBeInTheDocument()
    })
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
        projectId={1}
        trigger={<button>Edit</button>}
      />
    )

    // Click the trigger to open modal
    await user.click(screen.getByText('Edit'))

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
