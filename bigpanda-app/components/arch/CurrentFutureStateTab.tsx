'use client'
import { useState } from 'react'
import { ArchitectureIntegration, TeamOnboardingStatus } from '@/lib/queries'
import { IntegrationNode } from './IntegrationNode'
import { IntegrationEditModal } from './IntegrationEditModal'
import { TeamOnboardingTable } from './TeamOnboardingTable'

const ADR_PHASES = [
  'Event Ingest',
  'Alert Intelligence',
  'Incident Intelligence',
  'Console',
  'Workflow Automation',
] as const

const BIGGY_PHASES = [
  'Knowledge Sources (Ingested)',
  'Real-Time Query Sources',
  'Biggy Capabilities',
  'Console',
  'Outputs & Actions',
] as const

type ADRPhase = typeof ADR_PHASES[number]
type BiggyPhase = typeof BIGGY_PHASES[number]

// Alert Intelligence sub-groups
const ALERT_INTELLIGENCE_GROUPS = ['Normalization', 'Correlation'] as const

interface Props {
  projectId: number
  customer: string
  integrations: ArchitectureIntegration[]
  onboardingRows: TeamOnboardingStatus[]
  onIntegrationsUpdate: (integrations: ArchitectureIntegration[]) => void
  onOnboardingUpdate: (rows: TeamOnboardingStatus[]) => void
}

interface EditModalState {
  integration: ArchitectureIntegration | null
  defaultTrack: 'ADR' | 'Biggy'
}

export function CurrentFutureStateTab({
  projectId,
  customer,
  integrations,
  onboardingRows,
  onIntegrationsUpdate,
  onOnboardingUpdate,
}: Props) {
  const [editModal, setEditModal] = useState<EditModalState | null>(null)

  function getIntegrationsForColumn(track: 'ADR' | 'Biggy', phase: string): ArchitectureIntegration[] {
    return integrations.filter((i) => i.track === track && i.phase === phase)
  }

  function handleSaveIntegration(saved: ArchitectureIntegration) {
    const existing = integrations.find((i) => i.id === saved.id)
    if (existing) {
      onIntegrationsUpdate(integrations.map((i) => (i.id === saved.id ? saved : i)))
    } else {
      onIntegrationsUpdate([...integrations, saved])
    }
    setEditModal(null)
  }

  function renderPhaseColumn(
    track: 'ADR' | 'Biggy',
    phase: ADRPhase | BiggyPhase,
    headerLabel: string,
    headerBg: string,
    headerBorder: string,
    headerText: string,
  ) {
    const nodes = getIntegrationsForColumn(track, phase)
    const isAlertIntelligence = phase === 'Alert Intelligence'

    let content: React.ReactNode

    if (isAlertIntelligence) {
      content = (
        <div>
          {ALERT_INTELLIGENCE_GROUPS.map((group) => {
            const groupNodes = nodes.filter((n) => n.notes?.includes(group))
            // Fall back: show all if no group tagging
            const allNodes = group === 'Normalization'
              ? nodes.filter((_, i) => i % 2 === 0)
              : nodes.filter((_, i) => i % 2 !== 0)
            const displayNodes = groupNodes.length > 0 ? groupNodes : (nodes.length > 0 ? allNodes : [])

            return (
              <div key={group} style={{ marginBottom: 8 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>
                  {group}
                </p>
                {displayNodes.map((node) => (
                  <IntegrationNode
                    key={node.id}
                    toolName={node.tool_name}
                    integrationMethod={node.integration_method}
                    status={node.status}
                    track="ADR"
                    onEdit={() => setEditModal({ integration: node, defaultTrack: 'ADR' })}
                  />
                ))}
                {displayNodes.length === 0 && (
                  <div style={{ border: '1px dashed #bfdbfe', borderRadius: 6, padding: '6px 10px', fontSize: '0.75rem', color: '#93c5fd', textAlign: 'center' }}>
                    empty
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    } else {
      content = (
        <div>
          {nodes.map((node) => (
            <IntegrationNode
              key={node.id}
              toolName={node.tool_name}
              integrationMethod={node.integration_method}
              status={node.status}
              track={track}
              onEdit={() => setEditModal({ integration: node, defaultTrack: track })}
            />
          ))}
          {nodes.length === 0 && (
            <div style={{
              border: `1px dashed ${headerBorder}`,
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: '0.75rem',
              color: headerBorder,
              textAlign: 'center',
            }}>
              empty
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        key={phase}
        style={{
          minWidth: 192,
          flex: '0 0 192px',
        }}
      >
        <div style={{
          background: headerBg,
          color: headerText,
          padding: '6px 10px',
          borderRadius: '6px 6px 0 0',
          fontSize: '0.78rem',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 0,
        }}>
          {headerLabel}
        </div>
        <div style={{
          border: `1px solid ${headerBorder}`,
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: 10,
          minHeight: 80,
        }}>
          {content}
        </div>
      </div>
    )
  }

  function getADRColumnLabel(phase: ADRPhase): string {
    if (phase === 'Console') return '🐼 BigPanda Console'
    return phase
  }

  function getBiggyColumnLabel(phase: BiggyPhase): string {
    if (phase === 'Console') return '🤖 Biggy AI Console'
    return phase
  }

  return (
    <div>
      {/* ADR Track */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af', margin: 0 }}>ADR Track</h3>
          <button
            onClick={() => setEditModal({ integration: null, defaultTrack: 'ADR' })}
            style={{
              padding: '4px 12px',
              border: '1px solid #bfdbfe',
              borderRadius: 4,
              background: '#eff6ff',
              color: '#1e40af',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            + Add Integration
          </button>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
            {ADR_PHASES.map((phase) =>
              renderPhaseColumn('ADR', phase, getADRColumnLabel(phase), '#1e40af', '#bfdbfe', 'white')
            )}
          </div>
        </div>
      </div>

      {/* Amber divider */}
      <div style={{
        background: '#d97706',
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '8px 0',
        borderRadius: 4,
        margin: '16px 0',
        fontSize: '1rem',
        letterSpacing: '.05em',
      }}>
        ↓ BIGGY AI TRACK ↓
      </div>

      {/* Biggy AI Track */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#6d28d9', margin: 0 }}>Biggy AI Track</h3>
          <button
            onClick={() => setEditModal({ integration: null, defaultTrack: 'Biggy' })}
            style={{
              padding: '4px 12px',
              border: '1px solid #ddd6fe',
              borderRadius: 4,
              background: '#f5f3ff',
              color: '#6d28d9',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            + Add Integration
          </button>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
            {BIGGY_PHASES.map((phase) =>
              renderPhaseColumn('Biggy', phase, getBiggyColumnLabel(phase), '#6d28d9', '#ddd6fe', 'white')
            )}
          </div>
        </div>
      </div>

      {/* Team Onboarding Status */}
      <TeamOnboardingTable
        projectId={projectId}
        rows={onboardingRows}
        onUpdate={onOnboardingUpdate}
      />

      {/* Integration Edit Modal */}
      {editModal !== null && (
        <IntegrationEditModal
          projectId={projectId}
          integration={editModal.integration}
          defaultTrack={editModal.defaultTrack}
          onSave={handleSaveIntegration}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  )
}
