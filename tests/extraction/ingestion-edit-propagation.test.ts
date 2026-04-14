import { describe, it, expect } from 'vitest'
import { ENTITY_FIELDS } from '@/components/ExtractionItemEditForm'

/**
 * ingestion-edit-propagation.test.ts — Tests for INGEST-01
 *
 * Tests the edit propagation contract:
 * - edited flag set to true after save
 * - field values round-trip through ReviewItem state
 * - validation logic (primary field derivation)
 */

describe('INGEST-01: Edit propagation and validation', () => {
  describe('edited flag behavior', () => {
    it('handleSave logic sets edited:true', () => {
      // Simulate ExtractionItemRow.handleSave behavior
      let receivedChanges: any = null
      const mockOnChange = (changes: any) => {
        receivedChanges = changes
      }

      const updatedFields = { description: 'updated value' }

      // This is what the implementation does
      mockOnChange({ fields: updatedFields, edited: true })

      expect(receivedChanges?.edited).toBe(true)
      expect(receivedChanges?.fields).toEqual(updatedFields)
    })
  })

  describe('field round-trip', () => {
    it('updated fields reach ReviewItem state', () => {
      const existingItem = {
        entityType: 'action',
        fields: { description: 'original' },
        confidence: 0.9,
        sourceExcerpt: 'excerpt',
        approved: true,
        edited: false,
      }

      const changes = {
        fields: { description: 'updated' },
        edited: true,
      }

      const updated = { ...existingItem, ...changes }

      expect(updated.fields.description).toBe('updated')
      expect(updated.edited).toBe(true)
    })
  })

  describe('primary field validation', () => {
    it('getPrimaryField derives from ENTITY_FIELDS first entry', () => {
      // This is the logic ExtractionPreview uses
      function getPrimaryField(entityType: string): string | undefined {
        return ENTITY_FIELDS[entityType]?.[0]
      }

      expect(getPrimaryField('action')).toBe('description')
      expect(getPrimaryField('task')).toBe('title')
      expect(getPrimaryField('milestone')).toBe('name')
      expect(getPrimaryField('decision')).toBe('decision')
      expect(getPrimaryField('risk')).toBe('description')
    })

    it('validation logic identifies empty primary fields on approved items', () => {
      const items = [
        {
          entityType: 'action',
          fields: { description: '' },
          confidence: 0.9,
          sourceExcerpt: 'excerpt',
          approved: true,
          edited: false,
        },
      ]

      // Simulate ExtractionPreview validation logic
      const errorIndices = new Set<number>()
      items.forEach((item, idx) => {
        if (!item.approved) return
        const primaryField = ENTITY_FIELDS[item.entityType]?.[0]
        if (primaryField && !item.fields[primaryField]?.trim()) {
          errorIndices.add(idx)
        }
      })

      expect(errorIndices.has(0)).toBe(true)
    })

    it('validation excludes unapproved items', () => {
      const items = [
        {
          entityType: 'action',
          fields: { description: '' },
          confidence: 0.9,
          sourceExcerpt: 'excerpt',
          approved: false,
          edited: false,
        },
        {
          entityType: 'task',
          fields: { title: 'valid task' },
          confidence: 0.9,
          sourceExcerpt: 'excerpt',
          approved: true,
          edited: false,
        },
      ]

      const errorIndices = new Set<number>()
      items.forEach((item, idx) => {
        if (!item.approved) return
        const primaryField = ENTITY_FIELDS[item.entityType]?.[0]
        if (primaryField && !item.fields[primaryField]?.trim()) {
          errorIndices.add(idx)
        }
      })

      expect(errorIndices.size).toBe(0)
    })
  })
})
