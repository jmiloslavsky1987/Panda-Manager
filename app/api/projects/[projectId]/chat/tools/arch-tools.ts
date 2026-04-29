import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// All factories receive projectId via closure — NEVER in inputSchema

// ─── Architecture Integrations ────────────────────────────────────────────────

export const createArchIntegrationTool = (projectId: number) =>
  tool({
    description: 'Create a new architecture integration entry for this project',
    inputSchema: zodSchema(
      z.object({
        tool_name: z.string().min(1).describe('Name of the tool or integration'),
        track: z.string().min(1).describe('Architecture track this integration belongs to'),
        phase: z.string().optional().describe('Deployment phase'),
        integration_group: z
          .string()
          .optional()
          .describe('Integration group or category'),
        status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Integration status'),
        integration_method: z
          .string()
          .optional()
          .describe('Method of integration (e.g., API, webhook, agent)'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { architectureIntegrations } = await import('@/db/schema')
      const [created] = await db
        .insert(architectureIntegrations)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: architectureIntegrations.id })
      return { success: true, id: created.id }
    },
  })

export const updateArchIntegrationTool = (projectId: number) =>
  tool({
    description: 'Update an existing architecture integration by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z
          .number()
          .int()
          .describe('Database ID of the architecture integration to update'),
        tool_name: z.string().min(1).optional().describe('Name of the tool or integration'),
        track: z.string().min(1).optional().describe('Architecture track'),
        phase: z.string().optional().describe('Deployment phase'),
        integration_group: z.string().optional().describe('Integration group or category'),
        status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Integration status'),
        integration_method: z.string().optional().describe('Method of integration'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { architectureIntegrations } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: architectureIntegrations.project_id })
        .from(architectureIntegrations)
        .where(eq(architectureIntegrations.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Architecture integration not found in this project')
      }
      await db
        .update(architectureIntegrations)
        .set(patch)
        .where(eq(architectureIntegrations.id, id))
      return { success: true, id }
    },
  })

export const deleteArchIntegrationTool = (projectId: number) =>
  tool({
    description: 'Delete an architecture integration by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z
          .number()
          .int()
          .describe('Database ID of the architecture integration to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { architectureIntegrations } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: architectureIntegrations.project_id })
        .from(architectureIntegrations)
        .where(eq(architectureIntegrations.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Architecture integration not found in this project')
      }
      await db.delete(architectureIntegrations).where(eq(architectureIntegrations.id, id))
      return { success: true, deleted: id }
    },
  })

// ─── Architecture Nodes ───────────────────────────────────────────────────────

/**
 * CRITICAL: Claude provides track_name (string), NOT track_id (integer).
 * The execute() function resolves track_name → track_id server-side via archTracks table.
 */
export const createArchNodeTool = (projectId: number) =>
  tool({
    description: 'Create a new architecture node in a named track',
    inputSchema: zodSchema(
      z.object({
        name: z.string().min(1).describe('Node name'),
        track_name: z
          .string()
          .min(1)
          .describe('Architecture track name (e.g. "Biggy AI", "Ingest")'),
        status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Node status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { archNodes, archTracks } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')

      // Resolve track_name → track_id (scoped to this project)
      const [track] = await db
        .select({ id: archTracks.id })
        .from(archTracks)
        .where(and(eq(archTracks.project_id, projectId), eq(archTracks.name, input.track_name)))
        .limit(1)
      if (!track) {
        throw new Error(
          `No architecture track named "${input.track_name}" in this project`
        )
      }

      const { track_name, ...rest } = input
      const [created] = await db
        .insert(archNodes)
        .values({
          ...rest,
          track_id: track.id,
          project_id: projectId,
        })
        .returning({ id: archNodes.id })
      return { success: true, id: created.id }
    },
  })

export const updateArchNodeTool = (projectId: number) =>
  tool({
    description: 'Update an existing architecture node by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the architecture node to update'),
        name: z.string().min(1).optional().describe('Node name'),
        status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Node status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { archNodes } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: archNodes.project_id })
        .from(archNodes)
        .where(eq(archNodes.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Architecture node not found in this project')
      }
      await db.update(archNodes).set(patch).where(eq(archNodes.id, id))
      return { success: true, id }
    },
  })

export const deleteArchNodeTool = (projectId: number) =>
  tool({
    description: 'Delete an architecture node by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the architecture node to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { archNodes } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: archNodes.project_id })
        .from(archNodes)
        .where(eq(archNodes.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Architecture node not found in this project')
      }
      await db.delete(archNodes).where(eq(archNodes.id, id))
      return { success: true, deleted: id }
    },
  })
