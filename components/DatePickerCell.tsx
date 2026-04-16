'use client'

import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import * as Popover from '@radix-ui/react-popover'
import { toast } from 'sonner'

interface DatePickerCellProps {
  value: string | null
  onSave: (isoDate: string | null) => Promise<void>
}

export function DatePickerCell({ value, onSave }: DatePickerCellProps) {
  const [open, setOpen] = useState(false)
  const [optimisticValue, setOptimisticValue] = useState(value)

  // Sync optimisticValue when prop changes (e.g., after router.refresh())
  useEffect(() => {
    if (!open) {
      setOptimisticValue(value)
    }
  }, [value, open])

  const parsedDate = optimisticValue && /^\d{4}-\d{2}-\d{2}/.test(optimisticValue)
    ? new Date(optimisticValue)
    : undefined

  async function handleDaySelect(day: Date | undefined) {
    const isoDate = day ? day.toISOString().split('T')[0] : null
    const prev = optimisticValue
    setOptimisticValue(isoDate)
    setOpen(false)

    try {
      await onSave(isoDate)
    } catch {
      setOptimisticValue(prev)
      toast.error('Save failed — please try again')
    }
  }

  async function handleClear() {
    const prev = optimisticValue
    setOptimisticValue(null)
    setOpen(false)

    try {
      await onSave(null)
    } catch {
      setOptimisticValue(prev)
      toast.error('Save failed — please try again')
    }
  }

  const displayValue = optimisticValue
    ? new Date(optimisticValue + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Set date'

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <span className="cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 text-xs inline-block border border-transparent hover:border-zinc-200 whitespace-nowrap">
          {displayValue}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-white border rounded-md shadow-md p-3"
          sideOffset={4}
          align="start"
        >
          <DayPicker
            mode="single"
            selected={parsedDate}
            onSelect={handleDaySelect}
          />
          <button
            onClick={handleClear}
            className="w-full mt-2 text-sm text-zinc-500 hover:text-zinc-700 text-center py-1 border-t"
          >
            Clear / TBD
          </button>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
