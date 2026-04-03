'use client'

import { useState } from 'react'
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

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <span className="cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5 text-sm">
          {optimisticValue ?? '—'}
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
