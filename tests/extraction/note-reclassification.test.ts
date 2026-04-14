import { describe, it, expect } from 'vitest'

/**
 * note-reclassification.test.ts — RED stubs for INGEST-05
 *
 * Tests the note reclassification contract:
 * - content→primary field mappings for all 5 reclassification targets
 * - entityType state change
 * - field mapping logic (content becomes primary field, author/date cleared)
 *
 * RED contract: Tests assert expected behavior. Plan 02 must export these from ExtractionItemEditForm.
 */

describe('INGEST-05: Note reclassification field mapping', () => {
  describe('NOTE_RECLASSIFY_PRIMARY_FIELD mappings', () => {
    it('reclassify note to action: content maps to description', () => {
      // RED: Plan 02 should export NOTE_RECLASSIFY_PRIMARY_FIELD from ExtractionItemEditForm
      // export const NOTE_RECLASSIFY_PRIMARY_FIELD: Record<string, string> = {
      //   action: 'description',
      //   task: 'title',
      //   milestone: 'name',
      //   decision: 'decision',
      //   risk: 'description',
      // }

      // import { NOTE_RECLASSIFY_PRIMARY_FIELD } from '@/components/ExtractionItemEditForm'
      // expect(NOTE_RECLASSIFY_PRIMARY_FIELD['action']).toBe('description')

      // RED: Force failure
      expect(true).toBe(false) // TODO Plan 02: Replace with real import
    })

    it('reclassify note to task: content maps to title', () => {
      // import { NOTE_RECLASSIFY_PRIMARY_FIELD } from '@/components/ExtractionItemEditForm'
      // expect(NOTE_RECLASSIFY_PRIMARY_FIELD['task']).toBe('title')

      expect(true).toBe(false) // TODO Plan 02
    })

    it('reclassify note to milestone: content maps to name', () => {
      // import { NOTE_RECLASSIFY_PRIMARY_FIELD } from '@/components/ExtractionItemEditForm'
      // expect(NOTE_RECLASSIFY_PRIMARY_FIELD['milestone']).toBe('name')

      expect(true).toBe(false) // TODO Plan 02
    })

    it('reclassify note to decision: content maps to decision', () => {
      // import { NOTE_RECLASSIFY_PRIMARY_FIELD } from '@/components/ExtractionItemEditForm'
      // expect(NOTE_RECLASSIFY_PRIMARY_FIELD['decision']).toBe('decision')

      expect(true).toBe(false) // TODO Plan 02
    })

    it('reclassify note to risk: content maps to description', () => {
      // import { NOTE_RECLASSIFY_PRIMARY_FIELD } from '@/components/ExtractionItemEditForm'
      // expect(NOTE_RECLASSIFY_PRIMARY_FIELD['risk']).toBe('description')

      expect(true).toBe(false) // TODO Plan 02
    })
  })

  describe('field mapping logic', () => {
    it('reclassify field mapping: content value becomes primary field value', () => {
      // RED: Plan 02 should implement reclassification logic
      // Given note with content:'Meeting notes', reclassify to action
      // Result fields = { description: 'Meeting notes' }

      const noteItem = {
        entityType: 'note',
        fields: { content: 'Meeting notes', author: 'Alice', date: '2026-04-14' },
        confidence: 0.9,
        sourceExcerpt: 'excerpt',
      }

      // Plan 02 should provide this logic (in ExtractionPreview or ExtractionItemEditForm)
      // const reclassified = reclassifyNote(noteItem, 'action')
      // expect(reclassified.entityType).toBe('action')
      // expect(reclassified.fields.description).toBe('Meeting notes')
      // expect(reclassified.fields.author).toBeUndefined()

      // RED: Force failure
      expect(true).toBe(false) // TODO Plan 02: Implement reclassifyNote
    })

    it('reclassify field mapping: author and date are cleared', () => {
      // RED: Tests that note-specific fields (author, date) are removed after reclassification

      const noteItem = {
        entityType: 'note',
        fields: { content: 'Meeting notes', author: 'Alice', date: '2026-04-14' },
        confidence: 0.9,
        sourceExcerpt: 'excerpt',
      }

      // const reclassified = reclassifyNote(noteItem, 'action')
      // expect(reclassified.fields.author).toBeUndefined()
      // expect(reclassified.fields.date).toBeUndefined()

      // RED: Force failure
      expect(true).toBe(false) // TODO Plan 02: Implement field clearing logic
    })
  })

  describe('NOTE_RECLASSIFY_TARGETS array', () => {
    it('NOTE_RECLASSIFY_TARGETS has exactly 5 entries', () => {
      // RED: Plan 02 should export NOTE_RECLASSIFY_TARGETS from ExtractionItemEditForm
      // export const NOTE_RECLASSIFY_TARGETS = ['action', 'task', 'milestone', 'decision', 'risk']

      // import { NOTE_RECLASSIFY_TARGETS } from '@/components/ExtractionItemEditForm'
      // expect(NOTE_RECLASSIFY_TARGETS).toHaveLength(5)
      // expect(NOTE_RECLASSIFY_TARGETS).toContain('action')
      // expect(NOTE_RECLASSIFY_TARGETS).toContain('task')
      // expect(NOTE_RECLASSIFY_TARGETS).toContain('milestone')
      // expect(NOTE_RECLASSIFY_TARGETS).toContain('decision')
      // expect(NOTE_RECLASSIFY_TARGETS).toContain('risk')

      // RED: Force failure
      expect(true).toBe(false) // TODO Plan 02: Export NOTE_RECLASSIFY_TARGETS
    })
  })
})
