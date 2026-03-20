import { PlanTabs } from '@/components/PlanTabs'

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col h-full" data-testid="plan-layout">
      <PlanTabs projectId={id} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
