import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { DateTime } from 'luxon'
import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

// HuggingFace Papers scraper configuration
const HUGGINGFACE_PAPERS_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'HuggingFace Papers',
  type: 'web_scrape',
  endpoint_url: 'https://huggingface.co/papers',
  fetch_freq_min: 30 // Papers update frequently - check every 30 minutes
}

// Rate limiting delay (1 second)
const RATE_LIMIT_DELAY = 1000

async function fetchWithRateLimit(url: string): Promise<string> {
  try {
    console.log(`[HuggingFace Papers] Fetching ${url}`)
    
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
    console.error(`[HuggingFace Papers] Failed to fetch ${url}:`, errorMessage)
    throw new Error(`Failed to fetch HuggingFace Papers: ${errorMessage}`)
  }
}

function extractPaperInfo($: any, element: any): { title: string; authors: string; submitter: string; stats: string } {
  const paperElement = $(element)
  
  // Extract title
  const titleElement = paperElement.find('h3, h4, .text-lg, .font-semibold')
  let title = titleElement.text().trim()
  
  // If title is not found, try alternative selectors
  if (!title) {
    title = paperElement.find('a[href*="/papers/"]').text().trim()
  }
  
  // Extract authors count (look for "· X authors" pattern)
  const authorsElement = paperElement.find('.text-gray-500, .text-sm')
  let authors = ''
  authorsElement.each((_: number, el: any) => {
    const text = $(el).text().trim()
    if (text.includes('author')) {
      authors = text
      return false // break
    }
  })
  
  // Extract submitter info
  const submitterElement = paperElement.find('.text-xs, .text-gray-400')
  let submitter = 'Unknown'
  submitterElement.each((_: number, el: any) => {
    const text = $(el).text().trim()
    if (text.includes('Submitted by')) {
      submitter = text.replace('Submitted by ', '')
      return false // break
    }
  })
  
  // Extract stats (likes, views, etc.)
  const statsElements = paperElement.find('.text-gray-500, .text-xs')
  let stats = ''
  statsElements.each((_: number, el: any) => {
    const text = $(el).text().trim()
    if (text.match(/^\d+/) && (text.includes('❤️') || text.includes('👁️') || text.includes('💬'))) {
      stats += text + ' '
    }
  })
  
  return { title, authors, submitter, stats: stats.trim() }
}

function createPaperUrl(title: string, baseUrl: string): string {
  // Try to construct the paper URL
  // HuggingFace papers typically have URLs like /papers/2024.07.10/paper-slug
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '.')
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
  
  return `${baseUrl}/${dateStr}/${slug}`
}

function extractTags(title: string, authors: string): string[] {
  const tags = ['huggingface'] // Default tags
  
  // Add tags based on title content
  const titleLower = title.toLowerCase()
  const authorsLower = authors.toLowerCase()
  
  // Common ML/AI research areas
  const tagMappings = [
    { keywords: ['llm', 'language model', 'large language'], tags: ['large language models', 'llm'] },
    { keywords: ['vision', 'image', 'visual', 'computer vision'], tags: ['computer vision', 'vision'] },
    { keywords: ['multimodal', 'multi-modal'], tags: ['multimodal'] },
    { keywords: ['reinforcement', 'rl'], tags: ['reinforcement learning'] },
    { keywords: ['generation', 'generative'], tags: ['generative ai'] },
    { keywords: ['diffusion', 'stable diffusion'], tags: ['diffusion models'] },
    { keywords: ['reasoning', 'chain of thought'], tags: ['reasoning'] },
    { keywords: ['transformer', 'attention'], tags: ['transformers'] },
    { keywords: ['fine-tuning', 'finetuning'], tags: ['fine-tuning'] },
    { keywords: ['nlp', 'natural language'], tags: ['nlp'] },
    { keywords: ['robotics', 'robot'], tags: ['robotics'] },
    { keywords: ['autonomous', 'self-driving'], tags: ['autonomous systems'] },
    { keywords: ['deep learning', 'neural network'], tags: ['deep learning'] },
    { keywords: ['optimization', 'training'], tags: ['optimization'] }
  ]
  
  tagMappings.forEach(mapping => {
    if (mapping.keywords.some(keyword => titleLower.includes(keyword) || authorsLower.includes(keyword))) {
      tags.push(...mapping.tags)
    }
  })
  
  // Remove duplicates and limit to 6 tags
  return [...new Set(tags)].slice(0, 6)
}

function createPaperContent(title: string, authors: string, submitter: string, stats: string, url: string): string {
  const lines = [
    `# ${title}`,
    '',
    `**Authors:** ${authors || 'Multiple authors'}`,
    `**Submitted by:** ${submitter}`,
    ...(stats ? [`**Engagement:** ${stats}`] : []),
    '',
    `This research paper is currently trending on HuggingFace Papers, indicating high interest from the AI research community.`,
    '',
    `**Source:** HuggingFace Papers - Daily trending research`,
    `**Category:** AI/ML Research`,
    '',
    `[View Paper](${url})`,
    '',
    `---`,
    `*This paper was selected as trending research on HuggingFace Papers, representing cutting-edge developments in artificial intelligence and machine learning.*`
  ]
  
  return lines.join('\n')
}

function createExternalId(title: string, submitter: string): string {
  // Create a stable external ID from title and submitter
  const baseId = `${title}-${submitter}`
  return createHash('sha256').update(baseId).digest('hex').slice(0, 16)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[HuggingFace Papers] Starting scrape of HuggingFace Papers')
  
  try {
    // Fetch the papers homepage
    const html = await fetchWithRateLimit(HUGGINGFACE_PAPERS_CONFIG.endpoint_url)
    
    // Parse with Cheerio
    const $ = cheerio.load(html)
    const items: ParsedItem[] = []
    const seenIds = new Set<string>()
    
    // Find all paper items - look for various possible selectors
    const paperSelectors = [
      'article',
      '.paper-item',
      '.relative.rounded-lg',
      '[class*="paper"]',
      '.border.rounded',
      '.mb-4',
      '.flex.flex-col'
    ]
    
    let papers: any = $('')
    for (const selector of paperSelectors) {
      papers = $(selector)
      if (papers.length > 0) {
        console.log(`[HuggingFace Papers] Found ${papers.length} papers using selector: ${selector}`)
        break
      }
    }
    
    // If no specific paper containers found, look for any links to papers
    if (papers.length === 0) {
      console.log('[HuggingFace Papers] No paper containers found, looking for paper links')
      papers = $('a[href*="/papers/"]').parent()
    }
    
    if (papers.length === 0) {
      console.warn('[HuggingFace Papers] No papers found. Page structure may have changed.')
      return []
    }
    
    console.log(`[HuggingFace Papers] Processing ${papers.length} papers`)
    
    papers.each((index: number, element: any) => {
      try {
        const paperInfo = extractPaperInfo($, element)
        
        if (!paperInfo.title) {
          console.warn(`[HuggingFace Papers] Paper ${index + 1}: No title found`)
          return // Skip this paper
        }
        
        // Create URL (approximate - may need adjustment)
        const url = createPaperUrl(paperInfo.title, HUGGINGFACE_PAPERS_CONFIG.endpoint_url)
        
        // Extract tags
        const tags = extractTags(paperInfo.title, paperInfo.authors)
        
        // Create content
        const content = createPaperContent(
          paperInfo.title,
          paperInfo.authors,
          paperInfo.submitter,
          paperInfo.stats,
          url
        )
        
        // Generate external ID
        const externalId = createExternalId(paperInfo.title, paperInfo.submitter)
        
        // Skip duplicates
        if (seenIds.has(externalId)) {
          console.log(`[HuggingFace Papers] Skipping duplicate: "${paperInfo.title}"`)
          return
        }
        seenIds.add(externalId)
        
        // Use today's date for published_at since papers are daily
        const publishedAt = new Date()
        
        const item: ParsedItem = {
          title: paperInfo.title,
          url,
          content,
          publishedAt,
          summary: paperInfo.authors ? 
            `${paperInfo.title} by ${paperInfo.authors}` : 
            paperInfo.title,
          author: paperInfo.submitter !== 'Unknown' ? paperInfo.submitter : undefined,
          image_url: '/lib/images/hugging_face_logo.avif', // HuggingFace logo fallback
          story_category: 'research',
          tags,
          externalId,
          originalMetadata: {
            // HuggingFace paper metadata
            hf_title: paperInfo.title,
            hf_authors: paperInfo.authors,
            hf_submitter: paperInfo.submitter,
            hf_stats: paperInfo.stats,
            hf_generated_url: url,
            
            // Processing metadata
            content_word_count: content.split(/\s+/).length,
            content_character_count: content.length,
            processing_timestamp: new Date().toISOString(),
            processing_source: 'HuggingFace Papers Scraper',
            processing_endpoint: HUGGINGFACE_PAPERS_CONFIG.endpoint_url,
            
            // Content type
            source_name: 'HuggingFace Papers',
            content_type: 'research_paper',
            publication_type: 'community_paper',
            academic_source: true,
            
            // Raw paper info for complete preservation
            raw_paper_info: paperInfo
          }
        }
        
        items.push(item)
        
        console.log(`[HuggingFace Papers] Parsed: "${paperInfo.title}" by ${paperInfo.submitter}`)
        
      } catch (itemError) {
        console.warn(`[HuggingFace Papers] Failed to parse paper ${index + 1}:`, itemError)
        // Continue with other papers
      }
    })
    
    // Sort by title (since all are from today)
    items.sort((a, b) => a.title.localeCompare(b.title))
    
    console.log(`[HuggingFace Papers] Successfully scraped ${items.length} unique papers`)
    
    return items
    
  } catch (error) {
    console.error('[HuggingFace Papers] Fatal error during scraping:', error)
    throw error
  }
}

// Export config for registration in database
export { HUGGINGFACE_PAPERS_CONFIG } 