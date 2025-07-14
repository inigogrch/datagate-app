import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { fetchXml } from '../../lib/adapters/utils/fetchXml'
import { parseRss } from '../../lib/adapters/utils/parseRss'
import { DateTime } from 'luxon'
import Turndown from 'turndown'
import { createHash } from 'crypto'

// TechCrunch configuration
const TECHCRUNCH_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'TechCrunch',
  type: 'rss',
  endpoint_url: 'https://techcrunch.com/feed/',
  fetch_freq_min: 30 // 30 minutes (high frequency for breaking tech news)
}

// Extract image URL from RSS item
function extractImageUrl(item: any): string | undefined {
  // Try media namespace first
  if (item['media:content']?.url) return item['media:content'].url
  if (item['media:content']?.[0]?.url) return item['media:content'][0].url
  if (item['media:thumbnail']?.url) return item['media:thumbnail'].url
  if (item['media:thumbnail']?.[0]?.url) return item['media:thumbnail'][0].url
  
  // Try enclosure for images
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url
  }
  
  // Extract from description HTML
  const description = item.description || item['content:encoded'] || ''
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
  if (imgMatch?.[1]) {
    return imgMatch[1]
  }
  
  // TechCrunch logo fallback
  return '/lib/images/techcrunch.png'
}

// Extract summary from RSS fields
function extractSummary(item: any, content: string): string {
  let summary = item.description || item.summary || ''
  
  // Clean HTML and decode entities
  if (summary) {
    summary = summary.replace(/<[^>]*>/g, '').trim()
    summary = cleanHtmlEntities(summary)
  }
  
  // Fallback to content excerpt
  if (!summary || summary.length < 50) {
    const contentText = content.replace(/^#+\s+/, '').trim()
    const firstParagraph = contentText.split('\n\n')[0]
    summary = firstParagraph.length > 250 ? 
      firstParagraph.substring(0, 250).trim() + '...' : 
      firstParagraph
  }
  
  // Limit length
  if (summary.length > 300) {
    summary = summary.substring(0, 300).trim() + '...'
  }
  
  return summary
}

const td = new Turndown({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_'
})

interface TechCrunchItem {
  title: string
  url: string
  content: string
  publishedAt: Date
  author?: string
  image_url?: string
  summary: string
  story_category: 'news'
  categories: string[]
  externalId: string
}

function cleanHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function categoriesToTags(categories: string[]): string[] {
  const tags: string[] = []
  
  for (const category of categories) {
    const cleaned = category.toLowerCase().trim()
    
    // Map TechCrunch categories to our tags
    switch (cleaned) {
      case 'ai':
        tags.push('artificial-intelligence')
        break
      case 'government & policy':
        tags.push('governance', 'policy')
        break
      case 'venture':
        tags.push('venture-capital', 'startup')
        break
      case 'social':
        tags.push('social-media')
        break
      case 'apple':
        tags.push('apple')
        break
      case 'google':
        tags.push('google')
        break
      case 'microsoft':
        tags.push('microsoft')
        break
      case 'meta':
        tags.push('meta')
        break
      case 'startups':
        tags.push('startup')
        break
      case 'transportation':
        tags.push('autonomous-vehicles')
        break
      case 'fintech':
        tags.push('finance', 'fintech')
        break
      case 'security':
        tags.push('security')
        break
      case 'enterprise':
        tags.push('enterprise')
        break
      case 'mobile':
        tags.push('mobile-development')
        break
      case 'apps':
        tags.push('mobile-development')
        break
      case 'funding':
        tags.push('funding', 'venture-capital')
        break
      default:
        // For other categories, create a tag from the category name
        const tagName = cleaned
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, '')
        if (tagName && tagName.length > 1) {
          tags.push(tagName)
        }
    }
  }
  
  return tags
}

async function parseEnhancedTechCrunchFeed(): Promise<TechCrunchItem[]> {
  console.log('[TechCrunch] Fetching and parsing enhanced RSS feed')
  
  try {
    const xml = await fetchXml(TECHCRUNCH_CONFIG.endpoint_url)
    const feed = await parseRss(xml)
    
    const items: TechCrunchItem[] = []
    const seenIds = new Set<string>()
    
    for (const item of feed.items) {
      try {
        // Extract basic fields with proper cleaning
        let title = cleanHtmlEntities(item.title?.trim() || '')
        if (!title) continue
        
        const url = item.link?.trim() || ''
        if (!url) continue
        
        // Parse publish date
        const publishedAtRaw = item.pubDate || item.date || ''
        const publishedAt = DateTime.fromRFC2822(publishedAtRaw).toJSDate()
        if (!publishedAt || Number.isNaN(+publishedAt)) continue
        
        // Extract author
        const author = cleanHtmlEntities(item.author || item['dc:creator'] || '')
        
        // Extract image URL from various sources
        const image_url = extractImageUrl(item)
        
        // Extract categories (TechCrunch provides rich categorization)
        const categories: string[] = []
        if (item.categories && Array.isArray(item.categories)) {
          categories.push(...item.categories.map(cat => 
            typeof cat === 'string' ? cat : (cat as any).name || (cat as any)._ || ''
          ).filter(Boolean))
        }
        
        // Extract and enhance content
        const htmlContent = item['content:encoded'] || item.content || item.description || ''
        let content = td.turndown(htmlContent).slice(0, 50_000)
        content = cleanHtmlEntities(content)
        
        // If content is too short, use description as fallback
        if (content.length < 100 && item.description && item.description.length > content.length) {
          content = cleanHtmlEntities(item.description)
        }
        
        // Ensure we have meaningful content
        if (!content.trim()) {
          content = `${title}\n\nRead the full article at ${url}`
        }
        
        // Extract summary from description or content
        const summary = extractSummary(item, content)
        
        // Create enhanced content with metadata
        const enhancedContent = [
          `# ${title}`,
          '',
          author ? `**Author:** ${author}` : '',
          categories.length > 0 ? `**Categories:** ${categories.join(', ')}` : '',
          `**Published:** ${publishedAt.toISOString().split('T')[0]}`,
          '',
          content,
          '',
          `**Source:** [TechCrunch](${url})`
        ].filter(Boolean).join('\n')
        
        // Generate external ID
        let externalId = ''
        if (item.guid) {
          externalId = typeof item.guid === 'string' ? item.guid : item.guid.value || ''
        }
        if (!externalId) {
          externalId = createHash('sha256').update(url).digest('hex')
        }
        
        // Deduplication
        if (seenIds.has(externalId)) continue
        seenIds.add(externalId)
        
        items.push({
          title,
          url,
          content: enhancedContent,
          publishedAt,
          author,
          image_url,
          summary,
          story_category: 'news',
          categories,
          externalId
        })
        
      } catch (itemErr) {
        console.warn(`[TechCrunch] Skipping item due to error:`, itemErr, item?.title || '[no title]')
        continue
      }
    }
    
    console.log(`[TechCrunch] Successfully parsed ${items.length} enhanced articles`)
    return items
    
  } catch (error) {
    console.error('[TechCrunch] Error parsing enhanced feed:', error)
    throw error
  }
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[TechCrunch] Starting enhanced fetch from TechCrunch')
  
  try {
    const techCrunchItems = await parseEnhancedTechCrunchFeed()
    
    if (techCrunchItems.length === 0) {
      console.log('[TechCrunch] No articles found')
      return []
    }
    
    // Convert to ParsedItem format with enhanced tagging
    const items: ParsedItem[] = techCrunchItems.map(item => {
      // Generate comprehensive tags
      const tags = [
        'techcrunch',
        'tech-news',
        'industry-news',
        'breaking-news',
        ...categoriesToTags(item.categories),
        // Add content-based tags
        ...(item.title.toLowerCase().includes('startup') || item.content.toLowerCase().includes('startup') ? ['startup'] : []),
        ...(item.title.toLowerCase().includes('ai') || item.content.toLowerCase().includes('ai') ? ['artificial-intelligence'] : []),
        ...(item.title.toLowerCase().includes('funding') || item.content.toLowerCase().includes('funding') ? ['funding'] : []),
        ...(item.author ? ['authored'] : [])
      ]
      
      return {
        title: item.title,
        url: item.url,
        content: item.content,
        publishedAt: item.publishedAt,
        summary: item.summary,
        author: item.author,
        image_url: item.image_url,
        story_category: item.story_category,
        tags: [...new Set(tags)], // Remove duplicates
        externalId: item.externalId,
        originalMetadata: {
          source_name: 'TechCrunch',
          content_type: 'news_article',
          author: item.author || undefined,
          image_url: item.image_url || undefined,
          techcrunch_categories: item.categories,
          enhanced_parsing: true,
          word_count: item.content.split(/\s+/).length,
          platform: 'techcrunch'
        }
      }
    })
    
    // Sort by publish date (newest first)
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[TechCrunch] Successfully processed ${items.length} enhanced articles`)
    console.log(`[TechCrunch] Authors found: ${items.filter(i => i.originalMetadata?.author).length}`)
    console.log(`[TechCrunch] Average word count: ${Math.round(items.reduce((acc, i) => acc + (i.originalMetadata?.word_count || 0), 0) / items.length)}`)
    
    return items
    
  } catch (error) {
    console.error('[TechCrunch] Error in enhanced fetch:', error)
    throw error
  }
}

// Export config for registration in database
export { TECHCRUNCH_CONFIG } 