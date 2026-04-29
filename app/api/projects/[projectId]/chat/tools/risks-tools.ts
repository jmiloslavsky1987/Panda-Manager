import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// Factory receives projectId via closure — NEVER in inputSchema
export const createRiskTool = (projectId: number) =>
  tool({
    description: 'Create a new risk for this project',
    inputSchema: zodSchema(
      z.object({
        description: z.string().min(1).describe('Risk description'),
        severity: z
          .enum(['low', 'medium', 'high', 'critical'])
          .optional()
          .describe('Risk severity level'),
        owner: z.string().optional().describe('Person responsible for this risk'),
        mitigation: z.string().optional().describe('Mitigation plan or actions'),
        likelihood: z.string().optional().describe('Likelihood of occurrence'),
        impact: z.string().optional().describe('Impact if the risk materialises'),
        target_date: z
          .string()
          .optional()
          .describe('Target date to resolve (ISO, TBD, or quarter)'),
        status: z
          .enum(['open', 'mitigated', 'resolved', 'accepted'])
          .optional()
          .describe('Risk status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { risks } = await import('@/db/schema')
      const [created] = await db
        .insert(risks)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
          external_id: `R-CHAT-${Date.now()}`,
        })
        .returning({ id: risks.id })
      return { success: true, id: created.id }
    },
  })

export const updateRiskTool = (projectId: number) =>
  tool({
    description: 'Update an existing risk by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the risk to update'),
        description: z.string().min(1).optional().describe('Risk description'),
        severity: z
          .enum(['low', 'medium', 'high', 'critical'])
          .optional()
          .describe('Risk severity level'),
        owner: z.string().optional().describe('Person responsible for this risk'),
        mitigation: z.string().optional().describe('Mitigation plan or actions'),
        likelihood: z.string().optional().describe('Likelihood of occurrence'),
        impact: z.string().optional().describe('Impact if the risk materialises'),
        target_date: z
          .string()
          .optional()
          .describe('Target date to resolve (ISO, TBD, or quarter)'),
        status: z
          .enum(['open', 'mitigated', 'resolved', 'accepted'])
          .optional()
          .describe('Risk status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { risks } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: risks.project_id })
        .from(risks)
        .where(eq(risks.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Risk not found in this project')
      }
      await db.update(risks).set(patch).where(eq(risks.id, id))
      return { success: true, id }
    },
  })

export const deleteRiskTool = (projectId: number) =>
  tool({
    description: 'Delete a risk by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the risk to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { risks } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: risks.project_id })
        .from(risks)
        .where(eq(risks.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Risk not found in this project')
      }
      await db.delete(risks).where(eq(risks.id, id))
      return { success: true, deleted: id }
    },
  })
