import Link from 'next/link'
import { getWorkspaceData, getAuditLogForProject, computeAuditDiff } from '../../../../lib/queries'
import { SourceBadge } from '../../../../components/SourceBadge'
import type { EngagementHistoryRow, AuditLogEntry } from '../../../../lib/queries'

const SOURCE_STYLES: Record<string, string> = {
  yaml_import: 'bg-zinc-100 text-zinc-600',
  manual_entry: 'bg-blue-100 text-blue-700',
  skill_run: 'bg-purple-100 text-purple-700',
}

type FeedItem =
  | { kind: 'note'; entry: EngagementHistoryRow; sortDate: Date }
  | { kind: 'audit'; entry: AuditLogEntry; sortDate: Date }

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  const [data, auditEntries] = await Promise.all([
    getWorkspaceData(projectId),
    getAuditLogForProject(projectId),
  ])

  const artifactMap = new Map(data.artifacts.map((a) => [a.id, a.name]))

  // Build unified feed: merge notes and audit entries, sort by date descending
  const feed: FeedItem[] = [
    ...data.engagementHistory.map(e => ({
      kind: 'note' as const,
      entry: e,
      sortDate: new Date(e.created_at),
    })),
    ...auditEntries.map(e => ({
      kind: 'audit' as const,
      entry: e,
      sortDate: new Date(e.created_at),
    })),
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())

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

      {/* Anchor for the Add Notes FAB to link to */}
      <a
        id="add-notes"
        data-testid="add-notes-from-history"
        href="#add-notes"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        Add a note
      </a>

      {feed.length === 0 ? (
        <p className="text-sm text-zinc-500">No engagement history recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {feed.map((item, idx) => {
            if (item.kind === 'note') {
              const entry = item.entry
              const sourceStyle = SOURCE_STYLES[entry.source] ?? 'bg-zinc-100 text-zinc-600'
              return (
                <div
                  key={`note-${entry.id}`}
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
            } else {
              // Audit entry
              const entry = item.entry
              const diff = computeAuditDiff(entry.before_json, entry.after_json)
              const entityLabel = entry.entity_type.replace('_', ' ')
              const displayId = entry.external_id ? `(${entry.external_id})` : ''

              return (
                <div
                  key={`audit-${entry.id}`}
                  data-testid={`audit-entry-${entry.id}`}
                  className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-zinc-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
                      Activity
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-700">
                      {entityLabel} {displayId}
                    </p>
                    <p className="text-sm text-zinc-600">{diff}</p>
                    {entry.actor_id && (
                      <p className="text-xs text-zinc-400">by {entry.actor_id}</p>
                    )}
                  </div>
                </div>
              )
            }
          })}
        </div>
      )}
    </div>
  )
}
