import Parser from 'rss-parser'

const parser = new Parser({
  // Custom field mappings for better RSS compatibility
  customFields: {
    feed: ['language', 'generator'],
    item: [
      ['content:encoded', 'content:encoded'],
      ['dc:creator', 'author'],
      ['pubdate', 'pubDate'],
      ['published', 'pubDate']
    ]
  }
})

export interface RssItem {
  title?: string
  link?: string
  description?: string
  content?: string
  'content:encoded'?: string
  pubDate?: string
  date?: string
  guid?: string | { value: string }
  author?: string
  categories?: string[]
  [key: string]: any
}

export interface RssFeed {
  items: RssItem[]
  title?: string
  description?: string
  link?: string
  language?: string
  lastBuildDate?: string
}

export async function parseRss(xml: string): Promise<RssFeed> {
  try {
    // Clean XML: remove zero-width characters and normalize whitespace
    const cleanXml = xml
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
      .replace(/&(?![a-zA-Z]{1,8};)/g, '&amp;') // Escape unescaped ampersands
      .trim()

    if (!cleanXml.includes('<rss') && !cleanXml.includes('<feed') && !cleanXml.includes('<channel')) {
      throw new Error('Input does not appear to be valid RSS/Atom XML')
    }

    const feed = await parser.parseString(cleanXml)
    
    if (!feed.items || !Array.isArray(feed.items)) {
      throw new Error('RSS feed has no items array')
    }

    console.log(`[parseRss] Successfully parsed feed with ${feed.items.length} items`)
    
    return {
      items: feed.items,
      title: feed.title,
      description: feed.description,
      link: feed.link,
      language: feed.language,
      lastBuildDate: feed.lastBuildDate
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[parseRss] Failed to parse RSS XML:', errorMessage)
    
    // Log first 500 chars of XML for debugging (don't log full content)
    console.error('[parseRss] XML preview:', xml.slice(0, 500) + (xml.length > 500 ? '...' : ''))
    
    throw new Error(`parseRss failed: ${errorMessage}`)
  }
}
