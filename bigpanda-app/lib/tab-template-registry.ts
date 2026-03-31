/**
 * TAB_TEMPLATE_REGISTRY — Single source of truth for tab section structures
 *
 * Purpose: Defines required sections for all 11 tab types.
 * - Used by Phase 27 seeding (Plan 04) to insert placeholder rows
 * - Used by Phase 30 Context Hub completeness analysis
 *
 * Pattern: `satisfies Record<TabType, TabTemplate>` enforces exhaustive coverage
 * - Adding a new TabType without a registry entry = TypeScript compile error
 *
 * @see .planning/phases/27-ui-overhaul-templates/27-02-PLAN.md
 */

export type TabType =
  | 'overview'
  | 'actions'
  | 'risks'
  | 'milestones'
  | 'teams'
  | 'architecture'
  | 'decisions'
  | 'history'
  | 'stakeholders'
  | 'plan'
  | 'skills'

export interface SectionDef {
  name: string
  requiredFields: string[]
  placeholderText: string
}

export interface TabTemplate {
  sections: SectionDef[]
}

export const TAB_TEMPLATE_REGISTRY = {
  overview: {
    sections: [
      {
        name: 'Project Summary',
        requiredFields: ['description'],
        placeholderText: 'Describe the project scope and objectives — include customer name, go-live target, and primary goal'
      },
      {
        name: 'Success Metrics',
        requiredFields: ['metric', 'target'],
        placeholderText: 'Define measurable success criteria — what does good look like at go-live?'
      },
      {
        name: 'Key Contacts',
        requiredFields: ['name', 'role'],
        placeholderText: 'Add primary contacts — BigPanda CSM, customer project owner, and executive sponsor'
      }
    ]
  },

  actions: {
    sections: [
      {
        name: 'Action Items',
        requiredFields: ['description', 'owner', 'due'],
        placeholderText: 'Add your first action — include owner, due date, and a clear description of the expected outcome'
      }
    ]
  },

  risks: {
    sections: [
      {
        name: 'Risk Register',
        requiredFields: ['description', 'severity', 'mitigation'],
        placeholderText: 'Document a risk — severity level (low/medium/high/critical), owner, and mitigation plan'
      }
    ]
  },

  milestones: {
    sections: [
      {
        name: 'Project Milestones',
        requiredFields: ['name', 'target', 'owner'],
        placeholderText: 'Add a milestone — name, target date, owner, and current status'
      }
    ]
  },

  teams: {
    sections: [
      {
        name: 'Customer Team',
        requiredFields: ['name', 'role', 'company'],
        placeholderText: 'Add a team member — name, role, company, and email or Slack handle'
      },
      {
        name: 'BigPanda Team',
        requiredFields: ['name', 'role'],
        placeholderText: 'Add a BigPanda team member assigned to this project — name, role, and Slack handle'
      }
    ]
  },

  architecture: {
    sections: [
      {
        name: 'Integration Track',
        requiredFields: ['name', 'status', 'type'],
        placeholderText: 'Add an integration — name, current status (live/in_progress/pilot/planned), and integration type'
      },
      {
        name: 'Workflow',
        requiredFields: ['name', 'description'],
        placeholderText: 'Document an E2E workflow — name and description of the end-to-end process being configured'
      }
    ]
  },

  decisions: {
    sections: [
      {
        name: 'Key Decisions',
        requiredFields: ['decision', 'date'],
        placeholderText: 'Record a key decision — decision text, date, context, and who made it (append-only)'
      }
    ]
  },

  history: {
    sections: [
      {
        name: 'Engagement History',
        requiredFields: ['content', 'date'],
        placeholderText: 'Log an engagement update — date, content summary, and source (append-only)'
      }
    ]
  },

  stakeholders: {
    sections: [
      {
        name: 'Stakeholder Map',
        requiredFields: ['name', 'role', 'company'],
        placeholderText: 'Add a stakeholder — name, role, company, and preferred contact method'
      }
    ]
  },

  plan: {
    sections: [
      {
        name: 'Business Outcomes',
        requiredFields: ['outcome', 'owner'],
        placeholderText: 'Define a business outcome this project must deliver — outcome description and business owner'
      }
    ]
  },

  skills: {
    sections: []
  }
} satisfies Record<TabType, TabTemplate>

export type RegistryKey = keyof typeof TAB_TEMPLATE_REGISTRY
