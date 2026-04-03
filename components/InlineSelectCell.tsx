'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface InlineSelectCellProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onSave: (value: T) => Promise<void>
  className?: string
}

export function InlineSelectCell<T extends string>({
  value,
  options,
  onSave,
  className
}: InlineSelectCellProps<T>) {
  const [editing, setEditing] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (saving) return

    const newValue = e.target.value as T
    const previousValue = optimisticValue

    setOptimisticValue(newValue)
    setEditing(false)
    setSaving(true)

    try {
      await onSave(newValue)
    } catch {
      setOptimisticValue(previousValue)
      toast.error('Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <select
        autoFocus
        value={optimisticValue}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        disabled={saving}
        className="text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <span
      onClick={() => !saving && setEditing(true)}
      className={`cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 ${saving ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      {options.find(o => o.value === optimisticValue)?.label ?? optimisticValue}
    </span>
  )
}
