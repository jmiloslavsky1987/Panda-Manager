import { tool, zodSchema } from 'ai'
import { z } from 'zod'

// All factories receive projectId via closure — NEVER in inputSchema

// ─── Team Pathways ────────────────────────────────────────────────────────────

export const createTeamPathwayTool = (projectId: number) =>
  tool({
    description: 'Create a new team pathway (onboarding route) for this project',
    inputSchema: zodSchema(
      z.object({
        team_name: z.string().min(1).describe('Name of the team'),
        route_steps: z
          .array(z.object({ label: z.string() }))
          .optional()
          .describe('Ordered list of route steps, e.g. [{"label": "Ingest"}, {"label": "Correlation"}]'),
        status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Pathway status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { teamPathways } = await import('@/db/schema')
      const [created] = await db
        .insert(teamPathways)
        .values({
          ...input,
          route_steps: input.route_steps ?? [],
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: teamPathways.id })
      return { success: true, id: created.id }
    },
  })

export const updateTeamPathwayTool = (projectId: number) =>
  tool({
    description: 'Update an existing team pathway by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the team pathway to update'),
        team_name: z.string().min(1).optional().describe('Name of the team'),
        route_steps: z
          .array(z.object({ label: z.string() }))
          .optional()
          .describe('Ordered list of route steps'),
        status: z.enum(['planned', 'in_progress', 'live']).optional().describe('Pathway status'),
        notes: z.string().optional().describe('Additional notes'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { teamPathways } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: teamPathways.project_id })
        .from(teamPathways)
        .where(eq(teamPathways.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Team pathway not found in this project')
      }
      await db.update(teamPathways).set(patch).where(eq(teamPathways.id, id))
      return { success: true, id }
    },
  })

export const deleteTeamPathwayTool = (projectId: number) =>
  tool({
    description: 'Delete a team pathway by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the team pathway to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { teamPathways } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: teamPathways.project_id })
        .from(teamPathways)
        .where(eq(teamPathways.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Team pathway not found in this project')
      }
      await db.delete(teamPathways).where(eq(teamPathways.id, id))
      return { success: true, deleted: id }
    },
  })

// ─── Team Onboarding Status ───────────────────────────────────────────────────

export const createTeamOnboardingStatusTool = (projectId: number) =>
  tool({
    description: 'Create a new onboarding status record for a team',
    inputSchema: zodSchema(
      z.object({
        team_name: z.string().min(1).describe('Name of the team'),
        track: z.string().optional().describe('Onboarding track name'),
        ingest_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Ingest track status'),
        correlation_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Correlation track status'),
        incident_intelligence_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Incident intelligence track status'),
        sn_automation_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('SN automation track status'),
        biggy_ai_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Biggy AI track status'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { teamOnboardingStatus } = await import('@/db/schema')
      const [created] = await db
        .insert(teamOnboardingStatus)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: teamOnboardingStatus.id })
      return { success: true, id: created.id }
    },
  })

export const updateTeamOnboardingStatusTool = (projectId: number) =>
  tool({
    description: 'Update an existing team onboarding status record by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the onboarding status record to update'),
        track: z.string().optional().describe('Onboarding track name'),
        ingest_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Ingest track status'),
        correlation_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Correlation track status'),
        incident_intelligence_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Incident intelligence track status'),
        sn_automation_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('SN automation track status'),
        biggy_ai_status: z
          .enum(['planned', 'in_progress', 'live'])
          .optional()
          .describe('Biggy AI track status'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { teamOnboardingStatus } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: teamOnboardingStatus.project_id })
        .from(teamOnboardingStatus)
        .where(eq(teamOnboardingStatus.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Team onboarding status not found in this project')
      }
      await db.update(teamOnboardingStatus).set(patch).where(eq(teamOnboardingStatus.id, id))
      return { success: true, id }
    },
  })

// ─── Business Outcomes ────────────────────────────────────────────────────────

export const createBusinessOutcomeTool = (projectId: number) =>
  tool({
    description: 'Create a new business outcome for this project',
    inputSchema: zodSchema(
      z.object({
        title: z.string().min(1).describe('Business outcome title'),
        track: z.string().min(1).describe('Track this outcome belongs to'),
        description: z.string().optional().describe('Detailed description'),
        delivery_status: z
          .enum(['planned', 'in_progress', 'live', 'blocked'])
          .optional()
          .describe('Delivery status'),
        mapping_note: z.string().optional().describe('Note on how this maps to business goals'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { businessOutcomes } = await import('@/db/schema')
      const [created] = await db
        .insert(businessOutcomes)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: businessOutcomes.id })
      return { success: true, id: created.id }
    },
  })

export const updateBusinessOutcomeTool = (projectId: number) =>
  tool({
    description: 'Update an existing business outcome by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the business outcome to update'),
        title: z.string().min(1).optional().describe('Business outcome title'),
        track: z.string().min(1).optional().describe('Track this outcome belongs to'),
        description: z.string().optional().describe('Detailed description'),
        delivery_status: z
          .enum(['planned', 'in_progress', 'live', 'blocked'])
          .optional()
          .describe('Delivery status'),
        mapping_note: z.string().optional().describe('Note on how this maps to business goals'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { businessOutcomes } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: businessOutcomes.project_id })
        .from(businessOutcomes)
        .where(eq(businessOutcomes.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Business outcome not found in this project')
      }
      await db.update(businessOutcomes).set(patch).where(eq(businessOutcomes.id, id))
      return { success: true, id }
    },
  })

export const deleteBusinessOutcomeTool = (projectId: number) =>
  tool({
    description: 'Delete a business outcome by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the business outcome to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { businessOutcomes } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: businessOutcomes.project_id })
        .from(businessOutcomes)
        .where(eq(businessOutcomes.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Business outcome not found in this project')
      }
      await db.delete(businessOutcomes).where(eq(businessOutcomes.id, id))
      return { success: true, deleted: id }
    },
  })

// ─── E2E Workflows ────────────────────────────────────────────────────────────

export const createE2eWorkflowTool = (projectId: number) =>
  tool({
    description: 'Create a new end-to-end workflow for a team',
    inputSchema: zodSchema(
      z.object({
        team_name: z.string().min(1).describe('Name of the team this workflow belongs to'),
        workflow_name: z.string().min(1).describe('Name of the workflow'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { e2eWorkflows } = await import('@/db/schema')
      const [created] = await db
        .insert(e2eWorkflows)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: e2eWorkflows.id })
      return { success: true, id: created.id }
    },
  })

export const deleteE2eWorkflowTool = (projectId: number) =>
  tool({
    description: 'Delete an end-to-end workflow by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the workflow to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { e2eWorkflows } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: e2eWorkflows.project_id })
        .from(e2eWorkflows)
        .where(eq(e2eWorkflows.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('E2E workflow not found in this project')
      }
      await db.delete(e2eWorkflows).where(eq(e2eWorkflows.id, id))
      return { success: true, deleted: id }
    },
  })

// ─── Workflow Steps ───────────────────────────────────────────────────────────

export const createWorkflowStepTool = (projectId: number) =>
  tool({
    description: 'Create a new step in an existing E2E workflow',
    inputSchema: zodSchema(
      z.object({
        workflow_id: z
          .number()
          .int()
          .describe('Database ID of the parent E2E workflow'),
        label: z.string().min(1).describe('Step label / name'),
        track: z.string().optional().describe('Track this step maps to'),
        status: z.string().optional().describe('Step status'),
        position: z.number().int().optional().describe('Display order position'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { workflowSteps, e2eWorkflows } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      // Verify the parent workflow belongs to this project
      const [workflow] = await db
        .select({ project_id: e2eWorkflows.project_id })
        .from(e2eWorkflows)
        .where(eq(e2eWorkflows.id, input.workflow_id))
        .limit(1)
      if (!workflow || workflow.project_id !== projectId) {
        throw new Error('E2E workflow not found in this project')
      }
      const [created] = await db
        .insert(workflowSteps)
        .values({ ...input })
        .returning({ id: workflowSteps.id })
      return { success: true, id: created.id }
    },
  })

export const updateWorkflowStepTool = (projectId: number) =>
  tool({
    description: 'Update an existing workflow step by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the workflow step to update'),
        label: z.string().min(1).optional().describe('Step label / name'),
        track: z.string().optional().describe('Track this step maps to'),
        status: z.string().optional().describe('Step status'),
        position: z.number().int().optional().describe('Display order position'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { workflowSteps, e2eWorkflows } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      // Verify ownership via parent workflow
      const [step] = await db
        .select({ workflow_id: workflowSteps.workflow_id })
        .from(workflowSteps)
        .where(eq(workflowSteps.id, id))
        .limit(1)
      if (!step) throw new Error('Workflow step not found')
      const [workflow] = await db
        .select({ project_id: e2eWorkflows.project_id })
        .from(e2eWorkflows)
        .where(eq(e2eWorkflows.id, step.workflow_id))
        .limit(1)
      if (!workflow || workflow.project_id !== projectId) {
        throw new Error('Workflow step not found in this project')
      }
      await db.update(workflowSteps).set(patch).where(eq(workflowSteps.id, id))
      return { success: true, id }
    },
  })

export const deleteWorkflowStepTool = (projectId: number) =>
  tool({
    description: 'Delete a workflow step by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the workflow step to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { workflowSteps, e2eWorkflows } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      // Verify ownership via parent workflow
      const [step] = await db
        .select({ workflow_id: workflowSteps.workflow_id })
        .from(workflowSteps)
        .where(eq(workflowSteps.id, id))
        .limit(1)
      if (!step) throw new Error('Workflow step not found')
      const [workflow] = await db
        .select({ project_id: e2eWorkflows.project_id })
        .from(e2eWorkflows)
        .where(eq(e2eWorkflows.id, step.workflow_id))
        .limit(1)
      if (!workflow || workflow.project_id !== projectId) {
        throw new Error('Workflow step not found in this project')
      }
      await db.delete(workflowSteps).where(eq(workflowSteps.id, id))
      return { success: true, deleted: id }
    },
  })

// ─── Focus Areas ──────────────────────────────────────────────────────────────

export const createFocusAreaTool = (projectId: number) =>
  tool({
    description: 'Create a new focus area for this project',
    inputSchema: zodSchema(
      z.object({
        title: z.string().min(1).describe('Focus area title'),
        tracks: z.string().optional().describe('Comma-separated tracks this applies to'),
        why_it_matters: z.string().optional().describe('Why this focus area matters'),
        current_status: z.string().optional().describe('Current status description'),
        next_step: z.string().optional().describe('Recommended next step'),
        bp_owner: z.string().optional().describe('BigPanda owner name'),
        customer_owner: z.string().optional().describe('Customer owner name'),
      })
    ),
    needsApproval: true,
    execute: async (input) => {
      const { default: db } = await import('@/db')
      const { focusAreas } = await import('@/db/schema')
      const [created] = await db
        .insert(focusAreas)
        .values({
          ...input,
          project_id: projectId,
          source: 'chat',
        })
        .returning({ id: focusAreas.id })
      return { success: true, id: created.id }
    },
  })

export const updateFocusAreaTool = (projectId: number) =>
  tool({
    description: 'Update an existing focus area by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the focus area to update'),
        title: z.string().min(1).optional().describe('Focus area title'),
        tracks: z.string().optional().describe('Comma-separated tracks this applies to'),
        why_it_matters: z.string().optional().describe('Why this focus area matters'),
        current_status: z.string().optional().describe('Current status description'),
        next_step: z.string().optional().describe('Recommended next step'),
        bp_owner: z.string().optional().describe('BigPanda owner name'),
        customer_owner: z.string().optional().describe('Customer owner name'),
      })
    ),
    needsApproval: true,
    execute: async ({ id, ...patch }) => {
      const { default: db } = await import('@/db')
      const { focusAreas } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: focusAreas.project_id })
        .from(focusAreas)
        .where(eq(focusAreas.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Focus area not found in this project')
      }
      await db.update(focusAreas).set(patch).where(eq(focusAreas.id, id))
      return { success: true, id }
    },
  })

export const deleteFocusAreaTool = (projectId: number) =>
  tool({
    description: 'Delete a focus area by its DB ID',
    inputSchema: zodSchema(
      z.object({
        id: z.number().int().describe('Database ID of the focus area to delete'),
      })
    ),
    needsApproval: true,
    execute: async ({ id }) => {
      const { default: db } = await import('@/db')
      const { focusAreas } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [existing] = await db
        .select({ project_id: focusAreas.project_id })
        .from(focusAreas)
        .where(eq(focusAreas.id, id))
        .limit(1)
      if (!existing || existing.project_id !== projectId) {
        throw new Error('Focus area not found in this project')
      }
      await db.delete(focusAreas).where(eq(focusAreas.id, id))
      return { success: true, deleted: id }
    },
  })
