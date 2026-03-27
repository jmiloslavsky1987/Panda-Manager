'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BasicInfoStepProps {
  onComplete: (projectId: number) => void
}

type ProjectStatus = 'draft' | 'active'

interface FormFields {
  name: string
  customer: string
  status: ProjectStatus
  startDate: string
  endDate: string
  description: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BasicInfoStep({ onComplete }: BasicInfoStepProps) {
  const [fields, setFields] = useState<FormFields>({
    name: '',
    customer: '',
    status: 'draft',
    startDate: '',
    endDate: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormFields, string>>>({})

  function handleChange(key: keyof FormFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
    // Clear field-level error on change
    if (fieldErrors[key]) {
      setFieldErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Validation
    const errors: Partial<Record<keyof FormFields, string>> = {}
    if (!fields.name.trim()) errors.name = 'Project name is required'
    if (!fields.customer.trim()) errors.customer = 'Customer name is required'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fields.name.trim(),
          customer: fields.customer.trim(),
          status: fields.status,
          start_date: fields.startDate || undefined,
          end_date: fields.endDate || undefined,
          description: fields.description.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || res.status !== 201) {
        throw new Error(data.error ?? 'Failed to create project')
      }

      onComplete(data.project.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Project Information</h2>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the basic details for your new project. You can update these later.
        </p>
      </div>

      {/* Name + Customer row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Name */}
        <div className="space-y-1">
          <label htmlFor="wizard-name" className="block text-sm font-medium text-gray-700">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            id="wizard-name"
            type="text"
            value={fields.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="e.g. ACME Q2 Implementation"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-600" role="alert">{fieldErrors.name}</p>
          )}
        </div>

        {/* Customer Name */}
        <div className="space-y-1">
          <label htmlFor="wizard-customer" className="block text-sm font-medium text-gray-700">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            id="wizard-customer"
            type="text"
            value={fields.customer}
            onChange={e => handleChange('customer', e.target.value)}
            placeholder="e.g. ACME Corp"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          />
          {fieldErrors.customer && (
            <p className="text-xs text-red-600" role="alert">{fieldErrors.customer}</p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1">
        <label htmlFor="wizard-status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="wizard-status"
          value={fields.status}
          onChange={e => handleChange('status', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          disabled={loading}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-1">
          <label htmlFor="wizard-start-date" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            id="wizard-start-date"
            type="date"
            value={fields.startDate}
            onChange={e => handleChange('startDate', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label htmlFor="wizard-end-date" className="block text-sm font-medium text-gray-700">
            Expected End Date
          </label>
          <input
            id="wizard-end-date"
            type="date"
            value={fields.endDate}
            onChange={e => handleChange('endDate', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="wizard-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="wizard-description"
          value={fields.description}
          onChange={e => handleChange('description', e.target.value)}
          rows={4}
          placeholder="Brief description of the project and its goals…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 resize-none"
          disabled={loading}
        />
      </div>

      {/* Submission error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating…' : 'Next'}
        </button>
      </div>
    </form>
  )
}
