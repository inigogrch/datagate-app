import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { DateTime } from 'luxon'
import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

// Google Research Blog scraper configuration
const GOOGLE_RESEARCH_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'Google AI Research Blog',
  type: 'web_scrape', // Web scraping adapter for Google Research Blog
  endpoint_url: 'https://research.google/blog/',
  fetch_freq_min: 120 // Research posts are less frequent than news
}

// Rate limiting delay (1 second as specified)
const RATE_LIMIT_DELAY = 1000

async function fetchWithRateLimit(url: string): Promise<string> {
  try {
    console.log(`[Google Research Scraper] Fetching ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DataGate/1.0 (Research aggregator)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
    
    return html
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Google Research Scraper] Failed to fetch ${url}:`, errorMessage)
    throw new Error(`Failed to fetch Google Research blog: ${errorMessage}`)
  }
}

function parseDate(dateString: string): Date {
  try {
    // Handle format: "July 10, 2025" or similar
    const cleanDateString = dateString.trim()
    
    // Try parsing with Luxon
    const parsed = DateTime.fromFormat(cleanDateString, 'MMMM d, yyyy')
    
    if (parsed.isValid) {
      return parsed.toJSDate()
    }
    
    // Fallback to JavaScript Date parsing
    const fallback = new Date(cleanDateString)
    if (!isNaN(fallback.getTime())) {
      return fallback
    }
    
    console.warn(`[Google Research Scraper] Could not parse date: "${dateString}". Using current date.`)
    return new Date()
  } catch (error) {
    console.warn(`[Google Research Scraper] Date parsing error for "${dateString}":`, error)
    return new Date()
  }
}

function extractTags($: any, cardElement: any): string[] {
  const tags = ['google'] // Default tags
  
  try {
    // Look for tags in .glue-card__link-list
    const tagElements = cardElement.find('.glue-card__link-list .not-glue.caption')
    
    tagElements.each((_: number, element: any) => {
      const tagText = $(element).text().trim()
      if (tagText && tagText !== '·' && tagText !== '&183;' && tagText !== '&#183;') {
        // Clean up the tag text and convert to lowercase
        const cleanTag = tagText
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .replace(/·/g, '') // Remove bullet separators
          .replace(/\s+·\s+/g, ' ') // Remove spaced bullets
          .replace(/^\s*·\s*/, '') // Remove leading bullets
          .replace(/\s*·\s*$/, '') // Remove trailing bullets
          .toLowerCase()
          .trim()
        
        if (cleanTag && cleanTag.length > 2 && !tags.includes(cleanTag)) {
          tags.push(cleanTag)
        }
      }
    })
  } catch (error) {
    console.warn('[Google Research Scraper] Failed to extract tags:', error)
  }
  
  // Limit to 5 tags and ensure we have some defaults
  return tags.slice(0, 5)
}

function createExternalId(url: string, title: string): string {
  // Create a stable external ID from URL or title hash
  const baseId = url || title
  return createHash('sha256').update(baseId).digest('hex').slice(0, 16)
}

function createPostContent(title: string, dateText: string, url: string, tags: string[]): string {
  const lines = [
    `# ${title}`,
    '',
    `Google Research blog post published on ${dateText}.`,
    '',
    `**Research Areas:** ${tags.filter(tag => !['research updates', 'google'].includes(tag)).join(', ') || 'General Research'}`,
    '',
    `**Published:** ${dateText}`,
    `**Source:** Google Research Blog`,
    '',
    `This post covers cutting-edge research and developments from Google's AI and research teams.`,
    '',
    `[Read Full Article](${url})`,
    '',
    `---`,
    `*This is a research update from Google's official research blog, covering developments in artificial intelligence, machine learning, and computer science.*`
  ]
  
  return lines.join('\n')
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[Google Research Scraper] Starting scrape of Google Research Blog')
  
  try {
    // Fetch the blog homepage
    const html = await fetchWithRateLimit(GOOGLE_RESEARCH_CONFIG.endpoint_url)
    
    // Parse with Cheerio
    const $ = cheerio.load(html)
    const items: ParsedItem[] = []
    const seenIds = new Set<string>()
    
    // Find all blog post cards
    const cardSelector = 'a.glue-card.not-glue'
    const cards = $(cardSelector)
    
    if (cards.length === 0) {
      console.warn('[Google Research Scraper] No blog post cards found. Page structure may have changed.')
      console.warn(`[Google Research Scraper] Tried selector: ${cardSelector}`)
      return []
    }
    
    console.log(`[Google Research Scraper] Found ${cards.length} blog post cards`)
    
    cards.each((index, element) => {
      try {
        const $card = $(element)
        
        // Extract URL (make absolute)
        const relativeUrl = $card.attr('href')
        if (!relativeUrl) {
          console.warn(`[Google Research Scraper] Card ${index + 1}: No href found`)
          return // Skip this card
        }
        
        const url = new URL(relativeUrl, GOOGLE_RESEARCH_CONFIG.endpoint_url).toString()
        
        // Extract title
        const titleElement = $card.find('.headline-5.js-gt-item-id')
        const title = titleElement.text().trim()
        
        if (!title) {
          console.warn(`[Google Research Scraper] Card ${index + 1}: No title found`)
          return // Skip this card
        }
        
        // Extract date
        const dateElement = $card.find('.glue-label.glue-spacer-1-bottom')
        const dateText = dateElement.text().trim()
        
        if (!dateText) {
          console.warn(`[Google Research Scraper] Card ${index + 1}: No date found for "${title}"`)
          return // Skip this card
        }
        
        const publishedAt = parseDate(dateText)
        
        // Extract tags
        const tags = extractTags($, $card)
        
        // Create content from title (we don't have full content from the listing page)
        const content = createPostContent(title, dateText, url, tags)
        
        // Generate external ID
        const externalId = createExternalId(url, title)
        
        // Skip duplicates
        if (seenIds.has(externalId)) {
          console.log(`[Google Research Scraper] Skipping duplicate: "${title}"`)
          return
        }
        seenIds.add(externalId)
        
        const item: ParsedItem = {
          title,
          url,
          content,
          publishedAt,
          summary: content.length > 300 ? 
            content.substring(0, 300).trim() + '...' : 
            content.trim(),
          author: undefined, // Google Research posts don't typically have individual authors
          image_url: '/lib/images/google_research_logo.jpg', // Google Research logo fallback
          story_category: 'research',
          tags,
          externalId,
          originalMetadata: {
            // Google Research metadata
            google_title: title,
            google_url: url,
            google_relative_url: relativeUrl,
            google_date_text: dateText,
            google_parsed_date: publishedAt.toISOString(),
            google_extracted_tags: tags,
            
            // Processing metadata
            content_word_count: content.split(/\s+/).length,
            content_character_count: content.length,
            processing_timestamp: new Date().toISOString(),
            processing_source: 'Google Research Blog Scraper',
            processing_endpoint: GOOGLE_RESEARCH_CONFIG.endpoint_url,
            
            // Content type
            source_name: 'Google AI Research Blog',
            content_type: 'research_blog_post',
            publication_type: 'corporate_research',
            academic_source: false,
            research_organization: 'Google Research',
            
            // Scraping context
            card_index: index,
            total_cards_found: cards.length
          }
        }
        
        items.push(item)
        
        console.log(`[Google Research Scraper] Parsed: "${title}" (${dateText})`)
        
      } catch (itemError) {
        console.warn(`[Google Research Scraper] Failed to parse card ${index + 1}:`, itemError)
        // Continue with other cards
      }
    })
    
    // Sort by publication date (newest first)
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[Google Research Scraper] Successfully scraped ${items.length} unique research posts`)
    
    return items
    
  } catch (error) {
    console.error('[Google Research Scraper] Fatal error during scraping:', error)
    throw error
  }
}

// Export config for registration in database
export { GOOGLE_RESEARCH_CONFIG } 