'use client'
import { useState } from 'react'
import { BeforeState } from '@/lib/queries'
import { BeforeStateEditModal } from './BeforeStateEditModal'

interface Props {
  projectId: number
  customer: string
  beforeState: BeforeState | null
  onUpdate: (updated: BeforeState) => void
}

const FLOW_PHASES = [
  'Event Sources',
  'Aggregation Hub',
  'Ticket Creation',
  'Incident Response',
  'Resolution',
]

export function BeforeBigPandaTab({ projectId, customer, beforeState, onUpdate }: Props) {
  const [showEditModal, setShowEditModal] = useState(false)

  const isAmex = customer.toLowerCase().includes('amex')
  const isKaiser = customer.toLowerCase().includes('kaiser')

  const aggregationHubLabel = beforeState?.aggregation_hub_name || 'Aggregation Hub'

  const painPoints: string[] = Array.isArray(beforeState?.pain_points_json)
    ? (beforeState!.pain_points_json as string[]).filter(Boolean)
    : []

  function getPhaseBoxStyle(phase: string): React.CSSProperties {
    if (phase === 'Aggregation Hub' && isAmex) {
      return {
        background: '#fff7ed',
        border: '2px solid #ea580c',
        color: '#ea580c',
        borderRadius: 8,
        padding: '10px 16px',
        minWidth: 120,
        textAlign: 'center',
        fontWeight: 600,
        fontSize: '0.875rem',
      }
    }
    return {
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
      color: '#1e293b',
      borderRadius: 8,
      padding: '10px 16px',
      minWidth: 120,
      textAlign: 'center',
      fontWeight: 500,
      fontSize: '0.875rem',
    }
  }

  function getPhaseLabel(phase: string) {
    if (phase === 'Aggregation Hub') return aggregationHubLabel
    return phase
  }

  return (
    <div>
      {/* Header + Edit button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Before BigPanda</h3>
        <button
          onClick={() => setShowEditModal(true)}
          style={{
            padding: '5px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: 4,
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: '#475569',
          }}
        >
          Edit Before State
        </button>
      </div>

      {/* 5-phase horizontal flow */}
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 'max-content', marginBottom: 8 }}>
          {FLOW_PHASES.map((phase, i) => (
            <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={getPhaseBoxStyle(phase)}>
                {getPhaseLabel(phase)}
              </div>
              {i < FLOW_PHASES.length - 1 && (
                <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '1.1rem' }}>→</span>
              )}
            </div>
          ))}
        </div>

        {/* Kaiser production badge */}
        {isKaiser && (
          <div style={{ marginTop: 8 }}>
            <span style={{
              background: '#dcfce7',
              color: '#14532d',
              border: '1px solid #86efac',
              borderRadius: 9999,
              padding: '4px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}>
              Live in Production
            </span>
          </div>
        )}
      </div>

      {/* Pain point cards */}
      <div style={{ marginTop: 24 }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pain Points
        </h4>
        {painPoints.length === 0 ? (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: '0.875rem',
            color: '#92400e',
          }}>
            No pain points recorded for this customer — edit before-state to add them.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: painPoints.length >= 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {painPoints.slice(0, 6).map((point, i) => (
              <div
                key={i}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  padding: 16,
                  fontSize: '0.875rem',
                  color: '#374151',
                }}
              >
                {point}
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && (
        <BeforeStateEditModal
          projectId={projectId}
          beforeState={beforeState}
          onUpdate={(updated) => {
            onUpdate(updated)
            setShowEditModal(false)
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
