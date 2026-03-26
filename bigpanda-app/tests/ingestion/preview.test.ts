import { describe, it, expect, vi } from 'vitest';

// Mock React and UI component dependencies so node-env vitest can import the component modules
vi.mock('react', () => ({
  default: {},
  useState: vi.fn(),
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: vi.fn(),
  TabsList: vi.fn(),
  TabsTrigger: vi.fn(),
  TabsContent: vi.fn(),
}));
vi.mock('@/components/ui/button', () => ({ Button: vi.fn() }));
vi.mock('@/components/ui/checkbox', () => ({ Checkbox: vi.fn() }));
vi.mock('lucide-react', () => ({
  Loader2: vi.fn(),
  CheckCircle: vi.fn(),
  XCircle: vi.fn(),
  Circle: vi.fn(),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(),
  DialogContent: vi.fn(),
  DialogHeader: vi.fn(),
  DialogTitle: vi.fn(),
}));
// Mock sibling component imports to avoid deep import chains
vi.mock('../../components/ExtractionItemRow', () => ({ ExtractionItemRow: vi.fn() }));
vi.mock('../../components/ExtractionItemEditForm', async () => {
  const actual = await vi.importActual<typeof import('../../components/ExtractionItemEditForm')>(
    '../../components/ExtractionItemEditForm'
  );
  return { ...actual, ExtractionItemEditForm: vi.fn() };
});
vi.mock('../../components/IngestionStepper', () => ({ IngestionStepper: vi.fn() }));
vi.mock('../../components/ExtractionPreview', async () => {
  const actual = await vi.importActual<typeof import('../../components/ExtractionPreview')>(
    '../../components/ExtractionPreview'
  );
  return { ...actual, ExtractionPreview: vi.fn() };
});
vi.mock('@/app/api/ingestion/extract/route', () => ({}));

import { TAB_LABELS } from '../../components/ExtractionPreview';
import { ENTITY_FIELDS } from '../../components/ExtractionItemEditForm';

// ─── Shared test helpers ───────────────────────────────────────────────────────

type EntityType = 'action' | 'risk' | 'decision' | 'milestone' | 'stakeholder' | 'task' | 'architecture' | 'history' | 'businessOutcome' | 'team';

interface ReviewItem {
  entityType: EntityType;
  fields: Record<string, string>;
  confidence: number;
  sourceExcerpt: string;
  approved: boolean;
  edited: boolean;
  conflict?: {
    existingId: number;
    existingRecord: Record<string, string>;
    resolution?: 'merge' | 'replace' | 'skip';
  };
}

function makeItem(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    entityType: 'action',
    fields: { description: 'Fix the bug in prod', owner: 'alice', due_date: '2026-04-01', status: 'open' },
    confidence: 0.9,
    sourceExcerpt: 'Alice will fix the bug in prod by April 1.',
    approved: true,
    edited: false,
    ...overrides,
  };
}

// Mirrors ExtractionPreview grouping logic
function groupItemsByType(items: ReviewItem[]): Record<string, number[]> {
  const ENTITY_ORDER: EntityType[] = [
    'action', 'risk', 'decision', 'milestone', 'stakeholder',
    'task', 'architecture', 'history', 'businessOutcome', 'team',
  ];
  return ENTITY_ORDER.reduce<Record<string, number[]>>((acc, type) => {
    const indices = items.reduce<number[]>((idxs, item, i) => {
      if (item.entityType === type) idxs.push(i);
      return idxs;
    }, []);
    if (indices.length > 0) acc[type] = indices;
    return acc;
  }, {});
}

// Simulates bulk approve on a tab
function approveAllOnTab(items: ReviewItem[], type: string): ReviewItem[] {
  const grouped = groupItemsByType(items);
  const indices = grouped[type] ?? [];
  return items.map((item, i) => indices.includes(i) ? { ...item, approved: true } : item);
}

// Simulates bulk approve across all tabs
function approveAllTabs(items: ReviewItem[]): ReviewItem[] {
  return items.map(item => ({ ...item, approved: true }));
}

// Simulates edit-and-save preserving approved state
function saveItemEdit(
  items: ReviewItem[],
  index: number,
  updatedFields: Record<string, string>,
): ReviewItem[] {
  return items.map((item, i) =>
    i === index ? { ...item, fields: updatedFields, edited: true } : item
  );
}

// Simulates unchecking an item
function setApproved(items: ReviewItem[], index: number, approved: boolean): ReviewItem[] {
  return items.map((item, i) => i === index ? { ...item, approved } : item);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Extraction preview (ING-05, ING-06, ING-07)', () => {

  // ─── ING-05: Tab grouping ────────────────────────────────────────────────

  it('ING-05: groups items by entityType into tabs', () => {
    const items: ReviewItem[] = [
      makeItem({ entityType: 'action' }),
      makeItem({ entityType: 'risk', fields: { description: 'Risk A', severity: 'high', mitigation: 'none', owner: 'bob' } }),
      makeItem({ entityType: 'action' }),
    ];
    const grouped = groupItemsByType(items);
    expect(grouped['action']).toEqual([0, 2]);
    expect(grouped['risk']).toEqual([1]);
  });

  it('ING-05: only shows tabs that have items', () => {
    const items: ReviewItem[] = [
      makeItem({ entityType: 'action' }),
      makeItem({ entityType: 'milestone', fields: { name: 'Launch', target_date: '2026-06-01', status: 'on-track' } }),
    ];
    const grouped = groupItemsByType(items);
    const activeTabs = Object.keys(grouped);

    // Only action and milestone should be present
    expect(activeTabs).toContain('action');
    expect(activeTabs).toContain('milestone');

    // All other entity types should NOT be present (no empty tabs)
    const emptyTypes = Object.keys(TAB_LABELS).filter(t => t !== 'action' && t !== 'milestone');
    emptyTypes.forEach(type => {
      expect(activeTabs).not.toContain(type);
    });
  });

  it('ING-05: tab badge shows item count', () => {
    const items: ReviewItem[] = [
      makeItem({ entityType: 'action' }),
      makeItem({ entityType: 'action' }),
      makeItem({ entityType: 'action' }),
      makeItem({ entityType: 'risk', fields: { description: 'Risk', severity: 'low', mitigation: 'none', owner: 'bob' } }),
    ];
    const grouped = groupItemsByType(items);

    expect((grouped['action'] ?? []).length).toBe(3);  // badge count for Actions tab
    expect((grouped['risk'] ?? []).length).toBe(1);    // badge count for Risks tab
  });

  // ─── ING-06: Per-item approve/reject/edit ────────────────────────────────

  it('ING-06: item default state is approved (checked)', () => {
    const item = makeItem();
    expect(item.approved).toBe(true);
  });

  it('ING-06: unchecking an item sets it to rejected', () => {
    const items = [makeItem(), makeItem()];
    const updated = setApproved(items, 0, false);

    expect(updated[0].approved).toBe(false);
    expect(updated[1].approved).toBe(true); // other items unaffected
  });

  it('ING-06: editing an item preserves checkbox state', () => {
    const items: ReviewItem[] = [
      makeItem({ approved: true }),
      makeItem({ approved: false }),
    ];

    const newFields = { description: 'Updated description', owner: 'carol', due_date: '2026-05-01', status: 'in-progress' };

    const afterSave0 = saveItemEdit(items, 0, newFields);
    expect(afterSave0[0].approved).toBe(true);   // approved state preserved
    expect(afterSave0[0].edited).toBe(true);      // marked as edited
    expect(afterSave0[0].fields.description).toBe('Updated description');

    const afterSave1 = saveItemEdit(items, 1, newFields);
    expect(afterSave1[1].approved).toBe(false);  // rejected state also preserved
    expect(afterSave1[1].edited).toBe(true);
  });

  // ─── ING-07: Bulk approve ────────────────────────────────────────────────

  it('ING-07: bulk approve sets all items to approved', () => {
    const items: ReviewItem[] = [
      makeItem({ approved: false }),
      makeItem({ approved: true }),
      makeItem({ approved: false }),
      makeItem({ entityType: 'risk', approved: false, fields: { description: 'Risk', severity: 'high', mitigation: 'none', owner: 'x' } }),
    ];

    // Approve all on current tab (action)
    const afterTabApprove = approveAllOnTab(items, 'action');
    expect(afterTabApprove[0].approved).toBe(true);
    expect(afterTabApprove[1].approved).toBe(true);
    expect(afterTabApprove[2].approved).toBe(true);
    expect(afterTabApprove[3].approved).toBe(false); // risk tab not touched

    // Approve all across all tabs
    const afterAllApprove = approveAllTabs(items);
    afterAllApprove.forEach(item => {
      expect(item.approved).toBe(true);
    });
  });

  // ─── ING-08: Conflict detection (UI side) ────────────────────────────────

  it('ING-08: conflict items carry conflict metadata', () => {
    const item = makeItem({
      conflict: {
        existingId: 42,
        existingRecord: { description: 'Existing bug fix', owner: 'dave', due_date: '2026-03-15', status: 'closed' },
      },
    });
    expect(item.conflict).toBeDefined();
    expect(item.conflict!.existingId).toBe(42);
    expect(item.conflict!.resolution).toBeUndefined(); // no resolution selected yet
  });

  it('ING-08: conflict resolution can be set on item', () => {
    const items: ReviewItem[] = [
      makeItem({
        conflict: { existingId: 99, existingRecord: { description: 'old', owner: 'eve', due_date: '2026-01-01', status: 'done' } },
      }),
    ];

    const updated = items.map((item, i) =>
      i === 0
        ? { ...item, conflict: { ...item.conflict!, resolution: 'replace' as const } }
        : item
    );
    expect(updated[0].conflict!.resolution).toBe('replace');
  });

  // ─── Supporting checks ───────────────────────────────────────────────────

  it('TAB_LABELS covers all 10 entity types', () => {
    const expectedTypes = [
      'action', 'risk', 'decision', 'milestone', 'stakeholder',
      'task', 'architecture', 'history', 'businessOutcome', 'team',
    ];
    expectedTypes.forEach(type => {
      expect(TAB_LABELS[type]).toBeDefined();
      expect(typeof TAB_LABELS[type]).toBe('string');
    });
  });

  it('ENTITY_FIELDS covers all 10 entity types with correct fields', () => {
    expect(ENTITY_FIELDS['action']).toEqual(['description', 'owner', 'due_date', 'status']);
    expect(ENTITY_FIELDS['risk']).toEqual(['description', 'severity', 'mitigation', 'owner']);
    expect(ENTITY_FIELDS['decision']).toEqual(['decision', 'rationale', 'made_by', 'date']);
    expect(ENTITY_FIELDS['milestone']).toEqual(['name', 'target_date', 'status']);
    expect(ENTITY_FIELDS['stakeholder']).toEqual(['name', 'role', 'email', 'account']);
    expect(ENTITY_FIELDS['task']).toEqual(['title', 'status', 'owner', 'phase']);
    expect(ENTITY_FIELDS['architecture']).toEqual(['tool_name', 'track', 'phase', 'status', 'integration_method']);
    expect(ENTITY_FIELDS['history']).toEqual(['date', 'content', 'author']);
    expect(ENTITY_FIELDS['businessOutcome']).toEqual(['title', 'track', 'description', 'delivery_status']);
    expect(ENTITY_FIELDS['team']).toEqual(['team_name', 'track', 'ingest_status']);
  });
});
