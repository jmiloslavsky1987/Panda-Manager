'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';

interface ProposedTask {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  type: 'technical' | 'organizational' | 'customer-facing';
  phase?: string;
  due?: string;
  track?: 'ADR' | 'Biggy';
  wbs_phase?: string;
}

interface AiPlanPanelProps {
  projectId: number;
  existingTasks: { title: string }[];
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

function isDuplicate(proposed: string, existing: { title: string }[]): boolean {
  const lower = proposed.toLowerCase();
  return existing.some(t =>
    t.title.toLowerCase().includes(lower) || lower.includes(t.title.toLowerCase())
  );
}

export function AiPlanPanel({ projectId, existingTasks }: AiPlanPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<ProposedTask[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [committing, setCommitting] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setTasks(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-plan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      const taskList: ProposedTask[] = data.tasks ?? [];
      setTasks(taskList);
      // Only select non-duplicate tasks by default
      setSelected(new Set(
        taskList
          .map((t, i) => ({ t, i }))
          .filter(({ t }) => !isDuplicate(t.title, existingTasks))
          .map(({ i }) => i)
      ));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!tasks) return;
    setCommitting(true);
    const toCommit = tasks.filter((_, i) => selected.has(i));

    // Fetch current WBS tree once before the loop (for parent lookup)
    let wbsTree: { id: number; name: string; level: number; track: string; parent_id: number | null }[] = [];
    try {
      const wbsRes = await fetch(`/api/projects/${projectId}/wbs`);
      if (wbsRes.ok) {
        const wbsData = await wbsRes.json();
        wbsTree = wbsData.items ?? wbsData ?? [];
      }
    } catch {
      // WBS fetch failure is non-blocking
    }

    let successCount = 0;
    for (const task of toCommit) {
      try {
        // 1. Write to tasks table (existing logic)
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
            type: task.type,
            phase: task.phase ?? 'Build',
            due: task.due ?? null,
            status: 'todo',
            project_id: projectId,
          }),
        });
        if (res.ok) successCount++;

        // 2. Write to WBS tree — auto-create level-2 parent if missing
        if (task.track && task.wbs_phase) {
          try {
            let level2Parent = wbsTree.find(
              item => item.level === 2 &&
                item.track.toLowerCase() === task.track!.toLowerCase() &&
                item.name.toLowerCase() === task.wbs_phase!.toLowerCase()
            );

            if (!level2Parent) {
              const level1Root = wbsTree.find(
                item => item.level === 1 && item.track.toLowerCase() === task.track!.toLowerCase()
              );
              if (level1Root) {
                const createRes = await fetch(`/api/projects/${projectId}/wbs`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: task.wbs_phase,
                    parent_id: level1Root.id,
                    level: 2,
                    track: task.track,
                  }),
                });
                if (createRes.ok) {
                  const created = await createRes.json();
                  level2Parent = { id: created.id, name: task.wbs_phase!, level: 2, track: task.track!, parent_id: level1Root.id };
                  wbsTree = [...wbsTree, level2Parent];
                }
              }
            }

            if (level2Parent) {
              await fetch(`/api/projects/${projectId}/wbs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: task.title,
                  parent_id: level2Parent.id,
                  level: 3,
                  track: task.track,
                }),
              });
            }
          } catch {
            // WBS write failure is non-blocking
          }
        }
      } catch {
        // continue on individual task failure
      }
    }
    // TODO(gantt-phase): trigger Gantt gap-fill here — pass projectId + committed task phases/tracks for timeline insertion
    toast.success(`${successCount} task${successCount !== 1 ? 's' : ''} committed to Task Board`);
    setTasks(null);
    setSelected(new Set());
    setCommitting(false);
    router.refresh();
  }

  function handleDiscard() {
    setTasks(null);
    setSelected(new Set());
  }

  function toggleTask(index: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="mb-4" data-testid="ai-plan-panel">
      {!tasks && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          data-testid="generate-plan-btn"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating plan...' : 'Generate plan'}
        </button>
      )}

      {tasks && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Proposed Tasks ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {tasks.map((task, i) => {
                const dup = isDuplicate(task.title, existingTasks);
                return (
                  <div key={i} className={`flex items-start gap-3 p-2 rounded border ${dup ? 'border-zinc-200 bg-zinc-50 opacity-60' : 'border-zinc-100 hover:bg-zinc-50'}`}>
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleTask(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      {dup && <span className="text-xs text-zinc-400 italic">Already exists</span>}
                      {!dup && task.description && <p className="text-xs text-zinc-500 mt-0.5">{task.description}</p>}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLOR[task.priority] ?? ''}`}>
                          {task.priority}
                        </span>
                        <Badge variant="outline" className="text-xs">{task.type}</Badge>
                        {task.phase && <Badge variant="outline" className="text-xs">{task.phase}</Badge>}
                        {task.due && <span className="text-xs text-zinc-400">{task.due}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCommit}
                disabled={committing || selected.size === 0}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                data-testid="commit-tasks-btn"
              >
                {committing ? 'Committing...' : `Commit selected (${selected.size})`}
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-50"
                data-testid="discard-tasks-btn"
              >
                Discard
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
