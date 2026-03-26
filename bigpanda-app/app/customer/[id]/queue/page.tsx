import { ReviewQueue } from '@/components/ReviewQueue'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QueuePage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Review Queue</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Items discovered from external sources pending your review
        </p>
      </div>
      <ReviewQueue projectId={parseInt(id, 10)} />
    </div>
  )
}
