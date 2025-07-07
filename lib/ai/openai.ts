import { createOpenAI } from '@ai-sdk/openai'

// Lazy singleton for OpenAI provider
let openaiProvider: ReturnType<typeof createOpenAI> | null = null

export function getOpenAIProvider() {
  if (!openaiProvider) {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please add it to your environment variables.'
      )
    }

    // Create the provider using the AI SDK's createOpenAI function
    openaiProvider = createOpenAI({
      apiKey,
    })
  }

  return openaiProvider
}

// Export the provider getter for convenience
export const openai = () => getOpenAIProvider() 