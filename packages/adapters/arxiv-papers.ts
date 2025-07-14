import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { DateTime } from 'luxon'
import * as cheerio from 'cheerio'
import { createHash } from 'crypto'

// arXiv API adapter configuration
const ARXIV_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'arXiv AI/ML Papers',
  type: 'api',
  endpoint_url: 'http://export.arxiv.org/api/query',
  fetch_freq_min: 1440 // 24 hours - daily updates
}

// AI/ML categories to monitor
const AI_ML_CATEGORIES = [
  'cs.AI',    // Artificial Intelligence
  'cs.LG',    // Machine Learning  
  'cs.CL',    // Computation and Language (NLP)
  'stat.ML'   // Machine Learning (Statistics)
]

// Rate limiting delay
const RATE_LIMIT_DELAY = 1000

interface ArXivEntry {
  id: string
  title: string
  summary: string
  authors: string[]
  published: string
  updated: string
  categories: string[]
  link: string
  pdfLink?: string
  comment?: string
  journalRef?: string
}

async function fetchWithRateLimit(url: string): Promise<string> {
  try {
    console.log(`[arXiv API] Fetching ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DataGate/1.0 (Research aggregator)',
        'Accept': 'application/atom+xml,application/xml,text/xml',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const xml = await response.text()
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY))
    
    return xml
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[arXiv API] Failed to fetch ${url}:`, errorMessage)
    throw new Error(`Failed to fetch arXiv papers: ${errorMessage}`)
  }
}

function buildSearchQuery(): string {
  // Build search query for AI/ML categories
  const categoryQuery = AI_ML_CATEGORIES.map(cat => `cat:${cat}`).join(' OR ')
  
  // For now, just search by categories without date constraint
  return `(${categoryQuery})`
}

function parseArXivAtom(xml: string): ArXivEntry[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const entries: ArXivEntry[] = []
  
  $('entry').each((_, element) => {
    try {
      const $entry = $(element)
      
      // Extract basic info
      const id = $entry.find('id').text().trim()
      const title = $entry.find('title').text().trim().replace(/\s+/g, ' ')
      const summary = $entry.find('summary').text().trim().replace(/\s+/g, ' ')
      const published = $entry.find('published').text().trim()
      const updated = $entry.find('updated').text().trim()
      
      // Extract authors
      const authors: string[] = []
      $entry.find('author name').each((_, authorEl) => {
        const authorName = $(authorEl).text().trim()
        if (authorName) authors.push(authorName)
      })
      
      // Extract categories
      const categories: string[] = []
      $entry.find('category').each((_, catEl) => {
        const term = $(catEl).attr('term')
        if (term) categories.push(term)
      })
      
      // Extract links
      let link = ''
      let pdfLink = ''
      
      $entry.find('link').each((_, linkEl) => {
        const $link = $(linkEl)
        const rel = $link.attr('rel')
        const type = $link.attr('type')
        const href = $link.attr('href')
        
        if (href) {
          if (rel === 'alternate' && type === 'text/html') {
            link = href
          } else if (type === 'application/pdf') {
            pdfLink = href
          }
        }
      })
      
      // Extract optional fields
      const comment = $entry.find('arxiv\\:comment, comment').text().trim()
      const journalRef = $entry.find('arxiv\\:journal_ref, journal_ref').text().trim()
      
      if (id && title && summary) {
        entries.push({
          id,
          title,
          summary,
          authors,
          published,
          updated,
          categories,
          link,
          pdfLink,
          comment: comment || undefined,
          journalRef: journalRef || undefined
        })
      }
    } catch (entryError) {
      console.warn('[arXiv API] Failed to parse entry:', entryError)
    }
  })
  
  return entries
}

function extractTags(entry: ArXivEntry): string[] {
  const tags = ['arxiv'] // Default tags
  
  // Add category-based tags
  const categoryMappings = [
    { categories: ['cs.AI'], tags: ['artificial intelligence', 'ai'] },
    { categories: ['cs.LG'], tags: ['machine learning', 'ml'] },
    { categories: ['cs.CL'], tags: ['nlp', 'natural language processing', 'computational linguistics'] },
    { categories: ['stat.ML'], tags: ['statistical learning', 'statistics'] },
    { categories: ['cs.CV'], tags: ['computer vision'] },
    { categories: ['cs.NE'], tags: ['neural networks'] },
    { categories: ['cs.RO'], tags: ['robotics'] }
  ]
  
  categoryMappings.forEach(mapping => {
    if (mapping.categories.some(cat => entry.categories.includes(cat))) {
      tags.push(...mapping.tags)
    }
  })
  
  // Add tags based on title/summary content
  const content = `${entry.title} ${entry.summary}`.toLowerCase()
  
  const contentMappings = [
    { keywords: ['transformer', 'attention'], tags: ['transformers'] },
    { keywords: ['llm', 'large language model'], tags: ['large language models'] },
    { keywords: ['deep learning', 'neural network'], tags: ['deep learning'] },
    { keywords: ['reinforcement learning'], tags: ['reinforcement learning'] },
    { keywords: ['generative', 'generation'], tags: ['generative ai'] },
    { keywords: ['diffusion', 'stable diffusion'], tags: ['diffusion models'] },
    { keywords: ['multimodal'], tags: ['multimodal'] },
    { keywords: ['reasoning'], tags: ['reasoning'] },
    { keywords: ['optimization'], tags: ['optimization'] }
  ]
  
  contentMappings.forEach(mapping => {
    if (mapping.keywords.some(keyword => content.includes(keyword))) {
      tags.push(...mapping.tags)
    }
  })
  
  // Remove duplicates and limit to 6 tags
  return [...new Set(tags)].slice(0, 6)
}

function createPaperContent(entry: ArXivEntry): string {
  const lines = [
    `# ${entry.title}`,
    '',
    `**Authors:** ${entry.authors.join(', ')}`,
    `**Categories:** ${entry.categories.join(', ')}`,
    `**Published:** ${DateTime.fromISO(entry.published).toFormat('MMMM d, yyyy')}`,
    ...(entry.updated !== entry.published ? [`**Updated:** ${DateTime.fromISO(entry.updated).toFormat('MMMM d, yyyy')}`] : []),
    '',
    '**Abstract:**',
    entry.summary,
    '',
    ...(entry.comment ? [`**Comments:** ${entry.comment}`, ''] : []),
    ...(entry.journalRef ? [`**Journal Reference:** ${entry.journalRef}`, ''] : []),
    `**arXiv ID:** ${entry.id.split('/').pop()?.split('v')[0] || 'Unknown'}`,
    '',
    '**Links:**',
    `- [arXiv Page](${entry.link})`,
    ...(entry.pdfLink ? [`- [PDF](${entry.pdfLink})`] : []),
    '',
    '---',
    '*This paper was published on arXiv, a preprint repository for scientific papers in physics, mathematics, computer science, and related fields.*'
  ]
  
  return lines.join('\n')
}

function createExternalId(entry: ArXivEntry): string {
  // Use arXiv ID as external ID (without version)
  const arxivId = entry.id.split('/').pop()?.split('v')[0]
  return arxivId || createHash('sha256').update(entry.id).digest('hex').slice(0, 16)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[arXiv API] Starting fetch of AI/ML papers')
  
  try {
    // Build search query for AI/ML categories
    const searchQuery = buildSearchQuery()
    const maxResults = 200 // Limit to 200 recent papers
    const sortBy = 'submittedDate'
    const sortOrder = 'descending'
    
    const url = `${ARXIV_CONFIG.endpoint_url}?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`
    
    // Fetch from arXiv API
    const xml = await fetchWithRateLimit(url)
    
    // Parse Atom XML response
    const entries = parseArXivAtom(xml)
    
    if (entries.length === 0) {
      console.warn('[arXiv API] No papers found in response')
      return []
    }
    
    console.log(`[arXiv API] Found ${entries.length} papers`)
    
    const items: ParsedItem[] = []
    const seenIds = new Set<string>()
    
    // Process each entry
    for (const entry of entries) {
      try {
        // Generate external ID
        const externalId = createExternalId(entry)
        
        // Skip duplicates
        if (seenIds.has(externalId)) {
          console.log(`[arXiv API] Skipping duplicate: ${entry.title}`)
          continue
        }
        seenIds.add(externalId)
        
        // Extract tags
        const tags = extractTags(entry)
        
        // Create content
        const content = createPaperContent(entry)
        
        // Parse publication date
        const publishedAt = DateTime.fromISO(entry.published).toJSDate()
        
        const item: ParsedItem = {
          title: entry.title,
          url: entry.link,
          content,
          publishedAt,
          summary: entry.summary.length > 300 ? 
            entry.summary.substring(0, 300).trim() + '...' : 
            entry.summary.trim(),
          author: entry.authors.length > 0 ? entry.authors.join(', ') : undefined,
          image_url: '/lib/images/arxiv_logo.jpg', // arXiv logo fallback
          story_category: 'research',
          tags,
          externalId,
          originalMetadata: {
            // Core arXiv data
            arxiv_id: entry.id,
            arxiv_title: entry.title,
            arxiv_summary: entry.summary,
            arxiv_authors: entry.authors,
            arxiv_published: entry.published,
            arxiv_updated: entry.updated,
            arxiv_categories: entry.categories,
            arxiv_link: entry.link,
            arxiv_pdf_link: entry.pdfLink,
            arxiv_comment: entry.comment,
            arxiv_journal_ref: entry.journalRef,
            
            // Processing metadata
            content_word_count: content.split(/\s+/).length,
            content_character_count: content.length,
            processing_timestamp: new Date().toISOString(),
            processing_source: 'arXiv API',
            source_name: 'arXiv AI/ML Papers',
            content_type: 'research_paper',
            
            // Raw arXiv entry for complete preservation
            raw_arxiv_entry: entry
          }
        }
        
        items.push(item)
        
        console.log(`[arXiv API] Parsed: "${entry.title}" (${entry.categories.join(', ')})`)
        
      } catch (itemError) {
        console.warn(`[arXiv API] Failed to process entry:`, itemError)
      }
    }
    
    // Sort by publication date (newest first)
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[arXiv API] Successfully processed ${items.length} unique papers`)
    
    return items
    
  } catch (error) {
    console.error('[arXiv API] Fatal error during fetch:', error)
    throw error
  }
}

// Export config for registration in database
export { ARXIV_CONFIG } 