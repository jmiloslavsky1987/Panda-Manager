import { TimeTab } from '../../../../components/TimeTab'

export default async function TimePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TimeTab projectId={parseInt(id, 10)} />
}
