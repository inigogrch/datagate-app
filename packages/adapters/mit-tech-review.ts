import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { genericRssAdapter } from '../../lib/adapters/generic-rss'

// MIT Technology Review configuration with multiple RSS feeds
const MIT_FEEDS = [
  {
    name: 'MIT AI News',
    url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml',
    category: 'artificial-intelligence'
  },
  {
    name: 'MIT Research News', 
    url: 'https://news.mit.edu/rss/research',
    category: 'research'
  },
  {
    name: 'MIT Data News',
    url: 'https://news.mit.edu/topic/mitdata-rss.xml', 
    category: 'data'
  }
]

const MIT_TECH_REVIEW_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'MIT Technology Review',
  type: 'rss',
  endpoint_url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml', // Primary feed
  fetch_freq_min: 720 // 12 hours
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[MIT Tech Review] Starting fetch from multiple MIT News feeds')
  
  const allItems: ParsedItem[] = []
  const seenUrls = new Set<string>()
  
  for (const feed of MIT_FEEDS) {
    try {
      console.log(`[MIT Tech Review] Fetching ${feed.name} from ${feed.url}`)
      
      // Create source config for this feed
      const sourceConfig: SourceConfig = {
        id: `mit-${feed.category}`,
        name: `MIT Technology Review - ${feed.name}`,
        type: 'rss',
        endpoint_url: feed.url,
        fetch_freq_min: 720
      }
      
      const items = await genericRssAdapter(sourceConfig)
      console.log(`[MIT Tech Review] ${feed.name}: found ${items.length} items`)
      
      // Add category-specific tags and deduplicate
      for (const item of items) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url)
          
          // Add MIT-specific tags
          const mitTags = ['mit', 'research', 'technology', feed.category]
          if (feed.category === 'artificial-intelligence') {
            mitTags.push('ai', 'machine-learning')
          }
          
          // Merge with existing tags
          item.tags = [...new Set([...item.tags, ...mitTags])]
          
          // Update source name to be consistent
          item.originalMetadata = {
            ...item.originalMetadata,
            source_feed: feed.name,
            feed_category: feed.category
          }
          
          allItems.push(item)
        }
      }
      
    } catch (error) {
      console.error(`[MIT Tech Review] Error fetching ${feed.name}:`, error)
      // Continue with other feeds even if one fails
    }
  }
  
  // Sort by publish date (newest first)
  allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  
  console.log(`[MIT Tech Review] Combined ${allItems.length} unique items from ${MIT_FEEDS.length} feeds`)
  return allItems
}

// Export config for registration in database
export { MIT_TECH_REVIEW_CONFIG } 