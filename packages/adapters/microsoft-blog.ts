import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { genericRssAdapter } from '../../lib/adapters/generic-rss'

// Microsoft multi-feed configuration
const MICROSOFT_BLOG_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'Microsoft Excel & Power BI Blog',
  type: 'rss',
  endpoint_url: 'https://powerbi.microsoft.com/en-us/blog/feed/', // Will be updated to support multiple feeds
  fetch_freq_min: 120,
  row_category: 'tools_frameworks'
}

// Multiple Microsoft RSS feeds for comprehensive coverage
const MICROSOFT_FEEDS = [
  {
    name: 'Power BI Blog',
    url: 'https://powerbi.microsoft.com/en-us/blog/feed/',
    description: 'Business intelligence and analytics updates'
  },
  {
    name: 'Excel Blog',
    url: 'https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=ExcelBlog',
    description: 'Spreadsheet features, Copilot, Python integration'
  },
  {
    name: 'Microsoft 365 Blog',
    url: 'https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=Microsoft365InsiderBlog',
    description: 'Office productivity suite updates'
  }
]

export async function fetchAndParse(): Promise<ParsedItem[]> {
  const allItems: ParsedItem[] = []
  
  // Fetch from all Microsoft feeds
  for (const feed of MICROSOFT_FEEDS) {
    try {
      console.log(`[Microsoft Adapter] Fetching from ${feed.name}...`)
      
      const sourceConfig: SourceConfig = {
        id: 'microsoft-blog',
        name: `Microsoft Excel & Power BI Blog - ${feed.name}`,
        type: 'rss',
        endpoint_url: feed.url,
        fetch_freq_min: 120,
        row_category: 'tools_frameworks'
      }
      
      const items = await genericRssAdapter(sourceConfig)
      console.log(`[Microsoft Adapter] Got ${items.length} items from ${feed.name}`)
      
      allItems.push(...items)
    } catch (error) {
      console.error(`[Microsoft Adapter] Failed to fetch from ${feed.name}:`, error)
      // Continue with other feeds even if one fails
    }
  }
  
  // Remove duplicates by URL and sort by date
  const uniqueItems = Array.from(
    new Map(allItems.map(item => [item.url, item])).values()
  )
  
  uniqueItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  
  console.log(`[Microsoft Adapter] Combined ${uniqueItems.length} unique items from ${MICROSOFT_FEEDS.length} feeds`)
  
  return uniqueItems
}

// Export config for registration in database
export { MICROSOFT_BLOG_CONFIG } 