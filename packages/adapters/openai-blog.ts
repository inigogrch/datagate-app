import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { genericRssAdapter } from '../../lib/adapters/generic-rss'

// OpenAI Official Blog specific configuration
const OPENAI_BLOG_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'OpenAI Official Blog',
  type: 'rss',
  endpoint_url: 'https://openai.com/news/rss.xml',
  fetch_freq_min: 60
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  // Create a mock source config for the adapter
  const sourceConfig: SourceConfig = {
    id: 'openai-blog', // This will be replaced with actual DB ID
    ...OPENAI_BLOG_CONFIG
  }

  return await genericRssAdapter(sourceConfig)
}

// Export config for registration in database
export { OPENAI_BLOG_CONFIG } 