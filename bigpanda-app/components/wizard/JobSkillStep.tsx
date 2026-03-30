'use client'

import { SKILL_LIST } from '../../lib/scheduler-skills'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobSkillStepProps {
  selectedSkill: string | null
  jobName: string
  scope: 'global' | 'per-project'
  onSkillSelect: (id: string) => void
  onJobNameChange: (n: string) => void
  onScopeChange: (s: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobSkillStep({
  selectedSkill,
  jobName,
  scope,
  onSkillSelect,
  onJobNameChange,
  onScopeChange,
}: JobSkillStepProps) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Select Skill</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose which AI skill to schedule, then give the job a name.
        </p>
      </div>

      {/* 3-column skill card grid */}
      <div className="grid grid-cols-3 gap-3">
        {SKILL_LIST.map((skill) => {
          const isSelected = selectedSkill === skill.id
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => onSkillSelect(skill.id)}
              className={cn(
                'text-left p-3 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isSelected
                  ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              )}
              aria-pressed={isSelected}
              data-testid={`skill-card-${skill.id}`}
            >
              <span className="block text-sm font-semibold text-gray-900">{skill.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5 leading-snug">
                {skill.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Job name + scope row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Job Name */}
        <div className="space-y-1">
          <label htmlFor="job-name" className="block text-sm font-medium text-gray-700">
            Job Name <span className="text-red-500">*</span>
          </label>
          <input
            id="job-name"
            type="text"
            value={jobName}
            onChange={(e) => onJobNameChange(e.target.value)}
            placeholder="e.g. Daily Morning Briefing"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Scope */}
        <div className="space-y-1">
          <label htmlFor="job-scope" className="block text-sm font-medium text-gray-700">
            Scope
          </label>
          <select
            id="job-scope"
            value={scope}
            onChange={(e) => onScopeChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="global">Global</option>
            <option value="per-project">Per-Project</option>
          </select>
        </div>
      </div>
    </div>
  )
}
