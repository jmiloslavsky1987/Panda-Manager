import { PlanTabs } from '@/components/PlanTabs';
import { SprintSummaryPanel } from '@/components/SprintSummaryPanel';

export default async function PlanLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const projectId = parseInt(id, 10);

  return (
    <div className="flex flex-col h-full" data-testid="plan-layout">
      <PlanTabs projectId={id} />
      <SprintSummaryPanel projectId={projectId} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
