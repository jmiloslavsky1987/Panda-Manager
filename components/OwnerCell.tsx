'use client'

import { useState, useEffect, useId } from 'react'
import { toast } from 'sonner'

interface OwnerCellProps {
  value: string | null
  projectId: number
  onSave: (owner: string) => Promise<void>
}

export function OwnerCell({ value, projectId, onSave }: OwnerCellProps) {
  const [editing, setEditing] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value ?? '')
  const [stakeholders, setStakeholders] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const datalistId = useId()

  // Sync optimisticValue when prop changes (e.g., after router.refresh())
  useEffect(() => {
    if (!editing && !saving) {
      setOptimisticValue(value ?? '')
    }
  }, [value, editing, saving])

  useEffect(() => {
    if (!editing) return

    fetch(`/api/stakeholders?project_id=${projectId}`)
      .then(r => r.json())
      .then(data => setStakeholders((data ?? []).map((s: { name: string }) => s.name)))
      .catch(() => {})  // Empty datalist is acceptable fallback
  }, [editing, projectId])

  async function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (saving) return

    const newValue = e.target.value
    const prev = optimisticValue

    setOptimisticValue(newValue)
    setEditing(false)
    setSaving(true)

    try {
      await onSave(newValue)
    } catch {
      setOptimisticValue(prev)
      toast.error('Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <>
        <datalist id={datalistId}>
          {stakeholders.map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <input
          autoFocus
          type="text"
          list={datalistId}
          defaultValue={optimisticValue}
          onBlur={handleBlur}
          disabled={saving}
          className="text-sm border rounded px-1 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
        />
      </>
    )
  }

  return (
    <span
      onClick={() => !saving && setEditing(true)}
      className={`cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 text-sm ${saving ? 'opacity-50' : ''}`}
    >
      {optimisticValue || '—'}
    </span>
  )
}
