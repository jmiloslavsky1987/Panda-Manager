import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// Factory receives projectId via closure — NEVER in inputSchema
export const createTaskTool = (projectId: number) =>
  tool({
    description: 'Create a new task for this project',
    inputSchema: zodSchema(
      z.object({
        title: z.string().min(1).describe('Task title'),
        description: z.string().optional().describe('Task description'),
        owner: z.string().optional().describe('Person responsible'),
        due: z.string().optional().describe('Due date (ISO, TBD, or quarter)'),
        priority: z.string().optional().describe('Priority level (e.g. high, medium, low)'),
        type: z.string().optional().describe('Task type or category'),
        phase: z.string().optional().describe('Project phase this task belongs to'),
        status: z.string().optional().describe('Task status (e.g. todo, in_progress, done)'),
        start_date: z
          .string()
          .optional()
          .describe('Start date (ISO, TBD, or quarter)'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { tasks } = await import('@/db/schema')
      // Tasks table has no external_id — source is nullable in schema
      const [created] = await db
        .insert(tasks)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: tasks.id })
      return { success: true, id: created.id }
    },
  })

export const updateTaskTool = (projectId: number) =>
  tool({
    description: 'Update an existing task by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the task to update'),
        title: z.string().min(1).optional().describe('Task title'),
        description: z.string().optional().describe('Task description'),
        owner: z.string().optional().describe('Person responsible'),
        due: z.string().optional().describe('Due date (ISO, TBD, or quarter)'),
        priority: z.string().optional().describe('Priority level'),
        type: z.string().optional().describe('Task type or category'),
        phase: z.string().optional().describe('Project phase this task belongs to'),
        status: z.string().optional().describe('Task status'),
        start_date: z
          .string()
          .optional()
          .describe('Start date (ISO, TBD, or quarter)'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { tasks } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: tasks.project_id })
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Task not found in this project')
      }
      await db.update(tasks).set(patch).where(eq(tasks.id, id))
      return { success: true, id }
    },
  })

export const deleteTaskTool = (projectId: number) =>
  tool({
    description: 'Delete a task by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the task to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { tasks } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: tasks.project_id })
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Task not found in this project')
      }
      await db.delete(tasks).where(eq(tasks.id, id))
      return { success: true, deleted: id }
    },
  })
