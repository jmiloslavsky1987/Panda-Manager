import { getWorkspaceData } from '../../../../lib/queries'
import { AddDecisionModal } from '@/components/AddDecisionModal'
import { SourceBadge } from '@/components/SourceBadge'

export default async function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const data = await getWorkspaceData(projectId)
  const artifactMap = new Map(data.artifacts.map((a) => [a.id, a.name]))

  const decisions = [...data.keyDecisions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div data-testid="decisions-tab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Key Decisions</h2>
        <AddDecisionModal projectId={projectId} />
      </div>

      {decisions.length === 0 ? (
        <p className="text-sm text-zinc-500">No key decisions recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-500">
                  {decision.date ?? new Date(decision.created_at).toLocaleDateString()}
                </span>
                <SourceBadge
                  source={decision.source}
                  artifactName={decision.source_artifact_id ? (artifactMap.get(decision.source_artifact_id) ?? null) : null}
                  discoverySource={decision.discovery_source}
                />
              </div>

              <p className="text-sm text-zinc-900">{decision.decision}</p>

              {decision.context && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-700 select-none">
                    Show context
                  </summary>
                  <p className="mt-2 text-zinc-700 whitespace-pre-wrap">{decision.context}</p>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
