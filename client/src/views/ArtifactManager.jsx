// client/src/views/ArtifactManager.jsx — ART-01 through ART-05
import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postArtifact, patchArtifact } from '../api';
import InlineEditField from '../components/InlineEditField';
import InlineSelectField from '../components/InlineSelectField';

// Complete literal strings — Tailwind v4 purge safety (no dynamic class construction)
const ARTIFACT_STATUS_OPTIONS = [
  { value: 'active',     label: 'Active' },
  { value: 'in_review',  label: 'In Review' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'retired',    label: 'Retired' },
];

const ARTIFACT_TYPE_OPTIONS = [
  { value: 'diagram',           label: 'Diagram' },
  { value: 'document',          label: 'Document' },
  { value: 'spreadsheet',       label: 'Spreadsheet' },
  { value: 'presentation',      label: 'Presentation' },
  { value: 'runbook',           label: 'Runbook' },
  { value: 'other',             label: 'Other' },
  { value: 'workflow-decision', label: 'Workflow Decision' },
  { value: 'team-contact',      label: 'Team Contact' },
  { value: 'backlog-item',      label: 'Backlog Item' },
  { value: 'integration-note',  label: 'Integration Note' },
];

export default function ArtifactManager() {
  const { customer } = useOutletContext();
  const { customerId } = useParams();
  const queryClient = useQueryClient();
  const queryKey = ['customer', customerId];

  // New artifact form state
  const [newArtifact, setNewArtifact] = React.useState({
    type: 'document', title: '', description: '', status: 'active', owner: '',
  });

  // Type filter state — MGT-02
  const [typeFilter, setTypeFilter] = React.useState('all');

  // Optimistic mutation for patch operations (ART-03, ART-04, ART-05)
  const artifactMutation = useMutation({
    mutationFn: ({ artifactId, patch }) => patchArtifact(customerId, artifactId, patch),
    onMutate: async ({ artifactId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        artifacts: (old?.artifacts ?? []).map(a =>
          a.id === artifactId ? { ...a, ...patch } : a
        ),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });

  // Add mutation (POST — no optimistic, server assigns X-### ID) — ART-02
  const addMutation = useMutation({
    mutationFn: (artifactData) => postArtifact(customerId, artifactData),
    onSuccess: () => {
      setNewArtifact({ type: 'document', title: '', description: '', status: 'active', owner: '' });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const artifacts = customer.artifacts ?? [];
  const filteredArtifacts = typeFilter === 'all'
    ? artifacts
    : artifacts.filter(a => a.type === typeFilter);

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Artifact Manager</h2>
        <p className="text-sm text-gray-500">
          {typeFilter === 'all'
            ? `${artifacts.length} artifact${artifacts.length !== 1 ? 's' : ''}`
            : `${filteredArtifacts.length} of ${artifacts.length} artifact${artifacts.length !== 1 ? 's' : ''} (${ARTIFACT_TYPE_OPTIONS.find(o => o.value === typeFilter)?.label ?? typeFilter})`}
        </p>
      </div>

      {/* Type filter — MGT-02 */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium">Filter by type:</label>
        <select
          className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-teal-400"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {ARTIFACT_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {typeFilter !== 'all' && (
          <span className="text-xs text-gray-400">
            {filteredArtifacts.length} of {artifacts.length}
          </span>
        )}
      </div>

      {/* Artifacts Table — ART-01 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500 w-20">ID</th>
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500 w-28">Type</th>
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500">Title</th>
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500">Description</th>
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500 w-28">Status</th>
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500 w-28">Owner</th>
              <th className="pb-2 pt-3 px-2 text-xs font-medium text-gray-500 w-28">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {/* Empty state */}
            {filteredArtifacts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-sm text-gray-400 text-center">
                  {artifacts.length === 0
                    ? 'No artifacts yet. Use Add Artifact below to create the first one.'
                    : `No artifacts match type "${typeFilter}".`}
                </td>
              </tr>
            )}

            {/* Artifact rows */}
            {filteredArtifacts.map(artifact => {
              const isPending = artifactMutation.isPending && artifactMutation.variables?.artifactId === artifact.id;
              return (
                <tr key={artifact.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {/* ID — read-only monospace */}
                  <td className="py-2 px-2 font-mono text-xs text-gray-400">{artifact.id}</td>

                  {/* Type — inline select */}
                  <td className="py-2 px-2">
                    <InlineSelectField
                      value={artifact.type}
                      options={ARTIFACT_TYPE_OPTIONS}
                      isPending={isPending}
                      onSave={val => artifactMutation.mutate({ artifactId: artifact.id, patch: { type: val } })}
                    />
                  </td>

                  {/* Title — inline edit */}
                  <td className="py-2 px-2">
                    <InlineEditField
                      value={artifact.title}
                      isPending={isPending}
                      onSave={val => artifactMutation.mutate({ artifactId: artifact.id, patch: { title: val } })}
                    />
                  </td>

                  {/* Description — inline edit */}
                  <td className="py-2 px-2">
                    <InlineEditField
                      value={artifact.description}
                      isPending={isPending}
                      onSave={val => artifactMutation.mutate({ artifactId: artifact.id, patch: { description: val } })}
                    />
                  </td>

                  {/* Status — inline select */}
                  <td className="py-2 px-2">
                    <InlineSelectField
                      value={artifact.status}
                      options={ARTIFACT_STATUS_OPTIONS}
                      isPending={isPending}
                      onSave={val => artifactMutation.mutate({ artifactId: artifact.id, patch: { status: val } })}
                    />
                  </td>

                  {/* Owner — inline edit */}
                  <td className="py-2 px-2">
                    <InlineEditField
                      value={artifact.owner}
                      isPending={isPending}
                      onSave={val => artifactMutation.mutate({ artifactId: artifact.id, patch: { owner: val } })}
                    />
                  </td>

                  {/* Last Updated — read-only */}
                  <td className="py-2 px-2 text-sm text-gray-600">{artifact.last_updated || '—'}</td>
                </tr>
              );
            })}

            {/* Add Artifact row — ART-02 */}
            <tr className="border-t-2 border-dashed border-gray-200">
              <td className="py-2 px-2 text-xs text-gray-400 italic">new</td>
              <td className="py-2 pr-2">
                <select
                  className="text-sm border border-gray-300 rounded px-1 py-0.5 bg-white w-full"
                  value={newArtifact.type}
                  onChange={e => setNewArtifact(p => ({ ...p, type: e.target.value }))}
                >
                  {ARTIFACT_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
              <td className="py-2 pr-2">
                <input
                  className="border border-gray-300 rounded px-1 py-0.5 text-sm w-full"
                  placeholder="Title"
                  value={newArtifact.title}
                  onChange={e => setNewArtifact(p => ({ ...p, title: e.target.value }))}
                />
              </td>
              <td className="py-2 pr-2">
                <input
                  className="border border-gray-300 rounded px-1 py-0.5 text-sm w-full"
                  placeholder="Description"
                  value={newArtifact.description}
                  onChange={e => setNewArtifact(p => ({ ...p, description: e.target.value }))}
                />
              </td>
              <td className="py-2 pr-2">
                <select
                  className="text-sm border border-gray-300 rounded px-1 py-0.5 bg-white w-full"
                  value={newArtifact.status}
                  onChange={e => setNewArtifact(p => ({ ...p, status: e.target.value }))}
                >
                  {ARTIFACT_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </td>
              <td className="py-2 pr-2">
                <input
                  className="border border-gray-300 rounded px-1 py-0.5 text-sm w-full"
                  placeholder="Owner"
                  value={newArtifact.owner}
                  onChange={e => setNewArtifact(p => ({ ...p, owner: e.target.value }))}
                />
              </td>
              <td className="py-2">
                <button
                  className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                  disabled={!newArtifact.title.trim() || addMutation.isPending}
                  onClick={() => addMutation.mutate(newArtifact)}
                >
                  {addMutation.isPending ? 'Saving...' : 'Add Artifact'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
