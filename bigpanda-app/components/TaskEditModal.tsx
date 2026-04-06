'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DatePickerCell } from '@/components/DatePickerCell'
import { OwnerCell } from '@/components/OwnerCell'
import type { Task } from '@/lib/queries'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskEditModalProps {
  task?: Task
  projectId: number
  trigger: React.ReactNode
  onSaved?: () => void
}

// ─── Default form state ───────────────────────────────────────────────────────

function emptyForm(task?: Task) {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    owner: task?.owner ?? '',
    due: task?.due ?? null,
    start_date: task?.start_date ?? null,
    priority: task?.priority ?? '',
    type: task?.type ?? '',
    phase: task?.phase ?? '',
    status: task?.status ?? 'todo',
    blocked_by: task?.blocked_by !== null && task?.blocked_by !== undefined
      ? String(task.blocked_by)
      : '',
    milestone_id: task?.milestone_id !== null && task?.milestone_id !== undefined
      ? String(task.milestone_id)
      : '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskEditModal({ task, projectId, trigger, onSaved }: TaskEditModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm(task))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = task !== undefined

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      owner: form.owner || null,
      due: form.due || null,
      start_date: form.start_date || null,
      priority: form.priority || null,
      type: form.type || null,
      phase: form.phase || null,
      status: form.status,
      blocked_by: form.blocked_by ? parseInt(form.blocked_by, 10) : null,
      milestone_id: form.milestone_id ? parseInt(form.milestone_id, 10) : null,
    }

    if (!isEdit) {
      payload.project_id = projectId
      payload.source = 'manual'
    }

    try {
      const url = isEdit ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(typeof body.error === 'string' ? body.error : 'Save failed')
        return
      }

      setOpen(false)
      setForm(emptyForm())
      router.refresh()
      onSaved?.()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (v) {
        setForm(emptyForm(task))
        setSaving(false)
      }
      setError(null)
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent data-testid="task-edit-modal" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
          {/* Title — required */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
              placeholder="Task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Owner */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Owner</label>
              <OwnerCell
                key={`owner-${form.owner}-${open}`}
                value={form.owner}
                projectId={projectId}
                onSave={async (v) => setForm((prev) => ({ ...prev, owner: v }))}
              />
            </div>

            {/* Phase */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Phase</label>
              <select
                name="phase"
                value={form.phase}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">— select —</option>
                <option value="Discovery">Discovery</option>
                <option value="Design">Design</option>
                <option value="Build">Build</option>
                <option value="Test">Test</option>
                <option value="Go-Live">Go-Live</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Due Date</label>
              <DatePickerCell
                key={`due-${form.due}-${open}`}
                value={form.due}
                onSave={async (v) => setForm((prev) => ({ ...prev, due: v }))}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Start Date</label>
              <DatePickerCell
                key={`start-${form.start_date}-${open}`}
                value={form.start_date}
                onSave={async (v) => setForm((prev) => ({ ...prev, start_date: v }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">— select —</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">— select —</option>
              <option value="technical">Technical</option>
              <option value="organizational">Organizational</option>
              <option value="customer-facing">Customer-Facing</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Blocked By Task ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Blocked By Task ID
              </label>
              <input
                name="blocked_by"
                type="number"
                value={form.blocked_by}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
                placeholder="Optional task ID"
              />
            </div>

            {/* Linked Milestone ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Linked Milestone ID
              </label>
              <input
                name="milestone_id"
                type="number"
                value={form.milestone_id}
                onChange={handleChange}
                className="w-full border border-zinc-300 rounded px-3 py-1.5 text-sm"
                placeholder="Optional milestone ID"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-sm text-zinc-600 border border-zinc-300 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
