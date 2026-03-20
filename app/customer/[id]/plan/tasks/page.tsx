export default async function TaskBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div data-testid="task-board" className="p-4"><p className="text-zinc-500">Task Board — coming in plan 03-06</p></div>
}
