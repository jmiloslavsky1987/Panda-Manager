import { getWorkspaceData, getSkillRuns } from '@/lib/queries'
import { ArtifactEditModal } from '@/components/ArtifactEditModal'
import { Button } from '@/components/ui/button'
import { ArtifactsDropZone } from '@/components/ArtifactsDropZone'
import { SourceBadge } from '@/components/SourceBadge'
import Link from 'next/link'

export default async function ArtifactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  let data: Awaited<ReturnType<typeof getWorkspaceData>> | null = null
  try {
    data = await getWorkspaceData(projectId)
  } catch {
    // DB not available — render empty state
  }

  const artifacts = data?.artifacts ?? []

  let skillRunHistory: Awaited<ReturnType<typeof getSkillRuns>> = []
  try {
    skillRunHistory = await getSkillRuns(projectId, 100)
  } catch {
    // non-fatal
  }

  return (
    <ArtifactsDropZone projectId={projectId}>
      <div className="p-6 space-y-8" data-testid="artifacts-tab">

        {/* ── Intake Artifacts ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Artifacts</h2>
            <ArtifactEditModal
              projectId={projectId}
              trigger={<Button data-testid="new-artifact-btn">New Artifact</Button>}
            />
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_120px_160px_auto] gap-2 border-b pb-2 text-sm font-medium text-zinc-500">
            <span>ID</span>
            <span>Name</span>
            <span>Status</span>
            <span>Owner</span>
            <span>Source</span>
          </div>

          {/* Rows */}
          <div className="space-y-1" data-testid="artifacts-table">
            {artifacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <h3 className="text-sm font-medium text-zinc-900 mb-1">No artifacts yet</h3>
                <p className="text-sm text-zinc-500 mb-4 max-w-sm">
                  Artifacts are documents uploaded via the Context Hub. Upload a document to extract project data.
                </p>
                <a
                  href={`/customer/${projectId}/context`}
                  className="inline-flex items-center rounded-md border border-zinc-300 bg-white text-sm px-4 py-2 hover:bg-zinc-50 transition-colors"
                >
                  Upload a document
                </a>
              </div>
            ) : (
              artifacts.map(artifact => (
                <ArtifactEditModal
                  key={artifact.id}
                  artifact={artifact}
                  projectId={projectId}
                  trigger={
                    <div
                      className="grid grid-cols-[80px_1fr_120px_160px_auto] gap-2 border-b py-2 hover:bg-zinc-50 cursor-pointer text-sm"
                      data-testid={`artifact-row-${artifact.id}`}
                    >
                      <span className="font-mono text-zinc-500">{artifact.external_id}</span>
                      <span className="text-zinc-800">{artifact.name}</span>
                      <span className="text-zinc-600">{artifact.status ?? '—'}</span>
                      <span className="text-zinc-600">{artifact.owner ?? '—'}</span>
                      <SourceBadge
                        source={artifact.source}
                        artifactName={artifact.source === 'ingestion' ? artifact.name : null}
                        discoverySource={artifact.discovery_source}
                      />
                    </div>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* ── Skill Outputs ──────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Skill Outputs</h2>
          <p className="text-sm text-zinc-500 mb-4">
            All AI skill runs for this project — from the Skills tab and scheduled jobs.
          </p>

          {skillRunHistory.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No skill runs yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_180px_100px] gap-4 px-4 py-2 bg-zinc-50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <span>Skill</span>
                <span>Date</span>
                <span>Status</span>
              </div>

              {skillRunHistory.map((run) => (
                <Link
                  key={run.run_id}
                  href={`/customer/${projectId}/skills/${run.run_id}`}
                  className="grid grid-cols-[1fr_180px_100px] gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors items-center"
                >
                  <span className="text-sm font-medium text-zinc-800 capitalize">
                    {run.skill_name.replace(/-/g, ' ')}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border w-fit ${
                    run.status === 'completed'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : run.status === 'failed'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : run.status === 'running'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {run.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </ArtifactsDropZone>
  )
}
