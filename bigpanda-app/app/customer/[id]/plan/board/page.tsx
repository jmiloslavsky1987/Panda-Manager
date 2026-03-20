export default async function PhaseBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div data-testid="phase-board" className="p-4"><p className="text-zinc-500">Phase Board — coming in plan 03-06</p></div>
}
