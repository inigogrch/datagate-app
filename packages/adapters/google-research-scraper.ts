import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { DateTime } from 'luxon'
import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

// Google Research Blog scraper configuration
const GOOGLE_RESEARCH_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'Google AI Research Blog',
  type: 'web_scrape',
  endpoint_url: 'https://research.google/blog/',
  fetch_freq_min: 120
}

async function fetchWithRateLimit(url: string): Promise<string> {
  try {
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
    return await response.text()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to fetch Google Research blog: ${errorMessage}`)
  }
}

function parseDate(dateString: string): Date {
  try {
    const cleanDateString = dateString.trim()
    const parsed = DateTime.fromFormat(cleanDateString, 'MMMM d, yyyy')
    if (parsed.isValid) {
      return parsed.toJSDate()
    }
    const fallback = new Date(cleanDateString)
    if (!isNaN(fallback.getTime())) {
      return fallback
    }
    return new Date()
  } catch {
    return new Date()
  }
}

function extractTags($: any, cardElement: any): string[] {
  const tags = ['google']
  try {
    const tagElements = cardElement.find('.glue-card__link-list .not-glue.caption')
    tagElements.each((_: number, element: any) => {
      const tagText = $(element).text().trim()
      if (tagText && tagText !== '·' && tagText !== '&183;' && tagText !== '&#183;') {
        const cleanTag = tagText
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .replace(/·/g, '')
          .replace(/\s+·\s+/g, ' ')
          .replace(/^\s*·\s*/, '')
          .replace(/\s*·\s*$/, '')
          .toLowerCase()
          .trim()
        if (cleanTag && cleanTag.length > 2 && !tags.includes(cleanTag)) {
          tags.push(cleanTag)
        }
      }
    })
  } catch {}
  return tags.slice(0, 5)
}

function createExternalId(url: string, title: string): string {
  const baseId = url || title
  return createHash('sha256').update(baseId).digest('hex').slice(0, 16)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  try {
    // Fetch the blog homepage
    const html = await fetchWithRateLimit(GOOGLE_RESEARCH_CONFIG.endpoint_url)
    const $ = cheerio.load(html)
    const items: ParsedItem[] = []
    const seenIds = new Set<string>()
    const cardSelector = 'a.glue-card.not-glue'
    const cards = $(cardSelector)
    if (cards.length === 0) {
      return []
    }
    const cardArray = cards.toArray()
    for (let index = 0; index < cardArray.length; index++) {
      try {
        const $card = $(cardArray[index])
        const relativeUrl = $card.attr('href')
        if (!relativeUrl) continue
        const url = new URL(relativeUrl, GOOGLE_RESEARCH_CONFIG.endpoint_url).toString()
        const titleElement = $card.find('.headline-5.js-gt-item-id')
        const title = titleElement.text().trim()
        if (!title) continue
        const dateElement = $card.find('.glue-label.glue-spacer-1-bottom')
        const dateText = dateElement.text().trim()
        if (!dateText) continue
        const publishedAt = parseDate(dateText)
        const tags = extractTags($, $card)
        const externalId = createExternalId(url, title)
        if (seenIds.has(externalId)) continue
        seenIds.add(externalId)
        // Only use what is available in the card for content
        const content = title
        const originalMetadata = {
          google_title: title,
          google_url: url,
          google_relative_url: relativeUrl,
          google_date_text: dateText,
          google_parsed_date: publishedAt.toISOString(),
          google_extracted_tags: tags,
          card_index: index,
          total_cards_found: cards.length
        }
        items.push({
          title,
          url,
          content,
          publishedAt,
          summary: undefined,
          author: undefined,
          image_url: undefined,
          story_category: undefined,
          tags,
          externalId,
          originalMetadata
        })
      } catch (itemError) {
        continue
      }
    }
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    return items
  } catch (error) {
    throw error
  }
}

export { GOOGLE_RESEARCH_CONFIG } 