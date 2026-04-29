import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// Factory receives projectId via closure — NEVER in inputSchema
export const createMilestoneTool = (projectId: number) =>
  tool({
    description: 'Create a new milestone for this project',
    inputSchema: zodSchema(
      z.object({
        name: z.string().min(1).describe('Milestone name'),
        status: z
          .enum(['on_track', 'at_risk', 'complete', 'missed'])
          .optional()
          .describe('Milestone status'),
        target: z
          .string()
          .optional()
          .describe('Target description or timeframe'),
        date: z
          .string()
          .optional()
          .describe('Target date (ISO, TBD, or quarter)'),
        notes: z.string().optional().describe('Additional notes'),
        owner: z.string().optional().describe('Person responsible'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { milestones } = await import('@/db/schema')
      const [created] = await db
        .insert(milestones)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
          external_id: `M-CHAT-${Date.now()}`,
        })
        .returning({ id: milestones.id })
      return { success: true, id: created.id }
    },
  })

export const updateMilestoneTool = (projectId: number) =>
  tool({
    description: 'Update an existing milestone by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the milestone to update'),
        name: z.string().min(1).optional().describe('Milestone name'),
        status: z
          .enum(['on_track', 'at_risk', 'complete', 'missed'])
          .optional()
          .describe('Milestone status'),
        target: z
          .string()
          .optional()
          .describe('Target description or timeframe'),
        date: z
          .string()
          .optional()
          .describe('Target date (ISO, TBD, or quarter)'),
        notes: z.string().optional().describe('Additional notes'),
        owner: z.string().optional().describe('Person responsible'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { milestones } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: milestones.project_id })
        .from(milestones)
        .where(eq(milestones.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Milestone not found in this project')
      }
      await db.update(milestones).set(patch).where(eq(milestones.id, id))
      return { success: true, id }
    },
  })

export const deleteMilestoneTool = (projectId: number) =>
  tool({
    description: 'Delete a milestone by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the milestone to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { milestones } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: milestones.project_id })
        .from(milestones)
        .where(eq(milestones.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Milestone not found in this project')
      }
      await db.delete(milestones).where(eq(milestones.id, id))
      return { success: true, deleted: id }
    },
  })
