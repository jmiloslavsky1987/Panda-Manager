'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChatMessage } from './ChatMessage'
import { MutationConfirmCard, MutationConfirmCardComplete } from './MutationConfirmCard'
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
  const searchParams = useSearchParams()
  // Read active workspace tab from URL — WorkspaceTabs sets ?tab= in the URL
  // Also support legacy ?activeTab= for direct navigation
  const activeTab = searchParams.get('activeTab') ?? searchParams.get('tab') ?? 'unknown'

  const { messages, sendMessage, status, error, setMessages, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/projects/${projectId}/chat`,
      headers: { 'Content-Type': 'application/json' },
      body: { context: initialContext, activeTab },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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
            {messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((message) => {
                // Check if message has any tool parts
                const hasParts = Array.isArray((message as any).parts) && (message as any).parts.length > 0
                if (!hasParts) {
                  return <ChatMessage key={message.id} message={message as any} />
                }

                const parts = (message as any).parts as any[]
                const hasToolParts = parts.some((p: any) => isToolUIPart(p))

                if (!hasToolParts) {
                  return <ChatMessage key={message.id} message={message as any} />
                }

                // Render parts individually — text parts via ChatMessage, tool parts via cards
                return (
                  <div key={message.id}>
                    {parts.map((part: any, partIndex: number) => {
                      if (isToolUIPart(part)) {
                        if (part.state === 'approval-requested') {
                          return (
                            <MutationConfirmCard
                              key={`${message.id}-${partIndex}`}
                              part={part as any}
                              onApprove={() =>
                                addToolApprovalResponse({ id: (part as any).approval?.id, approved: true })
                              }
                              onReject={() =>
                                addToolApprovalResponse({
                                  id: (part as any).approval?.id,
                                  approved: false,
                                  reason: 'User cancelled',
                                })
                              }
                            />
                          )
                        }
                        // approval-responded, output-available, error
                        return (
                          <MutationConfirmCardComplete
                            key={`${message.id}-${partIndex}`}
                            state={part.state as any}
                            approved={(part as any).approval?.approved}
                          />
                        )
                      }
                      // text parts — render message once per text part
                      if (part.type === 'text') {
                        return <ChatMessage key={`${message.id}-${partIndex}`} message={message as any} />
                      }
                      return null
                    })}
                  </div>
                )
              })}
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
