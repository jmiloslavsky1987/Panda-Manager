import { getWorkspaceData } from '../../../../lib/queries'
import { ArchitectureEditModal } from '@/components/ArchitectureEditModal'

export default async function ArchitecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getWorkspaceData(parseInt(id, 10))
  const workstreams = data.workstreams

  return (
    <div data-testid="architecture-tab" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Integration Architecture</h2>
        <p className="text-sm text-zinc-500 mt-1">Source: imported from customer YAML context document</p>
      </div>

      {workstreams.length === 0 ? (
        <p className="text-sm text-zinc-500">No workstreams recorded yet.</p>
      ) : (
        <div className="grid gap-4">
          {workstreams.map((ws) => (
            <div
              key={ws.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-base font-semibold text-zinc-900">{ws.name}</span>
                  {ws.track && (
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                      {ws.track}
                    </span>
                  )}
                  {ws.current_status && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      {ws.current_status}
                    </span>
                  )}
                </div>
                <ArchitectureEditModal workstream={{ id: ws.id, name: ws.name, state: ws.state ?? null, lead: ws.lead ?? null }} />
              </div>

              {ws.lead && (
                <p className="text-xs text-zinc-500">
                  <span className="font-medium">Lead:</span> {ws.lead}
                </p>
              )}

              {ws.state ? (
                <div className="rounded-md bg-zinc-50 border border-zinc-100 px-4 py-3">
                  <p className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
                    Integration State
                  </p>
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap">{ws.state}</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">No integration state recorded.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
