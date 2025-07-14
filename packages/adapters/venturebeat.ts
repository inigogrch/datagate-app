import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { genericRssAdapter } from '../../lib/adapters/generic-rss'

// VentureBeat RSS configuration
const VENTUREBEAT_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'VentureBeat',
  type: 'rss',
  endpoint_url: 'https://venturebeat.com/feed/',
  fetch_freq_min: 60 // 1 hour (tech news updates frequently)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[VentureBeat] Starting fetch from VentureBeat RSS feed')
  
  // Create source config for VentureBeat
  const sourceConfig: SourceConfig = {
    id: 'venturebeat',
    ...VENTUREBEAT_CONFIG
  }
  
  try {
    const items = await genericRssAdapter(sourceConfig)
    console.log(`[VentureBeat] Found ${items.length} items`)
    
    // Add VentureBeat-specific tags and enhance metadata
    const enhancedItems = items.map(item => ({
      ...item,
      tags: [...new Set([
        ...item.tags,
        'venturebeat',
        'tech-news',
        'ai-news',
        'artificial-intelligence',
        'industry-news',
        'enterprise-tech',
        'business-technology',
        'startup-news',
        'venture-capital',
        'technology'
      ])],
      originalMetadata: {
        ...item.originalMetadata,
        source_name: 'VentureBeat',
        content_type: 'tech_news_article',
        focus: 'enterprise_technology',
        publication: 'venturebeat'
      }
    }))
    
    // Sort by publish date (newest first)
    enhancedItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[VentureBeat] Successfully processed ${enhancedItems.length} tech news articles`)
    return enhancedItems
    
  } catch (error) {
    console.error('[VentureBeat] Error fetching tech news:', error)
    throw error
  }
}

// Export config for registration in database
export { VENTUREBEAT_CONFIG }
// Keep backwards compatibility
export { VENTUREBEAT_CONFIG as AI_NEWS_CONFIG, VENTUREBEAT_CONFIG as INSIDE_AI_CONFIG } 