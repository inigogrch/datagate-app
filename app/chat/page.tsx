"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Loader2, Sparkles, Code, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Sidebar from "@/components/Sidebar"
import TopNav from "@/components/TopNav"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  type?: "text" | "code" | "suggestion"
}

const quickPrompts = [
  { icon: Code, text: "What's new in React 19?", category: "Framework" },
  { icon: Lightbulb, text: "Best practices for TypeScript", category: "Skill" },
  { icon: Sparkles, text: "Latest AI tools for developers", category: "Tools" },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "👋 Welcome to DataGate AI! I'm here to help you stay updated with the latest in tech. I can provide insights on frameworks, tools, best practices, and emerging technologies. What would you like to explore today?",
      role: "assistant",
      timestamp: new Date(),
      type: "text",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      role: "user",
      timestamp: new Date(),
      type: "text",
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // TODO: Replace with actual AI API call
    setTimeout(() => {
      let response = ""
      let type: "text" | "code" | "suggestion" = "text"

      if (textToSend.toLowerCase().includes("react")) {
        response = `🚀 **React 19 Latest Updates:**

• **Server Components 2.0**: Enhanced performance with better hydration
• **Concurrent Features**: Improved Suspense and error boundaries  
• **New Hooks**: useOptimistic and useFormStatus for better UX
• **Compiler Improvements**: Automatic optimization without manual memoization

**Why it matters**: These updates significantly improve app performance and developer experience. Server Components reduce bundle size while maintaining interactivity.

Would you like me to explain any of these features in detail?`
      } else if (textToSend.toLowerCase().includes("typescript")) {
        response = `💡 **TypeScript Best Practices 2024:**

\`\`\`typescript
// Use strict type definitions
interface User {
  id: string
  name: string
  email: string
}

// Leverage utility types
type PartialUser = Partial<User>
type UserEmail = Pick<User, 'email'>
\`\`\`

**Key Recommendations:**
• Use strict mode and enable all compiler checks
• Prefer interfaces over types for object shapes
• Utilize template literal types for better API design
• Implement branded types for runtime safety

**Pro tip**: Use TypeScript 5.3's new decorators for cleaner code architecture!`
        type = "code"
      } else if (textToSend.toLowerCase().includes("ai tools")) {
        response = `🤖 **Top AI Tools for Developers (2024):**

**Code Generation:**
• GitHub Copilot - AI pair programming
• Cursor - AI-first code editor
• Tabnine - Intelligent code completion

**Development Workflow:**
• v0 by Vercel - UI component generation
• Replit Ghostwriter - Full-stack AI assistant
• CodeWhisperer - AWS's code suggestions

**Productivity:**
• ChatGPT/Claude - Problem solving & debugging
• Notion AI - Documentation & planning
• Linear AI - Project management

These tools are revolutionizing how we build software. Want to dive deeper into any specific category?`
        type = "suggestion"
      } else {
        response = `I understand you're asking about "${textToSend}". Based on current tech trends, here's what I can share:

This is a comprehensive topic that intersects with modern development practices. The landscape is constantly evolving, and staying updated requires following the right sources and understanding emerging patterns.

**Key considerations:**
• Performance implications
• Developer experience impact  
• Community adoption trends
• Long-term sustainability

Would you like me to elaborate on any specific aspect or provide more targeted information?`
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        timestamp: new Date(),
        type,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        '<pre class="bg-gray-800 p-3 rounded-md mt-2 mb-2 overflow-x-auto"><code>$2</code></pre>',
      )
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .split("\n")
      .map((line) => line.trim())
      .join("<br/>")
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="flex">
        <Sidebar />

        <div className="flex-1">
          <TopNav />

          <main className="flex flex-col pt-20 h-screen">
            {/* Chat Header */}
            <div className="border-b border-gray-800 p-6 bg-gradient-to-r from-gray-900 to-gray-800">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">DataGate AI Assistant</h1>
                    <p className="text-gray-400">Your personal tech update companion</p>
                  </div>
                </div>

                {/* Quick Prompts */}
                {messages.length <= 1 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {quickPrompts.map(({ icon: Icon, text, category }, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSend(text)}
                        className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                        disabled={isLoading}
                      >
                        <Icon className="h-3 w-3 mr-2" />
                        {text}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {category}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col max-h-[calc(100vh-280px)]">
                <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                  <div className="space-y-6 max-w-4xl mx-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}

                        <Card
                          className={`max-w-[80%] p-4 ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600"
                              : message.type === "code"
                                ? "bg-gray-800 text-white border-gray-700 border-l-4 border-l-green-500"
                                : message.type === "suggestion"
                                  ? "bg-gray-800 text-white border-gray-700 border-l-4 border-l-yellow-500"
                                  : "bg-gray-800 text-white border-gray-700"
                          }`}
                        >
                          <div
                            className="text-sm leading-relaxed prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                          />
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-600/30">
                            <p className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {message.type && message.type !== "text" && (
                              <Badge variant="outline" className="text-xs">
                                {message.type}
                              </Badge>
                            )}
                          </div>
                        </Card>

                        {message.role === "user" && (
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
                            <span className="text-sm">Analyzing and generating response...</span>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t border-gray-800 p-6 bg-gray-900/50">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask about frameworks, tools, best practices, or anything tech-related..."
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 pr-12 py-3"
                          disabled={isLoading}
                        />
                      </div>
                      <Button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                      <span>Press Enter to send • Shift+Enter for new line</span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Powered by DataGate AI
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
