export default async function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div data-testid="gantt-container" className="p-4"><p className="text-zinc-500">Gantt Timeline — coming in plan 03-07</p></div>
}
