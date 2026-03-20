'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface OutputRow {
  id: number;
  skill_name: string;
  project_id: number | null;
  project_name: string | null;
  filename: string | null;
  filepath: string | null;
  content: string | null;
  status: string;
  archived: boolean;
  created_at: string;
}

export default function OutputLibraryPage() {
  const router = useRouter();
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadOutputs = async () => {
    const params = new URLSearchParams();
    if (filterProject) params.set('projectId', filterProject);
    if (filterSkill) params.set('skillType', filterSkill);
    if (showArchived) params.set('archived', 'true');
    const res = await fetch(`/api/outputs?${params}`);
    if (res.ok) setOutputs(await res.json());
  };

  useEffect(() => { loadOutputs(); }, [filterProject, filterSkill, showArchived]);

  const openFile = async (id: number) => {
    const res = await fetch(`/api/outputs/${id}/open`);
    if (!res.ok) toast.error('Could not open file');
  };

  const regenerate = async (output: OutputRow) => {
    if (!output.project_id || !output.skill_name) return;
    const res = await fetch(`/api/skills/${output.skill_name}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: output.project_id }),
    });
    if (res.ok) {
      const { runId } = await res.json();
      // Archive old output
      await fetch(`/api/outputs/${output.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      router.push(`/customer/${output.project_id}/skills/${runId}`);
    } else {
      toast.error('Failed to regenerate');
    }
  };

  const allSkillTypes = [...new Set(outputs.map(o => o.skill_name))];
  const allProjects = [...new Set(outputs.filter(o => o.project_id).map(o => `${o.project_id}:${o.project_name ?? o.project_id}`))];

  const isHtmlOutput = (o: OutputRow) =>
    o.skill_name.includes('html') || o.filename?.endsWith('.html') || false;

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="output-library">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Output Library</h1>
        <p className="text-sm text-zinc-500 mt-1">All generated skill outputs — filterable by account, skill type, and date.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          data-testid="filter-account"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="text-sm border border-zinc-200 rounded px-2 py-1"
        >
          <option value="">All Accounts</option>
          {allProjects.map(p => {
            const [id, name] = p.split(':');
            return <option key={id} value={id}>{name}</option>;
          })}
        </select>
        <select
          data-testid="filter-skill-type"
          value={filterSkill}
          onChange={e => setFilterSkill(e.target.value)}
          className="text-sm border border-zinc-200 rounded px-2 py-1"
        >
          <option value="">All Skill Types</option>
          {allSkillTypes.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
        </select>
        <input
          data-testid="filter-date-range"
          type="date"
          className="text-sm border border-zinc-200 rounded px-2 py-1"
          onChange={() => {/* date filtering — future enhancement */}}
          placeholder="From date"
        />
        <button
          onClick={() => setShowArchived(v => !v)}
          className={`text-sm px-3 py-1 rounded border ${showArchived ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-600'}`}
        >
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>
      </div>

      {outputs.length === 0 ? (
        <p className="text-sm text-zinc-500">No outputs found. Run a skill to generate your first output.</p>
      ) : (
        <div className="space-y-2">
          {outputs.map(output => (
            <div key={output.id} className="border border-zinc-200 rounded-lg bg-white">
              <div
                data-output-type={isHtmlOutput(output) ? 'html' : 'file'}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-50"
                onClick={() => isHtmlOutput(output) && setExpandedId(expandedId === output.id ? null : output.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-zinc-800 capitalize">
                    {output.skill_name.replace(/-/g, ' ')}
                  </span>
                  {output.project_name && (
                    <span className="text-xs text-zinc-400">{output.project_name}</span>
                  )}
                  {output.filename && (
                    <span className="text-xs text-zinc-500 font-mono truncate">{output.filename}</span>
                  )}
                  {output.archived && (
                    <span data-testid="output-archived-badge" className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">Archived</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400">
                    {new Date(output.created_at).toLocaleDateString()}
                  </span>
                  {output.filepath && !isHtmlOutput(output) && (
                    <button
                      onClick={e => { e.stopPropagation(); openFile(output.id); }}
                      className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50"
                    >Open</button>
                  )}
                  {!output.archived && (
                    <button
                      data-testid="regenerate-btn"
                      onClick={e => { e.stopPropagation(); regenerate(output); }}
                      className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50"
                    >Regenerate</button>
                  )}
                </div>
              </div>
              {expandedId === output.id && isHtmlOutput(output) && output.content && (
                <div className="border-t border-zinc-100">
                  <iframe
                    sandbox="allow-same-origin"
                    srcDoc={output.content}
                    className="w-full h-96"
                    title={`${output.skill_name} output`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
