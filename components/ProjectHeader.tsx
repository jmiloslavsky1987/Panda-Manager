import type { ProjectWithHealth } from '../lib/queries'
import { Badge } from './ui/badge'

const RAG_LABELS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Healthy',
  yellow: 'At Risk',
  red: 'Critical',
}

const RAG_CLASSES: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  red: 'bg-red-100 text-red-800 border-red-200',
}

interface ProjectHeaderProps {
  project: ProjectWithHealth
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <h1 className="font-semibold text-xl text-zinc-900">{project.customer}</h1>
      <Badge className={RAG_CLASSES[project.health]}>
        {RAG_LABELS[project.health]}
      </Badge>
      {project.go_live_target && (
        <span className="text-sm text-zinc-500">
          Go-live: {project.go_live_target}
        </span>
      )}
    </div>
  )
}
