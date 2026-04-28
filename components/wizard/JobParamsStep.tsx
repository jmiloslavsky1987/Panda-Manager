'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
}

interface JobParamsStepProps {
  skillId: string
  params: Record<string, unknown>
  projects: Project[]
  onChange: (params: Record<string, unknown>) => void
  lockedProjectId?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobParamsStep({ skillId, params, projects, onChange, lockedProjectId }: JobParamsStepProps) {
  function update(key: string, value: unknown) {
    onChange({ ...params, [key]: value })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Skill Parameters</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure skill-specific settings for this scheduled job.
        </p>
      </div>

      {skillId === 'customer-project-tracker' && (
        <div className="space-y-4">
          {/* Run for all customers checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="run-for-all"
              type="checkbox"
              checked={Boolean(params.runForAll)}
              onChange={(e) => update('runForAll', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <label htmlFor="run-for-all" className="text-sm font-medium text-gray-700">
                Run for all customers
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                When checked, the tracker runs across all active projects.
              </p>
            </div>
          </div>

          {/* Customer project multi-select (shown when not "run for all") */}
          {!params.runForAll && (
            <div className="space-y-1">
              <label htmlFor="tracker-projects" className="block text-sm font-medium text-gray-700">
                Projects
              </label>
              <select
                id="tracker-projects"
                multiple
                value={Array.isArray(params.projectIds) ? (params.projectIds as string[]) : []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
                  update('projectIds', selected)
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                size={Math.min(projects.length || 4, 6)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">Hold Ctrl / Cmd to select multiple projects.</p>
            </div>
          )}
        </div>
      )}

      {(skillId === 'weekly-customer-status' || skillId === 'context-updater') && lockedProjectId !== undefined && (
        <div className="space-y-1">
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700">
            Project
          </label>
          <select
            id="project-select"
            value={typeof params.projectId === 'string' ? params.projectId : String(lockedProjectId)}
            disabled
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">Set automatically from project context.</p>
        </div>
      )}

      {skillId === 'discovery-scan' && (
        <div className="space-y-4">
          {/* Project picker — shown only in project context */}
          {lockedProjectId !== undefined && (
            <div className="space-y-1">
              <label htmlFor="scan-project" className="block text-sm font-medium text-gray-700">
                Project
              </label>
              <select
                id="scan-project"
                value={typeof params.projectId === 'string' ? params.projectId : String(lockedProjectId)}
                disabled
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">Set automatically from project context.</p>
            </div>
          )}

          {/* Slack channels */}
          <div className="space-y-1">
            <label htmlFor="slack-channels" className="block text-sm font-medium text-gray-700">
              Slack Channels{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="slack-channels"
              type="text"
              value={typeof params.slackChannels === 'string' ? params.slackChannels : ''}
              onChange={(e) => update('slackChannels', e.target.value)}
              placeholder="e.g. #proj-kaiser, #alerts"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">Comma-separated list of Slack channel names.</p>
          </div>
        </div>
      )}

      {skillId === 'meeting-prep-daily' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            This job runs daily at the configured time and auto-generates prep briefs for all your
            meetings of that day. No project selection needed &mdash; it covers all your connected
            calendar events.
          </p>
        </div>
      )}

      {/* Fallback for unknown skill */}
      {!['customer-project-tracker', 'weekly-customer-status', 'context-updater', 'discovery-scan', 'meeting-prep-daily'].includes(skillId) && (
        <div className="text-sm text-gray-500">No additional configuration required.</div>
      )}
    </div>
  )
}
