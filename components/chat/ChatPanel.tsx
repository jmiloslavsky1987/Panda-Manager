'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ChatPanelProps {
  projectId: number
  initialContext: string
}

const STARTER_QUESTIONS = [
  'What are the open actions?',
  'Any overdue milestones?',
  'Summarize the current risks.',
  'Who are the key stakeholders?',
]

export function ChatPanel({ projectId, initialContext }: ChatPanelProps) {
  const [input, setInput] = useState('')

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/projects/${projectId}/chat`,
      headers: { 'Content-Type': 'application/json' },
      body: { context: initialContext },
    }),
  })

  const handleSend = () => {
    if (!input.trim() || status !== 'ready') return
    sendMessage({ text: input })
    setInput('')
  }

  const handleStarterQuestion = (question: string) => {
    if (status !== 'ready') return
    sendMessage({ text: question })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isTyping = status === 'submitted' || status === 'streaming'

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-200">
        <p className="text-sm text-zinc-500">
          Answers are based on this project&apos;s live data
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
        >
          Clear conversation
        </Button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !isTyping ? (
          // Empty state with starter questions
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <p className="text-sm text-zinc-500 mb-2">Start by asking a question:</p>
            <div className="grid grid-cols-1 gap-2 max-w-lg">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handleStarterQuestion(question)}
                  disabled={status !== 'ready'}
                  className="text-left px-4 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </>
        )}

        {/* Typing indicator - shown when typing regardless of message count */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                ></div>
                <span className="ml-2 text-sm text-zinc-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="pt-4 border-t border-zinc-200">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this project..."
            disabled={status !== 'ready'}
            className="flex-1 min-h-[60px] max-h-[200px]"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || status !== 'ready'}
            size="lg"
          >
            Send
          </Button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
