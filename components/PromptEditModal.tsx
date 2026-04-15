'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Lock, Maximize2, Minimize2, Bold, Italic, Code, Heading } from 'lucide-react';
import type { SkillMeta } from '@/types/skills';

const CodeMirrorEditor = dynamic(
  () => import('./CodeMirrorEditor'),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-zinc-800 rounded animate-pulse" />
  }
);

interface PromptEditModalProps {
  skill: SkillMeta;
  trigger: React.ReactNode;
  onSaved?: () => void;
}

export function PromptEditModal({ skill, trigger, onSaved }: PromptEditModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [frontMatter, setFrontMatter] = useState('');
  const [initialBody, setInitialBody] = useState('');
  const bodyRef = useRef<string>('');
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (open && !loading && !frontMatter) {
      loadPrompt();
    }
  }, [open]);

  async function loadPrompt() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/skills/${skill.name}/prompt`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to load prompt');
        setLoading(false);
        return;
      }

      setFrontMatter(data.frontMatter);
      setInitialBody(data.body);
      bodyRef.current = data.body;
      setEditorKey((k) => k + 1); // Force editor remount with new content
      setLoading(false);
    } catch {
      setError('Network error — please try again');
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/skills/${skill.name}/prompt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyRef.current }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Save failed');
        setSaving(false);
        return;
      }

      setSaving(false);
      setOpen(false);
      onSaved?.();
    } catch {
      setError('Network error — please try again');
      setSaving(false);
    }
  }

  function insertMarkdown(before: string, after: string = '') {
    // Simple insertion at end of current buffer
    const current = bodyRef.current;
    bodyRef.current = current + before + after;
    setEditorKey((k) => k + 1); // Force editor update
  }

  function handleEditorChange(value: string) {
    bodyRef.current = value;
  }

  const dialogClassName = isFullScreen
    ? 'max-w-[95vw] h-[90vh] flex flex-col'
    : 'max-w-2xl';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span className="cursor-pointer">
          {trigger}
        </span>
      </DialogTrigger>
      <DialogContent className={dialogClassName}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Prompt: {skill.label}</DialogTitle>
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 hover:bg-zinc-100 rounded"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="h-64 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Front-matter display (locked, read-only) */}
            <div className="bg-zinc-800 text-zinc-400 rounded p-3 font-mono text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3 h-3" />
                <span className="text-zinc-300 font-semibold">Front-matter (read-only)</span>
              </div>
              <pre className="whitespace-pre-wrap">{frontMatter}</pre>
            </div>

            {/* Markdown toolbar */}
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
              <button
                type="button"
                onClick={() => insertMarkdown('**', '**')}
                className="p-2 hover:bg-zinc-100 rounded"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('*', '*')}
                className="p-2 hover:bg-zinc-100 rounded"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('`', '`')}
                className="p-2 hover:bg-zinc-100 rounded"
                title="Code"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('## ')}
                className="p-2 hover:bg-zinc-100 rounded"
                title="Heading"
              >
                <Heading className="w-4 h-4" />
              </button>
            </div>

            {/* CodeMirror editor with resize handle */}
            <div
              className="rounded border border-zinc-700"
              style={{
                resize: isFullScreen ? 'none' : 'vertical',
                overflow: 'auto',
                minHeight: '200px',
                maxHeight: isFullScreen ? 'none' : '80vh',
              }}
            >
              <CodeMirrorEditor
                key={editorKey}
                value={bodyRef.current}
                onChange={handleEditorChange}
                isFullScreen={isFullScreen}
              />
            </div>

            {/* Error display */}
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {saving && (
            <p className="text-sm text-zinc-500 self-center mr-auto">
              Saving...
            </p>
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
