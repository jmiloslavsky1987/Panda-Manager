import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// Factory receives projectId via closure — NEVER in inputSchema
export const createActionTool = (projectId: number) =>
  tool({
    description: 'Create a new action item for this project',
    inputSchema: zodSchema(
      z.object({
        description: z.string().min(1).describe('Action description'),
        owner: z.string().optional().describe('Person responsible'),
        due: z.string().optional().describe('Due date (ISO, TBD, or quarter)'),
        status: z
          .enum(['open', 'in_progress', 'closed', 'overdue'])
          .optional()
          .default('open')
          .describe('Action status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { actions } = await import('@/db/schema')
      const [created] = await db
        .insert(actions)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
          external_id: `A-CHAT-${Date.now()}`,
        })
        .returning({ id: actions.id })
      return { success: true, id: created.id }
    },
  })

export const updateActionTool = (projectId: number) =>
  tool({
    description: 'Update an existing action item by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the action to update'),
        description: z.string().min(1).optional().describe('Action description'),
        owner: z.string().optional().describe('Person responsible'),
        due: z.string().optional().describe('Due date (ISO, TBD, or quarter)'),
        status: z
          .enum(['open', 'in_progress', 'closed', 'overdue'])
          .optional()
          .describe('Action status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { actions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: actions.project_id })
        .from(actions)
        .where(eq(actions.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Action not found in this project')
      }
      await db.update(actions).set(patch).where(eq(actions.id, id))
      return { success: true, id }
    },
  })

export const deleteActionTool = (projectId: number) =>
  tool({
    description: 'Delete an action item by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the action to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { actions } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: actions.project_id })
        .from(actions)
        .where(eq(actions.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Action not found in this project')
      }
      await db.delete(actions).where(eq(actions.id, id))
      return { success: true, deleted: id }
    },
  })
