// tests/time-tracking-global/workspace-tabs.test.ts
// Wave 0 RED stub for TIME-03 — Tab removal verification
import { describe, it, expect } from 'vitest';
import { TAB_GROUPS } from '@/components/WorkspaceTabs';

describe('WorkspaceTabs — TIME-03', () => {
  it('TAB_GROUPS admin group does not contain a time subtab', () => {
    // Find the admin group
    const adminGroup = TAB_GROUPS.find((group) => group.id === 'admin');

    expect(adminGroup).toBeDefined();
    expect(adminGroup?.children).toBeDefined();

    // Assert that no child has id === 'time'
    // This test fails RED NOW (time tab exists) and turns GREEN after 32-03 removes it
    const timeTab = adminGroup?.children?.find((child) => child.id === 'time');
    expect(timeTab).toBeUndefined();
  });
});
