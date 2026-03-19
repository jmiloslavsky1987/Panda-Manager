import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProjectWithHealth } from '@/lib/queries';

interface HealthCardProps {
  project: ProjectWithHealth;
}

const ragConfig: Record<
  'green' | 'yellow' | 'red',
  { label: string; className: string }
> = {
  green: { label: 'Healthy', className: 'bg-green-100 text-green-800 border-green-200' },
  yellow: { label: 'At Risk', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  red: { label: 'Critical', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function HealthCard({ project }: HealthCardProps) {
  const rag = ragConfig[project.health];

  return (
    <Card data-testid="health-card" className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-zinc-900 truncate">{project.customer}</span>
          <Badge className={rag.className}>{rag.label}</Badge>
        </div>
        {project.name !== project.customer && (
          <p className="text-xs text-zinc-500 truncate">{project.name}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {project.status_summary ? (
          <p className="text-sm text-zinc-600 line-clamp-2">{project.status_summary}</p>
        ) : (
          <p className="text-sm text-zinc-400 italic">No status summary available.</p>
        )}
        <div className="flex gap-4 text-xs text-zinc-500 mt-1">
          <span
            className={project.overdueActions > 0 ? 'text-red-600 font-medium' : ''}
          >
            {project.overdueActions} overdue action{project.overdueActions !== 1 ? 's' : ''}
          </span>
          <span
            className={project.highRisks > 0 ? 'text-orange-600 font-medium' : ''}
          >
            {project.highRisks} high risk{project.highRisks !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
