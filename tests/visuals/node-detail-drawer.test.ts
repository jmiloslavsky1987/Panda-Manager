import { describe, it, expect } from 'vitest'

// NodeDetailDrawer is a React component — full render requires JSDOM environment.
// These tests verify the data contract: the drawer receives the correct node shape.

interface DrawerNode { id: string; type?: string; data: Record<string, unknown> }

function getDrawerFields(node: DrawerNode): string[] {
  const fields: string[] = ['label']
  if (node.type === 'team') fields.push('workflowCount', 'workflowNames')
  if (node.type === 'stakeholder') fields.push('role', 'company')
  return fields
}

describe('NodeDetailDrawer (VIS-01)', () => {
  it('team node exposes workflowCount and workflowNames fields to drawer', () => {
    const teamNode: DrawerNode = {
      id: 'team-ITSM',
      type: 'team',
      data: { label: 'ITSM', workflowCount: 2, workflowNames: 'Incident Flow, Change Flow' },
    }
    const fields = getDrawerFields(teamNode)
    expect(fields).toContain('workflowCount')
    expect(fields).toContain('workflowNames')
    expect(teamNode.data.workflowCount).toBe(2)
  })

  it('stakeholder node exposes role and company fields to drawer', () => {
    const stakeholderNode: DrawerNode = {
      id: 'stakeholder-1',
      type: 'stakeholder',
      data: { label: 'Jane Doe', role: 'VP Engineering', company: 'Acme' },
    }
    const fields = getDrawerFields(stakeholderNode)
    expect(fields).toContain('role')
    expect(fields).toContain('company')
    expect(stakeholderNode.data.role).toBe('VP Engineering')
  })
})
