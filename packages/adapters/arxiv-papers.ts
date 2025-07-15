import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { DateTime } from 'luxon'

// arXiv API configuration
const ARXIV_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'arXiv AI/ML Papers',
  type: 'api', 
  endpoint_url: 'http://export.arxiv.org/api/query',
  fetch_freq_min: 1440 // Daily for academic papers
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[arXiv API] Starting raw metadata extraction of AI/ML papers')
  
  try {
    // Build arXiv API query for AI/ML categories
    const query = '(cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:stat.ML)'
    const params = new URLSearchParams({
      search_query: query,
      start: '0',
      max_results: '200',
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    })
    
    const url = `${ARXIV_CONFIG.endpoint_url}?${params}`
    console.log(`[arXiv API] Fetching ${url}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const xmlText = await response.text()
    console.log(`[arXiv API] Found ${xmlText.length} characters of XML data`)
    
    // Parse XML manually (since it's Atom format)
    const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || []
    console.log(`[arXiv API] Found ${entries.length} papers`)
    
    const items: ParsedItem[] = []
    
    for (const entryXml of entries) {
      try {
        // Extract basic fields using regex (raw approach for metadata preservation)
        const title = entryXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || 'Untitled'
        const id = entryXml.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || ''
        const summary = entryXml.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || ''
        const published = entryXml.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() || ''
        const updated = entryXml.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]?.trim() || ''
        
        // Extract authors
        const authorMatches = entryXml.match(/<author>[\s\S]*?<\/author>/g) || []
        const authors = authorMatches.map(author => {
          const name = author.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim() || ''
          const affiliation = author.match(/<arxiv:affiliation>([\s\S]*?)<\/arxiv:affiliation>/)?.[1]?.trim()
          return { name, affiliation }
        })
        
        // Extract categories
        const categoryMatches = entryXml.match(/<category term="([^"]*)"[^>]*>/g) || []
        const categories = categoryMatches.map(cat => cat.match(/term="([^"]*)"/)?.[1] || '').filter(Boolean)
        
        // Extract links
        const linkMatches = entryXml.match(/<link[^>]*>/g) || []
        const links = linkMatches.map(link => {
          const href = link.match(/href="([^"]*)"/)?.[1] || ''
          const type = link.match(/type="([^"]*)"/)?.[1] || ''
          const rel = link.match(/rel="([^"]*)"/)?.[1] || ''
          const title = link.match(/title="([^"]*)"/)?.[1] || ''
          return { href, type, rel, title }
        })
        
        // Extract arXiv-specific fields
        const arxivId = entryXml.match(/<arxiv:primary_category term="([^"]*)"[^>]*>/)?.[1] || ''
        const comment = entryXml.match(/<arxiv:comment>([\s\S]*?)<\/arxiv:comment>/)?.[1]?.trim()
        const journal = entryXml.match(/<arxiv:journal_ref>([\s\S]*?)<\/arxiv:journal_ref>/)?.[1]?.trim()
        const doi = entryXml.match(/<arxiv:doi>([\s\S]*?)<\/arxiv:doi>/)?.[1]?.trim()
        
        if (!id) {
          console.warn('[arXiv API] Skipping entry without ID')
          continue
        }
        
        // Parse publication date
        let publishedAt: Date
        try {
          publishedAt = published ? DateTime.fromISO(published).toJSDate() : new Date()
        } catch {
          publishedAt = new Date()
        }
        
        // Generate external ID from arXiv ID
        const arxivIdMatch = id.match(/arxiv\.org\/abs\/(.+)$/)
        const externalId = arxivIdMatch ? `arxiv-${arxivIdMatch[1]}` : `arxiv-${Date.now()}-${Math.random()}`
        
        // Create paper URL
        const paperUrl = id.startsWith('http') ? id : `https://arxiv.org/abs/${arxivIdMatch?.[1] || ''}`
        
        // Store ALL raw arXiv metadata
        const originalMetadata = {
          // Raw XML entry
          raw_xml_entry: entryXml,
          
          // Parsed fields
          arxiv_id: id,
          arxiv_paper_id: arxivIdMatch?.[1],
          arxiv_title: title,
          arxiv_summary: summary,
          arxiv_published: published,
          arxiv_updated: updated,
          arxiv_primary_category: arxivId,
          arxiv_comment: comment,
          arxiv_journal_ref: journal,
          arxiv_doi: doi,
          
          // Authors with affiliations
          arxiv_authors: authors,
          arxiv_author_names: authors.map(a => a.name),
          arxiv_author_affiliations: authors.map(a => a.affiliation).filter(Boolean),
          
          // Categories and subjects
          arxiv_categories: categories,
          arxiv_subjects: categories,
          
          // Links
          arxiv_links: links,
          arxiv_pdf_link: links.find(l => l.title === 'pdf')?.href,
          arxiv_abs_link: links.find(l => l.rel === 'alternate')?.href,
          
          // Extraction metadata
          extraction_timestamp: new Date().toISOString(),
          source_name: ARXIV_CONFIG.name,
          source_type: ARXIV_CONFIG.type,
          source_endpoint: url,
          adapter_version: 'raw-metadata-v1',
          
          // Academic context
          platform: 'arxiv',
          content_type: 'academic_paper',
          publication_type: 'preprint',
          academic_source: true,
          research_categories: categories,
          paper_type: 'research_paper'
        }
        
        items.push({
          title: title.replace(/\n/g, ' ').trim(),
          url: paperUrl,
          content: summary, // Raw abstract as content
          publishedAt,
          summary: undefined, // No summary generation
          author: undefined, // No field extraction  
          image_url: undefined, // No image processing
          story_category: undefined, // No categorization
          tags: [], // No tag generation
          externalId,
          originalMetadata
        })
        
        console.log(`[arXiv API] Parsed: "${title.substring(0, 60)}..." (${categories.join(', ')})`)
        
      } catch (entryError) {
        console.warn('[arXiv API] Error processing entry:', entryError)
        continue
      }
    }
    
    // Sort by publication date (newest first)
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[arXiv API] Successfully extracted ${items.length} raw papers`)
    
    return items
    
  } catch (error) {
    console.error('[arXiv API] Error extracting raw metadata:', error)
    throw error
  }
}

// Export config for registration in database
export { ARXIV_CONFIG } 