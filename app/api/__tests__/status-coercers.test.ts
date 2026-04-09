import { describe, it, expect } from 'vitest'
// This import will FAIL until Plan 02 creates the coercers module
import { coerceWbsItemStatus, coerceArchNodeStatus } from '../ingestion/approve/coercers'

describe('coerceWbsItemStatus', () => {
  it('normalizes "in_progress" → "in_progress"', () => {
    expect(coerceWbsItemStatus('in_progress')).toBe('in_progress')
  })

  it('normalizes "In Progress" → "in_progress"', () => {
    expect(coerceWbsItemStatus('In Progress')).toBe('in_progress')
  })

  it('normalizes "completed" → "complete"', () => {
    expect(coerceWbsItemStatus('completed')).toBe('complete')
  })

  it('normalizes "done" → "complete"', () => {
    expect(coerceWbsItemStatus('done')).toBe('complete')
  })

  it('normalizes "not started" → "not_started"', () => {
    expect(coerceWbsItemStatus('not started')).toBe('not_started')
  })

  it('returns null for "blocked" (not in wbsItemStatus enum)', () => {
    expect(coerceWbsItemStatus('blocked')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(coerceWbsItemStatus(null)).toBeNull()
  })
})

describe('coerceArchNodeStatus', () => {
  it('normalizes "live" → "live"', () => {
    expect(coerceArchNodeStatus('live')).toBe('live')
  })

  it('normalizes "production" → "live"', () => {
    expect(coerceArchNodeStatus('production')).toBe('live')
  })

  it('normalizes "in_progress" → "in_progress"', () => {
    expect(coerceArchNodeStatus('in_progress')).toBe('in_progress')
  })

  it('normalizes "planned" → "planned"', () => {
    expect(coerceArchNodeStatus('planned')).toBe('planned')
  })

  it('returns null for unknown input', () => {
    expect(coerceArchNodeStatus('unknown')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(coerceArchNodeStatus(null)).toBeNull()
  })
})
