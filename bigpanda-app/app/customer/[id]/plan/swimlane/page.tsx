export default async function SwimlanePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div data-testid="swimlane-view" className="p-4"><p className="text-zinc-500">Swimlane — coming in plan 03-08</p></div>
}
