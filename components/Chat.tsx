"use client"

import { useChat } from '@ai-sdk/react'
import { useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'

export function Chat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // Use the AI SDK's useChat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '👋 Welcome to DataGate AI! I\'m here to help you stay updated with the latest in tech. Ask me anything about frameworks, tools, best practices, or emerging technologies.',
      },
    ],
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Format message content with reliable markdown support
  const formatMessage = (content: string) => {
    // Step 1: Apply text formatting first (bold, italic, code)
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```[\s\S]*?```/g, (match) => {
        const codeContent = match.replace(/```(\w+)?\n([\s\S]*?)```/g, '$2')
        return `<pre class="bg-gray-800 p-3 rounded-md mt-2 mb-2 overflow-x-auto"><code>${codeContent}</code></pre>`
      })

    // Step 2: Split into lines and process structure
    const lines = formatted.split('\n')
    const processedLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip empty lines but preserve some spacing
      if (!line) {
        processedLines.push('<br/>')
        continue
      }
      
      // Handle headers
      if (line.startsWith('### ')) {
        processedLines.push(`<h3 class="text-lg font-bold text-white mt-3 mb-1">${line.slice(4)}</h3>`)
      } else if (line.startsWith('## ')) {
        processedLines.push(`<h2 class="text-xl font-bold text-white mt-3 mb-1">${line.slice(3)}</h2>`)
      } else if (line.startsWith('# ')) {
        processedLines.push(`<h1 class="text-2xl font-bold text-white mt-3 mb-1">${line.slice(2)}</h1>`)
      }
      // Handle numbered lists
      else if (line.match(/^\d+\.\s+/)) {
        const content = line.replace(/^\d+\.\s+/, '')
        processedLines.push(`<div class="flex items-start gap-2"><span class="text-gray-400 font-mono text-sm mt-0.5">${line.match(/^\d+/)?.[0]}.</span><span>${content}</span></div>`)
      }
      // Handle bullet lists
      else if (line.match(/^[-*]\s+/)) {
        const content = line.replace(/^[-*]\s+/, '')
        processedLines.push(`<div class="flex items-start gap-2"><span class="text-gray-400 mt-1">•</span><span>${content}</span></div>`)
      }
      // Handle regular paragraphs
      else {
        processedLines.push(`<div class="my-1">${line}</div>`)
      }
    }
    
    // Join and clean up excessive spacing
    return processedLines
      .join('')
      .replace(/(<br\/>){3,}/g, '<br/><br/>') // Limit consecutive breaks
      .replace(/(<br\/>)(<h[1-6])/g, '$2') // Remove breaks before headers
      .replace(/(<\/h[1-6]>)(<br\/>)/g, '$1') // Remove breaks after headers
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <Card
                  className={`max-w-[80%] p-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600'
                      : 'bg-gray-800 text-white border-gray-700'
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-600/30">
                    <p className="text-xs opacity-70">
                      {new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </Card>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
                <Card className="bg-gray-800 text-white border-gray-700 p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}

            {error && (
              <Card className="bg-red-900/20 text-red-400 border-red-800 p-4 max-w-4xl mx-auto">
                <p className="text-sm">Error: {error.message}</p>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-6 bg-gray-900/50">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-4">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about frameworks, tools, best practices, or anything tech-related..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • Powered by GPT-4
          </p>
        </form>
      </div>
    </div>
  )
} 