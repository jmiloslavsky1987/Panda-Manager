import { createActionTool, updateActionTool, deleteActionTool } from './actions-tools'
import { createMilestoneTool, updateMilestoneTool, deleteMilestoneTool } from './milestones-tools'
import { createRiskTool, updateRiskTool, deleteRiskTool } from './risks-tools'
import {
  createStakeholderTool,
  updateStakeholderTool,
  deleteStakeholderTool,
} from './stakeholders-tools'
import { createTaskTool, updateTaskTool, deleteTaskTool } from './tasks-tools'

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
}

/**
 * Returns all write tool definitions for a given project.
 * projectId is injected via closure — never exposed in any tool's inputSchema.
 */
export const allWriteTools = (projectId: number) => ({
  create_action: createActionTool(projectId),
  update_action: updateActionTool(projectId),
  delete_action: deleteActionTool(projectId),

  create_milestone: createMilestoneTool(projectId),
  update_milestone: updateMilestoneTool(projectId),
  delete_milestone: deleteMilestoneTool(projectId),

  create_risk: createRiskTool(projectId),
  update_risk: updateRiskTool(projectId),
  delete_risk: deleteRiskTool(projectId),

  create_stakeholder: createStakeholderTool(projectId),
  update_stakeholder: updateStakeholderTool(projectId),
  delete_stakeholder: deleteStakeholderTool(projectId),

  create_task: createTaskTool(projectId),
  update_task: updateTaskTool(projectId),
  delete_task: deleteTaskTool(projectId),
})
