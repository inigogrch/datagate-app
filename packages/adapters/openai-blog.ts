import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { fetchAndParseGenericRss } from '../../lib/adapters/generic-rss'

// OpenAI Blog specific configuration
const OPENAI_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'OpenAI Official Blog',
  type: 'rss',
  endpoint_url: 'https://openai.com/news/rss.xml',
  fetch_freq_min: 60
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[OpenAI Blog] Starting raw metadata extraction from OpenAI RSS feed')
  
  try {
    // Use generic RSS adapter to extract all raw metadata
    const items = await fetchAndParseGenericRss(OPENAI_CONFIG)
    
    // Add OpenAI-specific metadata to originalMetadata
    const enhancedItems = items.map(item => ({
      ...item,
      originalMetadata: {
        ...item.originalMetadata,
        // OpenAI-specific context
        platform: 'openai',
        publication_type: 'official_announcements',
        content_focus: 'ai_research_product_updates',
        geographic_focus: 'global_ai_industry',
        publication_frequency: 'irregular',
        article_format: 'announcements_research_updates',
        organization_type: 'ai_research_company'
      }
    }))
    
    console.log(`[OpenAI Blog] Successfully extracted ${enhancedItems.length} raw articles`)
    return enhancedItems
    
  } catch (error) {
    console.error('[OpenAI Blog] Error extracting raw metadata:', error)
    throw error
  }
}

// Export config for registration in database
export { OPENAI_CONFIG } 