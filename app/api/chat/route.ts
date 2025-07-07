import { streamText } from 'ai'
import { openai } from '@/lib/ai/openai'

// Edge runtime configuration
export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    // Extract messages from the request body
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request: messages array is required', {
        status: 400,
      })
    }

    // Get the OpenAI provider
    const provider = openai()

    // Stream the response using the AI SDK
    const result = streamText({
      model: provider('gpt-4o'),
      messages,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Return the data stream response (compatible with useChat)
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return new Response('OpenAI API key not configured', { status: 500 })
      }
    }

    return new Response('Internal server error', { status: 500 })
  }
} 