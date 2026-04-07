'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never }
  | { label: string; href: string; onClick?: never }

interface EmptyStateProps {
  title: string
  description: string
  action?: EmptyStateAction
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <h3 className="text-sm font-medium text-zinc-900 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 mb-4 max-w-sm">{description}</p>
      {action && (
        action.href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} size="sm" variant="outline">
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
