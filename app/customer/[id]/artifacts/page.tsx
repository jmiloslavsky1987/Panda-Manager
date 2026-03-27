import { getWorkspaceData } from '@/lib/queries'
import { ArtifactEditModal } from '@/components/ArtifactEditModal'
import { Button } from '@/components/ui/button'
import { ArtifactsDropZone } from '@/components/ArtifactsDropZone'
import { SourceBadge } from '@/components/SourceBadge'

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

  return (
    <ArtifactsDropZone projectId={projectId}>
      <div className="p-6 space-y-4" data-testid="artifacts-tab">
        <div className="flex items-center justify-between">
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
            <p className="py-4 text-center text-zinc-400 text-sm">No artifacts yet</p>
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
    </ArtifactsDropZone>
  )
}
