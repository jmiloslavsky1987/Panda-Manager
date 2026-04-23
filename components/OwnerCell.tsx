'use client'

import { useState, useEffect, useId } from 'react'
import { toast } from 'sonner'

interface OwnerCellProps {
  value: string | null          // display text (owner column)
  ownerId?: number | null       // current FK (owner_id column)
  projectId: number
  onSave: (result: { ownerId: number | null; ownerName: string }) => Promise<void>
}

interface StakeholderOption {
  id: number
  name: string
  role: string | null
}

export function OwnerCell({ value, ownerId: _ownerId, projectId, onSave }: OwnerCellProps) {
  const [editing, setEditing] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value ?? '')
  const [stakeholders, setStakeholders] = useState<StakeholderOption[]>([])
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
      .then(data => setStakeholders(data ?? []))
      .catch(() => {})  // Empty datalist is acceptable fallback
  }, [editing, projectId])

  async function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (saving) return

    const typedValue = e.target.value.trim()
    const prev = optimisticValue

    setOptimisticValue(typedValue)
    setEditing(false)

    // Case 1: empty string — clear owner
    if (!typedValue) {
      setSaving(true)
      try {
        await onSave({ ownerId: null, ownerName: '' })
      } catch {
        setOptimisticValue(prev)
        toast.error('Save failed — please try again')
      } finally {
        setSaving(false)
      }
      return
    }

    // Case 2: exact case-insensitive match in stakeholders list
    const match = stakeholders.find(
      s => s.name.toLowerCase() === typedValue.toLowerCase()
    )
    if (match) {
      setSaving(true)
      try {
        await onSave({ ownerId: match.id, ownerName: match.name })
      } catch {
        setOptimisticValue(prev)
        toast.error('Save failed — please try again')
      } finally {
        setSaving(false)
      }
      return
    }

    // Case 3: no match — auto-create new stakeholder
    setSaving(true)
    try {
      const res = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: typedValue,
          role: '',
          company: '',
          source: 'manual',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create stakeholder')
      }

      const newRow: StakeholderOption = await res.json()
      toast.success(`New stakeholder '${typedValue}' created`)
      await onSave({ ownerId: newRow.id, ownerName: newRow.name })
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
          {stakeholders.map(s => (
            <option key={s.id} value={s.name} />
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
