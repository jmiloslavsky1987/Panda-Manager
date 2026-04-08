export default async function WbsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
      <h2 className="text-xl font-semibold text-zinc-700 mb-2">Work Breakdown Structure</h2>
      <p className="text-zinc-500 text-sm max-w-sm">
        The WBS view is coming in the next phase. Your project data will appear here once the feature is complete.
      </p>
    </div>
  )
}
