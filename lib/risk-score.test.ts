import { describe, it, expect } from 'vitest'
import { computeRiskScore } from './risk-score'

describe('computeRiskScore', () => {
  it('returns N/A for null likelihood and null impact', () => {
    const result = computeRiskScore(null, null)
    expect(result.score).toBeNull()
    expect(result.label).toBe('N/A')
    expect(result.colorClass).toBe('bg-zinc-100 text-zinc-500')
  })

  it('returns N/A for undefined likelihood and undefined impact', () => {
    const result = computeRiskScore(undefined, undefined)
    expect(result.score).toBeNull()
    expect(result.label).toBe('N/A')
    expect(result.colorClass).toBe('bg-zinc-100 text-zinc-500')
  })

  it('returns N/A when likelihood is null (impact provided)', () => {
    const result = computeRiskScore(null, 'high')
    expect(result.score).toBeNull()
    expect(result.label).toBe('N/A')
  })

  it('returns N/A when impact is null (likelihood provided)', () => {
    const result = computeRiskScore('high', null)
    expect(result.score).toBeNull()
    expect(result.label).toBe('N/A')
  })

  it('returns N/A for invalid/unknown strings', () => {
    const result = computeRiskScore('extreme', 'catastrophic')
    expect(result.score).toBeNull()
    expect(result.label).toBe('N/A')
  })

  it('returns score=1, label=Low for low x low', () => {
    const result = computeRiskScore('low', 'low')
    expect(result.score).toBe(1)
    expect(result.label).toBe('Low')
    expect(result.colorClass).toBe('bg-green-100 text-green-800')
  })

  it('returns score=2, label=Low for low x medium', () => {
    const result = computeRiskScore('low', 'medium')
    expect(result.score).toBe(2)
    expect(result.label).toBe('Low')
    expect(result.colorClass).toBe('bg-green-100 text-green-800')
  })

  it('returns score=3, label=Medium for high x low', () => {
    const result = computeRiskScore('high', 'low')
    expect(result.score).toBe(3)
    expect(result.label).toBe('Medium')
    expect(result.colorClass).toBe('bg-amber-100 text-amber-800')
  })

  it('returns score=4, label=Medium for medium x medium', () => {
    const result = computeRiskScore('medium', 'medium')
    expect(result.score).toBe(4)
    expect(result.label).toBe('Medium')
    expect(result.colorClass).toBe('bg-amber-100 text-amber-800')
  })

  it('returns score=6, label=High for high x medium', () => {
    const result = computeRiskScore('high', 'medium')
    expect(result.score).toBe(6)
    expect(result.label).toBe('High')
    expect(result.colorClass).toBe('bg-red-100 text-red-800')
  })

  it('returns score=9, label=Critical for high x high', () => {
    const result = computeRiskScore('high', 'high')
    expect(result.score).toBe(9)
    expect(result.label).toBe('Critical')
    expect(result.colorClass).toBe('bg-red-100 text-red-800')
  })

  it('is case-insensitive (uppercase inputs)', () => {
    const result = computeRiskScore('HIGH', 'HIGH')
    expect(result.score).toBe(9)
    expect(result.label).toBe('Critical')
  })

  it('returns score=2, label=Low for medium x low', () => {
    const result = computeRiskScore('medium', 'low')
    expect(result.score).toBe(2)
    expect(result.label).toBe('Low')
    expect(result.colorClass).toBe('bg-green-100 text-green-800')
  })

  it('returns score=4, label=Medium for low x high (2 is low, not medium for 1*3)', () => {
    // low=1, high=3 => 1*3 = 3 => Medium
    const result = computeRiskScore('low', 'high')
    expect(result.score).toBe(3)
    expect(result.label).toBe('Medium')
    expect(result.colorClass).toBe('bg-amber-100 text-amber-800')
  })
})
