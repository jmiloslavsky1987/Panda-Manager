import { redirect } from 'next/navigation'

export default async function SwimlaneRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/customer/${id}/plan`)
}
