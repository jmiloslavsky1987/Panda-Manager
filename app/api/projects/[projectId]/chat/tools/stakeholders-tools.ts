import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// Factory receives projectId via closure — NEVER in inputSchema
export const createStakeholderTool = (projectId: number) =>
  tool({
    description: 'Create a new stakeholder for this project',
    inputSchema: zodSchema(
      z.object({
        name: z.string().min(1).describe('Stakeholder full name'),
        role: z.string().optional().describe('Role or title'),
        company: z.string().optional().describe('Company or organisation'),
        email: z.string().optional().describe('Email address'),
        slack_id: z.string().optional().describe('Slack user ID or handle'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { stakeholders } = await import('@/db/schema')
      // Stakeholders table has no external_id — only source
      const [created] = await db
        .insert(stakeholders)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: stakeholders.id })
      return { success: true, id: created.id }
    },
  })

export const updateStakeholderTool = (projectId: number) =>
  tool({
    description: 'Update an existing stakeholder by their DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z
          .number()
          .int()
          .describe('Database ID of the stakeholder to update'),
        name: z.string().min(1).optional().describe('Stakeholder full name'),
        role: z.string().optional().describe('Role or title'),
        company: z.string().optional().describe('Company or organisation'),
        email: z.string().optional().describe('Email address'),
        slack_id: z.string().optional().describe('Slack user ID or handle'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { stakeholders } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: stakeholders.project_id })
        .from(stakeholders)
        .where(eq(stakeholders.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Stakeholder not found in this project')
      }
      await db.update(stakeholders).set(patch).where(eq(stakeholders.id, id))
      return { success: true, id }
    },
  })

export const deleteStakeholderTool = (projectId: number) =>
  tool({
    description: 'Delete a stakeholder by their DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z
          .number()
          .int()
          .describe('Database ID of the stakeholder to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { stakeholders } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: stakeholders.project_id })
        .from(stakeholders)
        .where(eq(stakeholders.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Stakeholder not found in this project')
      }
      await db.delete(stakeholders).where(eq(stakeholders.id, id))
      return { success: true, deleted: id }
    },
  })
