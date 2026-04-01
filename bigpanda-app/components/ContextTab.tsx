'use client'

import { useState } from 'react'
import { IngestionModal } from './IngestionModal'

interface ContextTabProps {
  projectId: string | number
}

interface UploadHistoryItem {
  id: number
  name: string
  createdAt: string
  status: string
}

interface CompletenessResult {
  tabId: string
  status: 'complete' | 'partial' | 'empty'
  gaps: string[]
}

export function ContextTab({ projectId }: ContextTabProps) {
  const [isIngestionModalOpen, setIngestionModalOpen] = useState(false)
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([])
  const [completeness, setCompleteness] = useState<CompletenessResult[] | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set())

  function toggleTab(tabId: string) {
    setExpandedTabs(prev => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  // Load upload history from artifacts table
  // (wired fully in Plan 05 — stub fetch here)
  // [placeholder: useEffect fetch /api/projects/[projectId]/artifacts?source=ingestion]

  // Completeness analysis handler (wired in Plan 05)
  async function handleAnalyze() {
    setIsAnalyzing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/completeness`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Completeness analysis failed')
      const data = await res.json()
      setCompleteness(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Section 1: Upload */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Upload Documents</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload meeting notes, status reports, or any project document. Claude will extract and route content to the correct workspace tabs for your review.
        </p>
        <button
          onClick={() => setIngestionModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Upload Document
        </button>
      </section>

      {/* Section 2: Upload History */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Upload History</h2>
        {uploadHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Filename</th>
                <th className="pb-2 font-medium">Uploaded</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {uploadHistory.map(item => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === 'processed' ? 'bg-green-100 text-green-800' :
                      item.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Section 3: Completeness Panel */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Workspace Completeness</h2>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Completeness'}
          </button>
        </div>

        {!completeness && !isAnalyzing && (
          <p className="text-sm text-muted-foreground">
            Click "Analyze Completeness" to see which workspace tabs have quality gaps.
          </p>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-spin">...</span>
            <span>Analyzing project data...</span>
          </div>
        )}

        {completeness && (
          <div className="flex flex-col gap-1">
            {completeness.map(tab => (
              <div key={tab.tabId} className="rounded-md border">
                <button
                  onClick={() => toggleTab(tab.tabId)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
                >
                  <span className="font-medium capitalize">{tab.tabId}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tab.status === 'complete' ? 'bg-green-100 text-green-800' :
                    tab.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>{tab.status}</span>
                </button>
                {expandedTabs.has(tab.tabId) && tab.gaps.length > 0 && (
                  <div className="border-t px-4 py-3">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {tab.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {expandedTabs.has(tab.tabId) && tab.gaps.length === 0 && (
                  <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                    No specific gaps identified.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <IngestionModal
        projectId={typeof projectId === 'string' ? parseInt(projectId, 10) : projectId}
        open={isIngestionModalOpen}
        onOpenChange={setIngestionModalOpen}
      />
    </div>
  )
}
