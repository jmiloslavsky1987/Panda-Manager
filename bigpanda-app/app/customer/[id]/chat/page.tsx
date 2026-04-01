import { ChatPanel } from '@/components/chat/ChatPanel'

// Note: buildChatContext will be implemented in Plan 29-01
// For now, we'll use an empty context as fallback
async function buildChatContext(projectId: number): Promise<string> {
  // Temporary stub until Plan 29-01 is executed
  return ''
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  // Fetch context server-side to pass to ChatPanel
  let initialContext = ''
  try {
    initialContext = await buildChatContext(projectId)
  } catch (error) {
    console.error('Failed to build chat context:', error)
    // Continue with empty context rather than failing
  }

  return <ChatPanel projectId={projectId} initialContext={initialContext} />
}
