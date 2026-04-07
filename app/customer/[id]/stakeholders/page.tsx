import Link from 'next/link'
import { getWorkspaceData } from '../../../../lib/queries'
import { StakeholderEditModal } from '../../../../components/StakeholderEditModal'
import { SourceBadge } from '../../../../components/SourceBadge'

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

export default async function StakeholdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const data = await getWorkspaceData(projectId)
  const stakeholders = data.stakeholders
  const artifactMap = new Map(data.artifacts.map((a) => [a.id, a.name]))

  // Group by company: BigPanda first, then others
  const bigpandaContacts = stakeholders.filter(
    (s) => s.company?.toLowerCase().includes('bigpanda')
  )
  const customerContacts = stakeholders.filter(
    (s) => !s.company?.toLowerCase().includes('bigpanda')
  )

  const groups: { label: string; rows: typeof stakeholders }[] = []
  if (bigpandaContacts.length > 0) {
    groups.push({ label: 'BigPanda', rows: bigpandaContacts })
  }
  // If all contacts share the same non-BP company, one group; else group individually
  const otherCompanies = [...new Set(customerContacts.map((s) => s.company ?? 'Unknown'))]
  if (otherCompanies.length === 1) {
    if (customerContacts.length > 0) {
      groups.push({ label: otherCompanies[0], rows: customerContacts })
    }
  } else {
    otherCompanies.forEach((company) => {
      const rows = customerContacts.filter((s) => (s.company ?? 'Unknown') === company)
      if (rows.length > 0) {
        groups.push({ label: company, rows })
      }
    })
  }

  // If no grouping possible (all same company or empty), fall back to flat list
  const useGroups = groups.length > 1

  const renderRows = (rows: typeof stakeholders) =>
    rows.map((s) => (
      <StakeholderEditModal
        key={s.id}
        stakeholder={s}
        projectId={projectId}
        trigger={
          <tr className="align-top border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer">
            <td className="py-3 pr-4 font-medium text-zinc-900 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span>{s.name}</span>
                <SourceBadge
                  source={s.source}
                  artifactName={s.source_artifact_id ? (artifactMap.get(s.source_artifact_id) ?? null) : null}
                  discoverySource={s.discovery_source}
                />
              </div>
            </td>
            <td className="py-3 pr-4 text-zinc-700">{s.role ?? '—'}</td>
            <td className="py-3 pr-4 text-zinc-700">{s.company ?? '—'}</td>
            <td className="py-3 pr-4 text-zinc-700">
              {s.email ? (
                <span className="text-blue-600">{s.email}</span>
              ) : (
                '—'
              )}
            </td>
            <td className="py-3 pr-4 text-zinc-700">
              {s.slack_id ? `@${s.slack_id.replace(/^@/, '')}` : '—'}
            </td>
            <td className="py-3 text-zinc-500">{truncate(s.notes, 80) || '—'}</td>
          </tr>
        }
      />
    ))

  const renderTable = (rows: typeof stakeholders) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
          <th className="pb-2 pr-4">Name</th>
          <th className="pb-2 pr-4">Role</th>
          <th className="pb-2 pr-4">Company</th>
          <th className="pb-2 pr-4">Email</th>
          <th className="pb-2 pr-4">Slack ID</th>
          <th className="pb-2">Notes</th>
        </tr>
      </thead>
      <tbody>
        {renderRows(rows)}
      </tbody>
    </table>
  )

  return (
    <div data-testid="stakeholders-tab" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Stakeholders</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/customer/${id}/skills`}
            className="px-3 py-1.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded hover:bg-zinc-50"
          >
            Create Handoff Doc
          </Link>
          <StakeholderEditModal
            projectId={projectId}
            trigger={
              <button
                data-testid="add-stakeholder-btn"
                className="rounded-md bg-zinc-900 text-white text-sm px-4 py-2 hover:bg-zinc-700 transition-colors"
              >
                + Add Stakeholder
              </button>
            }
          />
        </div>
      </div>

      {stakeholders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-sm font-medium text-zinc-900 mb-1">No stakeholders yet</h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-sm">
            Stakeholders record the people involved in the project. Add the first one to get started.
          </p>
          <StakeholderEditModal
            projectId={projectId}
            trigger={
              <button className="inline-flex items-center rounded-md bg-zinc-900 text-white text-sm px-4 py-2 hover:bg-zinc-700 transition-colors">
                Add Stakeholder
              </button>
            }
          />
        </div>
      ) : useGroups ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-sm font-semibold text-zinc-600 mb-3">{group.label}</h3>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm px-4">
                {renderTable(group.rows)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm px-4">
          {renderTable(stakeholders)}
        </div>
      )}
    </div>
  )
}
