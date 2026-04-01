import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    parts: Array<{ type: string; text?: string }>
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  // Extract text from parts
  const textContent = message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('')

  if (!textContent) return null

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-zinc-100 rounded-lg px-4 py-2 max-w-2xl">
          <p className="text-sm text-zinc-900 whitespace-pre-wrap">{textContent}</p>
        </div>
      </div>
    )
  }

  // Assistant message with markdown rendering
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2 max-w-2xl">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{textContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
