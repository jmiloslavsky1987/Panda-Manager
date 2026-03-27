import Link from 'next/link'
import { getWorkspaceData } from '../../../../lib/queries'
import { SourceBadge } from '../../../../components/SourceBadge'

const SOURCE_STYLES: Record<string, string> = {
  yaml_import: 'bg-zinc-100 text-zinc-600',
  manual_entry: 'bg-blue-100 text-blue-700',
  skill_run: 'bg-purple-100 text-purple-700',
}

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getWorkspaceData(parseInt(id, 10))
  const artifactMap = new Map(data.artifacts.map((a) => [a.id, a.name]))

  const history = [...data.engagementHistory].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div data-testid="history-tab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Engagement History</h2>
        <Link
          href={`/customer/${id}/skills`}
          className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded hover:bg-zinc-700"
        >
          Generate Meeting Summary
        </Link>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Engagement history is append-only. Use &apos;Add Notes&apos; button to add a new entry.
      </div>

      {/* Anchor for the Add Notes FAB to link to */}
      <a
        id="add-notes"
        data-testid="add-notes-from-history"
        href="#add-notes"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        Add a note
      </a>

      {history.length === 0 ? (
        <p className="text-sm text-zinc-500">No engagement history recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const sourceStyle = SOURCE_STYLES[entry.source] ?? 'bg-zinc-100 text-zinc-600'
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500">
                    {entry.date ?? new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceStyle}`}
                    >
                      {entry.source}
                    </span>
                    <SourceBadge
                      source={entry.source === 'ingestion' ? 'ingestion' : entry.source === 'discovery' ? 'discovery' : 'manual'}
                      artifactName={entry.source_artifact_id ? (artifactMap.get(entry.source_artifact_id) ?? null) : null}
                      discoverySource={entry.discovery_source}
                    />
                  </div>
                </div>
                <p className="text-sm text-zinc-900 whitespace-pre-wrap">{entry.content}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
