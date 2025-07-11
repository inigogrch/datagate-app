import { DateTime } from 'luxon'
import Turndown from 'turndown'
import { createHash } from 'crypto'
import { ParsedItem, SourceConfig } from './types'
import { fetchXml, parseRss } from './utils'

// Allowed row categories for validation
const ALLOWED_CATEGORIES = ['tools_frameworks', 'research_updates', 'industry_news'] as const

const td = new Turndown({
  // Configure turndown for better markdown conversion
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_'
})

export async function genericRssAdapter(sourceConfig: SourceConfig): Promise<ParsedItem[]> {
  if (!ALLOWED_CATEGORIES.includes(sourceConfig.row_category as any)) {
    throw new Error(`[adapter:${sourceConfig.name}] Invalid row_category "${sourceConfig.row_category}". Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`)
  }

  try {
    const xml = await fetchXml(sourceConfig.endpoint_url)
    const feed = await parseRss(xml)
    const seenIds = new Set<string>()
    const items: ParsedItem[] = []

    for (const item of feed.items) {
      try {
        let title = item.title?.trim() || (item.description?.substring(0, 70) ?? 'Untitled')
        
        // Decode HTML entities in title
        title = title
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
        const link = item.link?.trim() ?? ''
        if (!link) throw new Error('Missing link')
        
        const publishedAtRaw = item.pubDate ?? item.date ?? ''
        const publishedAt = DateTime.fromRFC2822(publishedAtRaw).toJSDate()
        if (!publishedAt || Number.isNaN(+publishedAt)) throw new Error(`Bad pubDate: "${publishedAtRaw}"`)

        // Enhanced content extraction with HTML entity decoding
        const html = item['content:encoded'] ?? item.content ?? item.description ?? ''
        let body = td.turndown(html).slice(0, 50_000)
        
        // Decode HTML entities
        body = body
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
        
        // If content is very short, use description as fallback
        if (body.length < 50 && item.description && item.description.length > body.length) {
          body = item.description.trim()
        }
        
        // Ensure we have some content
        if (!body.trim()) {
          body = `${title} - Read more at ${link}`
        }

        // External ID logic: prefer GUID, fallback to link hash
        let externalId = ''
        if (item.guid) {
          externalId = typeof item.guid === 'string' ? item.guid : item.guid.value
        }
        if (!externalId) {
          externalId = createHash('sha256').update(link).digest('hex')
        }

        // Deduplication in-memory guard
        if (seenIds.has(externalId)) continue
        seenIds.add(externalId)

        const tags = extractDefaultTags(`${title} ${body}`, sourceConfig.row_category)

        items.push({
          title,
          url: link,
          content: body,
          publishedAt,
          tags,
          externalId
        })
      } catch (itemErr) {
        // Log specific parsing error, continue with other items
        console.warn(`[adapter:${sourceConfig.name}] Skipping item due to error:`, itemErr, item?.title ?? item?.link ?? '[no id]')
      }
    }

    // Sort by date descending for consistency
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    console.log(`[adapter:${sourceConfig.name}] Parsed ${items.length} items from ${sourceConfig.endpoint_url}`)

    return items
  } catch (err) {
    console.error(`[adapter:${sourceConfig.name}] Fatal error:`, err)
    throw err
  }
}

// Helper function for basic keyword tag extraction
function extractDefaultTags(text: string, category: string): string[] {
  const tags: string[] = [category.replace('_', ' ')]
  const lowerText = text.toLowerCase()

  // Category-specific keywords
  const keywords: Record<string, string[]> = {
    tools_frameworks: [
      'aws', 'openai', 'microsoft', 'excel', 'power bi', 'python', 'sql',
      'analytics', 'data', 'cloud', 'api', 'framework', 'library'
    ],
    research_updates: [
      'ai', 'ml', 'machine learning', 'research', 'paper', 'study',
      'neural', 'model', 'algorithm', 'arxiv', 'conference'
    ],
    industry_news: [
      'funding', 'acquisition', 'startup', 'ipo', 'investment', 'market',
      'business', 'enterprise', 'saas', 'platform'
    ]
  }

  const categoryKeywords = keywords[category] || []
  categoryKeywords.forEach(keyword => {
    // Use word boundaries to reduce false positives
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
    if (pattern.test(lowerText)) {
      tags.push(keyword)
    }
  })

  // Deduplicate and return top 5 tags
  return [...new Set(tags)].slice(0, 5)
}
