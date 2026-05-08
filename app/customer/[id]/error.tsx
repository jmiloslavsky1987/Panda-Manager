'use client'

import { useEffect } from 'react'

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[WorkspaceError]', error)
  }, [error])

  return (
    <div className="p-8">
      <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
      <pre className="text-sm bg-red-50 border border-red-200 rounded p-4 whitespace-pre-wrap break-all mb-4">
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={reset}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
      >
        Try again
      </button>
    </div>
  )
}
