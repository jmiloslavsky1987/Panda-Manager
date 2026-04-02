import { Suspense } from 'react'
import { GlobalTimeView } from '@/components/GlobalTimeView'

export default function TimeTrackingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Time Tracking</h1>
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
        <GlobalTimeView />
      </Suspense>
    </div>
  )
}
