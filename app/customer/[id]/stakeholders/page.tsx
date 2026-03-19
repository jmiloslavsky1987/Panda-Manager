import { getWorkspaceData } from '../../../../lib/queries'

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

export default async function StakeholdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getWorkspaceData(parseInt(id, 10))
  const stakeholders = data.stakeholders

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
      <tbody className="divide-y divide-zinc-100">
        {rows.map((s) => (
          <tr key={s.id} className="align-top">
            <td className="py-3 pr-4 font-medium text-zinc-900 whitespace-nowrap">{s.name}</td>
            <td className="py-3 pr-4 text-zinc-700">{s.role ?? '—'}</td>
            <td className="py-3 pr-4 text-zinc-700">{s.company ?? '—'}</td>
            <td className="py-3 pr-4 text-zinc-700">
              {s.email ? (
                <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline">
                  {s.email}
                </a>
              ) : (
                '—'
              )}
            </td>
            <td className="py-3 pr-4 text-zinc-700">
              {s.slack_id ? `@${s.slack_id.replace(/^@/, '')}` : '—'}
            </td>
            <td className="py-3 text-zinc-500">{truncate(s.notes, 80) || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div data-testid="stakeholders-tab" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Stakeholders</h2>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Adding and editing stakeholders available in Phase 3
      </div>

      {stakeholders.length === 0 ? (
        <p className="text-sm text-zinc-500">No stakeholders recorded yet.</p>
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
