import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { fetchAndParseGenericRss } from '../../lib/adapters/generic-rss'

// MIT Sloan Management Review RSS configuration
const MIT_SLOAN_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'MIT Sloan Management Review',
  type: 'rss',
  endpoint_url: 'https://sloanreview.mit.edu/feed/',
  fetch_freq_min: 1440 // 24 hours (daily)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[MIT Sloan] Starting fetch from MIT Sloan Management Review RSS feed')
  try {
    const items = await fetchAndParseGenericRss(MIT_SLOAN_CONFIG)
    console.log(`[MIT Sloan] Found ${items.length} items`)
    // Add MIT Sloan-specific tags and enhance metadata
    const enhancedItems = items.map((item: ParsedItem) => ({
      ...item,
      tags: [...new Set([
        ...item.tags,
        'mit-sloan',
        'mit-sloan-management-review',
        'business-strategy',
        'management',
        'innovation',
        'leadership',
        'digital-transformation',
        'organizational-behavior',
        'academic-research',
        'business-insights'
      ])],
      originalMetadata: {
        ...item.originalMetadata,
        source_name: 'MIT Sloan Management Review',
        content_type: 'management_article',
        publication: 'mit_sloan_management_review',
        academic_source: true
      }
    }))
    // Sort by publish date (newest first)
    enhancedItems.sort((a: ParsedItem, b: ParsedItem) => b.publishedAt.getTime() - a.publishedAt.getTime())
    console.log(`[MIT Sloan] Successfully processed ${enhancedItems.length} management and strategy articles`)
    return enhancedItems
  } catch (error) {
    console.error('[MIT Sloan] Error fetching articles:', error)
    throw error
  }
}
export { MIT_SLOAN_CONFIG } 