import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { fetchAndParseGenericRss } from '../../lib/adapters/generic-rss'

// TechCrunch configuration
const TECHCRUNCH_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'TechCrunch',
  type: 'rss',
  endpoint_url: 'https://techcrunch.com/feed/',
  fetch_freq_min: 30 // 30 minutes (high frequency for breaking tech news)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[TechCrunch] Starting raw metadata extraction from TechCrunch RSS feed')
  
  try {
    // Use generic RSS adapter to extract all raw metadata
    const items = await fetchAndParseGenericRss(TECHCRUNCH_CONFIG)
    
    // Add TechCrunch-specific metadata to originalMetadata
    const enhancedItems = items.map(item => ({
      ...item,
      originalMetadata: {
        ...item.originalMetadata,
        // TechCrunch-specific context
        platform: 'techcrunch',
        publication_type: 'tech_journalism',
        content_focus: 'startup_technology_business',
        geographic_focus: 'global_tech_industry',
        publication_frequency: 'continuous',
        article_format: 'news_analysis_reporting'
      }
    }))
    
    console.log(`[TechCrunch] Successfully extracted ${enhancedItems.length} raw articles`)
    return enhancedItems
    
  } catch (error) {
    console.error('[TechCrunch] Error extracting raw metadata:', error)
    throw error
  }
}

// Export config for registration in database
export { TECHCRUNCH_CONFIG } 