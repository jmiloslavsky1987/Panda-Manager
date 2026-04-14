import { describe, it, expect } from 'vitest'
import { NOTE_RECLASSIFY_PRIMARY_FIELD, NOTE_RECLASSIFY_TARGETS } from '@/components/ExtractionItemEditForm'

/**
 * note-reclassification.test.ts — Tests for INGEST-05
 *
 * Tests the note reclassification contract:
 * - content→primary field mappings for all 5 reclassification targets
 * - NOTE_RECLASSIFY_TARGETS array
 *
 * Field mapping logic is tested via Task 2 (ingestion-edit-propagation.test.ts)
 */

describe('INGEST-05: Note reclassification field mapping', () => {
  describe('NOTE_RECLASSIFY_PRIMARY_FIELD mappings', () => {
    it('reclassify note to action: content maps to description', () => {
      expect(NOTE_RECLASSIFY_PRIMARY_FIELD['action']).toBe('description')
    })

    it('reclassify note to task: content maps to title', () => {
      expect(NOTE_RECLASSIFY_PRIMARY_FIELD['task']).toBe('title')
    })

    it('reclassify note to milestone: content maps to name', () => {
      expect(NOTE_RECLASSIFY_PRIMARY_FIELD['milestone']).toBe('name')
    })

    it('reclassify note to decision: content maps to decision', () => {
      expect(NOTE_RECLASSIFY_PRIMARY_FIELD['decision']).toBe('decision')
    })

    it('reclassify note to risk: content maps to description', () => {
      expect(NOTE_RECLASSIFY_PRIMARY_FIELD['risk']).toBe('description')
    })
  })

  describe('NOTE_RECLASSIFY_TARGETS array', () => {
    it('NOTE_RECLASSIFY_TARGETS has exactly 5 entries', () => {
      expect(NOTE_RECLASSIFY_TARGETS).toHaveLength(5)
      expect(NOTE_RECLASSIFY_TARGETS).toContain('action')
      expect(NOTE_RECLASSIFY_TARGETS).toContain('task')
      expect(NOTE_RECLASSIFY_TARGETS).toContain('milestone')
      expect(NOTE_RECLASSIFY_TARGETS).toContain('decision')
      expect(NOTE_RECLASSIFY_TARGETS).toContain('risk')
    })
  })
})
