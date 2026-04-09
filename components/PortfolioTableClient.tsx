'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import type { PortfolioProject } from '@/lib/queries'

interface PortfolioTableClientProps {
  projects: PortfolioProject[]
}

const healthBadgeColors: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
}

const riskBadgeColors: Record<string, string> = {
  None: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-800',
}

const dependencyBadgeColors: Record<string, string> = {
  Clear: 'bg-green-100 text-green-800',
  Blocked: 'bg-orange-100 text-orange-800',
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return date.toLocaleDateString()
}

export function PortfolioTableClient({ projects }: PortfolioTableClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL param extraction
  const statusFilter = searchParams.get('status') ?? ''
  const ownerFilter = searchParams.get('owner') ?? ''
  const trackFilter = searchParams.get('track') ?? ''
  const phaseFilter = searchParams.get('phase') ?? ''
  const riskLevelFilter = searchParams.get('riskLevel') ?? ''
  const dependencyFilter = searchParams.get('dependency') ?? ''
  const searchQuery = searchParams.get('search') ?? ''

  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // Update URL param callback
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Compute unique values for filter dropdowns
  const uniqueOwners = useMemo(
    () => [...new Set(projects.map(p => p.owner).filter(Boolean) as string[])].sort(),
    [projects]
  )

  const uniqueTracks = useMemo(
    () => [...new Set(projects.map(p => p.tracks).filter(Boolean) as string[])].sort(),
    [projects]
  )

  const uniquePhases = useMemo(
    () => [...new Set(projects.map(p => p.currentPhase).filter(Boolean) as string[])].sort(),
    [projects]
  )

  // Apply all filters
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (statusFilter) {
      result = result.filter(p => p.health === statusFilter)
    }
    if (ownerFilter) {
      result = result.filter(p => p.owner === ownerFilter)
    }
    if (trackFilter) {
      result = result.filter(p => p.tracks.includes(trackFilter))
    }
    if (phaseFilter) {
      result = result.filter(p => p.currentPhase === phaseFilter)
    }
    if (riskLevelFilter) {
      result = result.filter(p => p.riskLevel === riskLevelFilter)
    }
    if (dependencyFilter) {
      result = result.filter(p => p.dependencyStatus === dependencyFilter)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => p.customer.toLowerCase().includes(query))
    }

    return result
  }, [projects, statusFilter, ownerFilter, trackFilter, phaseFilter, riskLevelFilter, dependencyFilter, searchQuery])

  // Count active filters
  const activeFilterCount = [statusFilter, ownerFilter, trackFilter, phaseFilter, riskLevelFilter, dependencyFilter].filter(Boolean).length

  // Row click handler
  function handleRowClick(projectId: number) {
    router.push(`/customer/${projectId}`)
  }

  return (
    <div className="space-y-4">
      {/* Search input and filter toggle */}
      <div className="flex items-center justify-between gap-4">
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => updateParam('search', e.target.value)}
          className="max-w-xs"
        />
        <button
          onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 border rounded px-3 py-2"
        >
          Filters
          {activeFilterCount > 0 && (
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {activeFilterCount}
            </Badge>
          )}
          {filterPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible filter panel */}
      {filterPanelOpen && (
        <div className="border rounded-md bg-zinc-50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Status (Health)</label>
              <select
                value={statusFilter}
                onChange={e => updateParam('status', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
                <option value="red">Red</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Owner</label>
              <select
                value={ownerFilter}
                onChange={e => updateParam('owner', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                {uniqueOwners.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Track</label>
              <select
                value={trackFilter}
                onChange={e => updateParam('track', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                {uniqueTracks.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Phase</label>
              <select
                value={phaseFilter}
                onChange={e => updateParam('phase', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                {uniquePhases.map(ph => (
                  <option key={ph} value={ph}>{ph}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Risk Level</label>
              <select
                value={riskLevelFilter}
                onChange={e => updateParam('riskLevel', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="None">None</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Dependency</label>
              <select
                value={dependencyFilter}
                onChange={e => updateParam('dependency', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="Clear">Clear</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                updateParam('status', '')
                updateParam('owner', '')
                updateParam('track', '')
                updateParam('phase', '')
                updateParam('riskLevel', '')
                updateParam('dependency', '')
              }}
              className="mt-3 text-sm text-zinc-600 hover:text-zinc-900"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Portfolio table */}
      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Team/Track</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>% Complete</TableHead>
              <TableHead>Next Milestone</TableHead>
              <TableHead>Next MS Date</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Dependency</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]">Exec</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-zinc-400 py-8">
                  No projects match current filters
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow
                  key={project.id}
                  onClick={() => handleRowClick(project.id)}
                  className="cursor-pointer hover:bg-zinc-50"
                >
                  <TableCell className="font-medium">{project.customer}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{project.owner ?? '—'}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{project.tracks || '—'}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{project.currentPhase ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${healthBadgeColors[project.health] ?? 'bg-zinc-100 text-zinc-700'}`}>
                      {project.health}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {project.percentComplete !== null ? `${project.percentComplete}%` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">{project.nextMilestone ?? '—'}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{project.nextMilestoneDate ?? '—'}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${riskBadgeColors[project.riskLevel] ?? 'bg-zinc-100 text-zinc-700'}`}>
                      {project.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${dependencyBadgeColors[project.dependencyStatus] ?? 'bg-zinc-100 text-zinc-700'}`}>
                      {project.dependencyStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatRelativeDate(project.updated_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    {project.exec_action_required && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-zinc-500">
        Showing {filteredProjects.length} of {projects.length} projects
      </div>
    </div>
  )
}
