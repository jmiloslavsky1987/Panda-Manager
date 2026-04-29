import { createActionTool, updateActionTool, deleteActionTool } from './actions-tools'
import { createMilestoneTool, updateMilestoneTool, deleteMilestoneTool } from './milestones-tools'
import { createRiskTool, updateRiskTool, deleteRiskTool } from './risks-tools'
import {
  createStakeholderTool,
  updateStakeholderTool,
  deleteStakeholderTool,
} from './stakeholders-tools'
import { createTaskTool, updateTaskTool, deleteTaskTool } from './tasks-tools'
import {
  createTeamPathwayTool,
  updateTeamPathwayTool,
  deleteTeamPathwayTool,
  createTeamOnboardingStatusTool,
  updateTeamOnboardingStatusTool,
  createBusinessOutcomeTool,
  updateBusinessOutcomeTool,
  deleteBusinessOutcomeTool,
  createE2eWorkflowTool,
  deleteE2eWorkflowTool,
  createWorkflowStepTool,
  updateWorkflowStepTool,
  deleteWorkflowStepTool,
  createFocusAreaTool,
  updateFocusAreaTool,
  deleteFocusAreaTool,
} from './teams-tools'
import {
  createArchIntegrationTool,
  updateArchIntegrationTool,
  deleteArchIntegrationTool,
  createArchNodeTool,
  updateArchNodeTool,
  deleteArchNodeTool,
} from './arch-tools'

export {
  createActionTool,
  updateActionTool,
  deleteActionTool,
  createMilestoneTool,
  updateMilestoneTool,
  deleteMilestoneTool,
  createRiskTool,
  updateRiskTool,
  deleteRiskTool,
  createStakeholderTool,
  updateStakeholderTool,
  deleteStakeholderTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  createTeamPathwayTool,
  updateTeamPathwayTool,
  deleteTeamPathwayTool,
  createTeamOnboardingStatusTool,
  updateTeamOnboardingStatusTool,
  createBusinessOutcomeTool,
  updateBusinessOutcomeTool,
  deleteBusinessOutcomeTool,
  createE2eWorkflowTool,
  deleteE2eWorkflowTool,
  createWorkflowStepTool,
  updateWorkflowStepTool,
  deleteWorkflowStepTool,
  createFocusAreaTool,
  updateFocusAreaTool,
  deleteFocusAreaTool,
  createArchIntegrationTool,
  updateArchIntegrationTool,
  deleteArchIntegrationTool,
  createArchNodeTool,
  updateArchNodeTool,
  deleteArchNodeTool,
}

/**
 * Returns all write tool definitions for a given project.
 * projectId is injected via closure — never exposed in any tool's inputSchema.
 */
export function allWriteTools(projectId: number) {
  return {
    // Actions
    create_action: createActionTool(projectId),
    update_action: updateActionTool(projectId),
    delete_action: deleteActionTool(projectId),

    // Milestones
    create_milestone: createMilestoneTool(projectId),
    update_milestone: updateMilestoneTool(projectId),
    delete_milestone: deleteMilestoneTool(projectId),

    // Risks
    create_risk: createRiskTool(projectId),
    update_risk: updateRiskTool(projectId),
    delete_risk: deleteRiskTool(projectId),

    // Stakeholders
    create_stakeholder: createStakeholderTool(projectId),
    update_stakeholder: updateStakeholderTool(projectId),
    delete_stakeholder: deleteStakeholderTool(projectId),

    // Tasks
    create_task: createTaskTool(projectId),
    update_task: updateTaskTool(projectId),
    delete_task: deleteTaskTool(projectId),

    // Team Pathways
    create_team_pathway: createTeamPathwayTool(projectId),
    update_team_pathway: updateTeamPathwayTool(projectId),
    delete_team_pathway: deleteTeamPathwayTool(projectId),

    // Team Onboarding Status
    create_team_onboarding_status: createTeamOnboardingStatusTool(projectId),
    update_team_onboarding_status: updateTeamOnboardingStatusTool(projectId),

    // Business Outcomes
    create_business_outcome: createBusinessOutcomeTool(projectId),
    update_business_outcome: updateBusinessOutcomeTool(projectId),
    delete_business_outcome: deleteBusinessOutcomeTool(projectId),

    // E2E Workflows
    create_e2e_workflow: createE2eWorkflowTool(projectId),
    delete_e2e_workflow: deleteE2eWorkflowTool(projectId),

    // Workflow Steps
    create_workflow_step: createWorkflowStepTool(projectId),
    update_workflow_step: updateWorkflowStepTool(projectId),
    delete_workflow_step: deleteWorkflowStepTool(projectId),

    // Focus Areas
    create_focus_area: createFocusAreaTool(projectId),
    update_focus_area: updateFocusAreaTool(projectId),
    delete_focus_area: deleteFocusAreaTool(projectId),

    // Architecture Integrations
    create_arch_integration: createArchIntegrationTool(projectId),
    update_arch_integration: updateArchIntegrationTool(projectId),
    delete_arch_integration: deleteArchIntegrationTool(projectId),

    // Architecture Nodes
    create_arch_node: createArchNodeTool(projectId),
    update_arch_node: updateArchNodeTool(projectId),
    delete_arch_node: deleteArchNodeTool(projectId),
  }
}
