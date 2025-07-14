import { DateTime } from 'luxon'
import Turndown from 'turndown'
import { createHash } from 'crypto'
import { ParsedItem, SourceConfig } from './types'
import { fetchXml, parseRss } from './utils'

const td = new Turndown({
  // Configure turndown for better markdown conversion
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_'
})

// Extract author from various RSS fields
function extractAuthor(item: any): string | undefined {
  // Try different author fields in order of preference
  const authorCandidates = [
    item.author,
    item['dc:creator'], 
    item['dc:publisher'],
    item.creator,
    item.publisher
  ].filter(Boolean)
  
  if (authorCandidates.length > 0) {
    let author = authorCandidates[0].trim()
    // Clean email addresses if present
    author = author.replace(/\s*\([^)]*\)\s*$/, '') // Remove (email)
    author = author.replace(/\s*<[^>]*>\s*$/, '') // Remove <email>
    return author.length > 0 ? author : undefined
  }
  
  return undefined
}

// Extract image URL from various RSS media fields
function extractImageUrl(item: any, sourceConfig: SourceConfig): string | undefined {
  // Try different image sources in order of preference
  const imageCandidates = [
    // Media namespace images
    item['media:content']?.url || item['media:content']?.[0]?.url,
    item['media:thumbnail']?.url || item['media:thumbnail']?.[0]?.url,
    
    // Enclosure images
    item.enclosure?.url && item.enclosure?.type?.startsWith('image/') ? item.enclosure.url : null,
    
    // iTunes namespace
    item['itunes:image']?.href,
    
    // Description embedded images (extract first img src)
    extractImageFromDescription(item.description || ''),
    extractImageFromDescription(item['content:encoded'] || ''),
    
    // RSS 2.0 image element
    item.image?.url
  ].filter(Boolean)
  
  // If we found an image, return it
  if (imageCandidates.length > 0) {
    return imageCandidates[0]
  }
  
  // Source-specific fallback images for better UX
  return getSourceFallbackImage(sourceConfig.name)
}

// Extract first image URL from HTML content
function extractImageFromDescription(html: string): string | undefined {
  if (!html) return undefined
  
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
  return imgMatch?.[1]
}

// Extract summary from RSS fields, preferring description over content
function extractSummary(item: any, content: string): string {
  // Prefer explicit description fields
  let summary = item.description || item.summary || item['dc:description'] || ''
  
  // Clean HTML from summary
  if (summary) {
    summary = summary.replace(/<[^>]*>/g, '').trim()
    // Decode HTML entities
    summary = summary
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }
  
  // If no summary or too short, extract from content
  if (!summary || summary.length < 50) {
    // Take first paragraph or first 200 chars
    const contentText = content.replace(/^#+\s+/, '').trim() // Remove title
    const firstParagraph = contentText.split('\n\n')[0]
    summary = firstParagraph.length > 200 ? 
      firstParagraph.substring(0, 200).trim() + '...' : 
      firstParagraph
  }
  
  // Limit summary length
  if (summary.length > 300) {
    summary = summary.substring(0, 300).trim() + '...'
  }
  
  return summary
}

// Determine story category based on content and source
function determineStoryCategory(item: any, sourceConfig: SourceConfig): ParsedItem['story_category'] {
  const title = (item.title || '').toLowerCase()
  const description = (item.description || '').toLowerCase()
  
  // Safely handle categories - could be array, string, or object
  let categories = ''
  if (Array.isArray(item.categories)) {
    // Ensure each element can be stringified safely
    categories = item.categories.map((cat: any) => {
      try {
        if (cat === null || cat === undefined) return ''
        if (typeof cat === 'string') return cat
        if (typeof cat === 'object') {
          // Try common object properties for RSS categories
          return cat._ || cat.text || cat.value || JSON.stringify(cat) || ''
        }
        return String(cat)
      } catch (e) {
        return '' // Skip problematic items
      }
    }).join(' ').toLowerCase()
  } else if (typeof item.categories === 'string') {
    categories = item.categories.toLowerCase()
  } else if (item.categories && typeof item.categories === 'object') {
    // If it's an object, try to extract meaningful text
    try {
      categories = String(item.categories._ || item.categories.text || item.categories.value || '').toLowerCase()
    } catch (e) {
      categories = '' // Skip if can't convert
    }
  }
  
  const content = `${title} ${description} ${categories}`
  
  // Research indicators
  if (content.includes('research') || content.includes('paper') || content.includes('study') ||
      content.includes('arxiv') || content.includes('journal') || sourceConfig.name.includes('research')) {
    return 'research'
  }
  
  // Tools/framework indicators
  if (content.includes('release') || content.includes('update') || content.includes('version') ||
      content.includes('tool') || content.includes('framework') || content.includes('library') ||
      content.includes('package') || sourceConfig.name.includes('pypi')) {
    return 'tools'
  }
  
  // Tutorial/guide indicators
  if (content.includes('tutorial') || content.includes('guide') || content.includes('how to') ||
      content.includes('getting started') || content.includes('introduction to')) {
    return 'tutorial'
  }
  
  // Analysis indicators
  if (content.includes('analysis') || content.includes('trend') || content.includes('insights') ||
      content.includes('review') || content.includes('opinion') || content.includes('perspective')) {
    return 'analysis'
  }
  
  // Announcement indicators
  if (content.includes('announce') || content.includes('launch') || content.includes('introduces') ||
      content.includes('unveil') || content.includes('reveals')) {
    return 'announcement'
  }
  
  // Default to news for most content
  return 'news'
}

// Get source-specific fallback image
function getSourceFallbackImage(sourceName: string): string {
  const fallbackImages = {
    // Academic/Research Sources
    'arXiv AI/ML Papers': '/lib/images/arxiv_logo.jpg',
    'Google Research Blog': '/lib/images/google_research_logo.jpg',
    'HuggingFace Papers': '/lib/images/hugging_face_logo.avif',
    'MIT Technology Review': '/lib/images/mit_tech_review.png',
    'MIT Sloan Management Review': '/lib/images/mit_sloan_review.png',
    
    // Corporate/Tech Blogs
    'AWS Big Data Blog': '/lib/images/aws_logo.png',
    'OpenAI Official Blog': '/lib/images/OpenAI_Logo.svg',
    'Microsoft Excel & Power BI Blog': '/lib/images/microsoft_logo.jpg',
    'PyPI Top Packages': '/lib/images/pypi_logo.jpg',
    
    // News/Media Sources  
    'TechCrunch': '/lib/images/techcrunch.png',
    'VentureBeat': '/lib/images/venturebeat.png',
    'Ars Technica': '/lib/images/arstechnica_logo.svg',
    'TLDR.tech': '/lib/images/tldr-logo-jpg.jpg'
  }
  
  return fallbackImages[sourceName as keyof typeof fallbackImages] || 
         'https://via.placeholder.com/400x200/1f2937/ffffff?text=DataGate'
}

export async function genericRssAdapter(sourceConfig: SourceConfig): Promise<ParsedItem[]> {

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

        // Extract enhanced metadata fields
        const author = extractAuthor(item)
        const image_url = extractImageUrl(item, sourceConfig)
        const summary = extractSummary(item, body)
        const story_category = determineStoryCategory(item, sourceConfig)

        // Tags will be added by the content tagger later
        const tags: string[] = []

        // **ENHANCED**: Capture complete original RSS item metadata
        const originalMetadata = {
          // Core RSS fields
          rss_title: item.title,
          rss_link: item.link,
          rss_description: item.description,
          rss_content_encoded: item['content:encoded'],
          rss_content: item.content,
          rss_pub_date: item.pubDate,
          rss_date: item.date,
          rss_guid: item.guid,
          
          // Author information
          rss_author: item.author,
          rss_creator: item['dc:creator'],
          rss_publisher: item['dc:publisher'],
          
          // Categories and tags
          rss_categories: item.categories,
          rss_tags: item.tags,
          rss_keywords: item.keywords,
          
          // Media and enclosures
          rss_enclosure: item.enclosure,
          rss_media_content: item['media:content'],
          rss_media_thumbnail: item['media:thumbnail'],
          rss_media_description: item['media:description'],
          
          // Extended RSS fields
          rss_summary: item.summary,
          rss_comments: item.comments,
          rss_comment_rss: item.commentRss,
          rss_source: item.source,
          rss_language: item.language,
          
          // Dublin Core metadata
          dc_subject: item['dc:subject'],
          dc_rights: item['dc:rights'],
          dc_language: item['dc:language'],
          dc_type: item['dc:type'],
          dc_format: item['dc:format'],
          dc_identifier: item['dc:identifier'],
          dc_coverage: item['dc:coverage'],
          dc_relation: item['dc:relation'],
          
          // Extracted fields for debugging
          extracted_author: author,
          extracted_image_url: image_url,
          extracted_summary: summary,
          extracted_story_category: story_category,
          
          // Content metadata
          content_word_count: body.split(/\s+/).length,
          content_character_count: body.length,
          processing_timestamp: new Date().toISOString(),
          processing_source: sourceConfig.name,
          processing_endpoint: sourceConfig.endpoint_url,
          
          // RSS feed metadata
          feed_title: feed.title,
          feed_description: feed.description,
          feed_language: feed.language,
          feed_link: feed.link,
          feed_last_build_date: feed.lastBuildDate,
          
          // Raw item for complete preservation
          raw_rss_item: item
        }

        items.push({
          title,
          url: link,
          content: body,
          publishedAt,
          externalId,
          // Enhanced metadata fields
          summary,
          author,
          image_url,
          story_category,
          tags,
          originalMetadata
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


