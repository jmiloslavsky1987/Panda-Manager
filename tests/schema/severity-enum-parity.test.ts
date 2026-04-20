import { describe, it, expect } from 'vitest'
import { SEVERITY_OPTIONS } from '@/components/RisksTableClient'

/**
 * Asserts that SEVERITY_OPTIONS component constant values exactly match
 * the DB severityEnum values. If the DB enum changes, this test fails,
 * preventing silent divergence between DB storage and UI labels.
 *
 * DB enum (db/schema.ts): severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical'])
 */
describe('Severity enum parity', () => {
  const DB_SEVERITY_VALUES = ['low', 'medium', 'high', 'critical'] as const

  it('SEVERITY_OPTIONS values exactly match DB enum values', () => {
    const componentValues = SEVERITY_OPTIONS.map(o => o.value)
    expect(componentValues).toEqual(expect.arrayContaining([...DB_SEVERITY_VALUES]))
    expect(DB_SEVERITY_VALUES).toEqual(expect.arrayContaining(componentValues))
    expect(componentValues).toHaveLength(DB_SEVERITY_VALUES.length)
  })

  it('No SEVERITY_OPTIONS value is missing from DB enum', () => {
    SEVERITY_OPTIONS.forEach(opt => {
      expect(DB_SEVERITY_VALUES).toContain(opt.value)
    })
  })
})
