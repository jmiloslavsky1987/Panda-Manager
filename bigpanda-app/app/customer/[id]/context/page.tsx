import { requireSession } from '@/lib/auth-server'
import { ContextTab } from '@/components/ContextTab'

export const dynamic = 'force-dynamic'

export default async function ContextPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSession()
  const { id } = await params
  return <ContextTab projectId={id} />
}
