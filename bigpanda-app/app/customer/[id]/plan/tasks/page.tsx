import { redirect } from 'next/navigation'

export default async function TasksRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/customer/${id}/tasks`)
}
