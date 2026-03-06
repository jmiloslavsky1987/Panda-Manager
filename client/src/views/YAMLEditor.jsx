// client/src/views/YAMLEditor.jsx
// YAML escape-hatch editor — CodeMirror 6 with syntax highlighting + live validation.
// Reads/writes raw YAML strings via GET|PUT /api/customers/:id/yaml.
// Server validates structure before writing; errors surface inline.

import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { getRawYaml, putRawYaml } from '../api';

// ── CodeMirror theme — light, matches app teal/gray palette ─────────────────
const editorTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-gutters': {
    backgroundColor: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
    color: '#9ca3af',
  },
  '.cm-activeLine': { backgroundColor: '#f0fdfa' },
  '.cm-activeLineGutter': { backgroundColor: '#ccfbf1' },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#99f6e4 !important' },
  '.cm-cursor': { borderLeftColor: '#0d9488' },
  '.cm-content': { padding: '8px 0' },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function YAMLEditor() {
  const { customerId } = useParams();
  const queryClient   = useQueryClient();

  // DOM ref for CodeMirror mount point
  const containerRef    = useRef(null);
  // Hold the EditorView instance
  const viewRef         = useRef(null);
  // Track content at last save/load for dirty comparison
  const savedContentRef = useRef('');
  // Prevent re-init on TanStack Query cache updates
  const initializedRef  = useRef(false);

  const [isDirty,     setIsDirty]     = React.useState(false);
  const [saveError,   setSaveError]   = React.useState(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // ── Load raw YAML ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['yaml', customerId],
    queryFn:  () => getRawYaml(customerId),
    // Don't auto-refetch while user is editing — they own the content until they save
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // ── Mount CodeMirror once content arrives ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !data?.content || initializedRef.current) return;

    savedContentRef.current = data.content;
    initializedRef.current  = true;

    const view = new EditorView({
      state: EditorState.create({
        doc: data.content,
        extensions: [
          basicSetup,
          yaml(),
          editorTheme,
          // Track dirty state: compare editor doc vs saved snapshot
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              setIsDirty(view.state.doc.toString() !== savedContentRef.current);
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current        = null;
      initializedRef.current = false;
    };
  }, [data?.content]);

  // ── Save mutation ──────────────────────────────────────────────────────────
  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => {
      const content = viewRef.current.state.doc.toString();
      return putRawYaml(customerId, content);
    },
    onSuccess: () => {
      // Snapshot the current editor content as the new saved baseline
      savedContentRef.current = viewRef.current.state.doc.toString();
      setIsDirty(false);
      setSaveError(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      // Bust the parsed-customer caches so all other views pick up the changes
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err) => {
      setSaveError(err.message || 'Save failed');
    },
  });

  // ── Keyboard shortcut: Cmd/Ctrl+S ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving && viewRef.current) save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, isSaving, save]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-4 h-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">YAML Editor</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Direct escape-hatch editor. The server validates structure before writing to Drive.
        </p>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 shrink-0">
        <strong>⚠ Use with care.</strong>{' '}
        All structured views (Overview, Actions, Reports, etc.) read this YAML. Invalid
        structure will break them. Required keys:{' '}
        <code className="text-xs bg-amber-100 px-1 rounded">
          customer, project, status, workstreams, actions, risks, milestones, artifacts, history
        </code>
      </div>

      {/* Loading state */}
      {isLoading && (
        <p className="text-sm text-gray-400">Loading YAML…</p>
      )}

      {/* Load error */}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load: {loadError?.message}
        </p>
      )}

      {/* Toolbar + editor — only rendered once data is available */}
      {data?.content && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
            {/* Dirty / saved indicator */}
            <div className="text-xs">
              {isDirty ? (
                <span className="text-amber-600 font-medium">● Unsaved changes</span>
              ) : saveSuccess ? (
                <span className="text-teal-600 font-medium">✓ Saved</span>
              ) : (
                <span className="text-gray-400">No unsaved changes</span>
              )}
            </div>

            {/* Save button + error */}
            <div className="flex items-center gap-3">
              {saveError && (
                <span className="text-xs text-red-600 max-w-xs truncate" title={saveError}>
                  {saveError}
                </span>
              )}
              <button
                type="button"
                disabled={!isDirty || isSaving}
                onClick={() => save()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </button>
              <span className="text-xs text-gray-400 hidden sm:inline">⌘S</span>
            </div>
          </div>

          {/* CodeMirror mount point */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden focus-within:border-teal-400 transition-colors"
            style={{ minHeight: '500px' }}
          />
        </div>
      )}
    </div>
  );
}
