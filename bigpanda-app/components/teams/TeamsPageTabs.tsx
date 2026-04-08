'use client'

import { useState } from 'react'
import type { TeamsTabData } from '@/lib/queries'
import { TeamEngagementOverview } from './TeamEngagementOverview'
import { TeamEngagementMap } from './TeamEngagementMap'

interface Props {
  projectId: number
  customer: string
  data: TeamsTabData
}

type SubTab = 'overview' | 'detail'

export function TeamsPageTabs({ projectId, customer, data }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('overview')

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="border-b border-zinc-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              px-4 py-2 text-sm font-medium rounded-t-md border-t border-l border-r
              transition-colors
              ${
                activeTab === 'overview'
                  ? 'bg-white border-b-white text-zinc-900 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-700 border-transparent bg-transparent'
              }
            `}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('detail')}
            className={`
              px-4 py-2 text-sm font-medium rounded-t-md border-t border-l border-r
              transition-colors
              ${
                activeTab === 'detail'
                  ? 'bg-white border-b-white text-zinc-900 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-700 border-transparent bg-transparent'
              }
            `}
          >
            Detail
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' ? (
        <TeamEngagementOverview projectId={projectId} data={data} />
      ) : (
        <TeamEngagementMap projectId={projectId} customer={customer} data={data} />
      )}
    </div>
  )
}
