import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { genericRssAdapter } from '../../lib/adapters/generic-rss'

// ArsTechnica RSS configuration
const ARSTECHNICA_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'Ars Technica',
  type: 'rss',
  endpoint_url: 'https://feeds.arstechnica.com/arstechnica/index',
  fetch_freq_min: 60 // 1 hour (frequent updates for tech news)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[Ars Technica] Starting fetch from Ars Technica RSS feed')
  
  // Create source config for Ars Technica
  const sourceConfig: SourceConfig = {
    id: 'arstechnica',
    ...ARSTECHNICA_CONFIG
  }
  
  try {
    const items = await genericRssAdapter(sourceConfig)
    console.log(`[Ars Technica] Found ${items.length} items`)
    
    // Add Ars Technica-specific tags and enhance metadata
    const enhancedItems = items.map(item => {
      // Determine content category based on title and content
      const title = item.title.toLowerCase()
      const content = item.content.toLowerCase()
      
      // Categorize content
      const categories = []
      if (title.includes('ai') || content.includes('artificial intelligence') || title.includes('machine learning')) {
        categories.push('artificial-intelligence', 'ai')
      }
      if (title.includes('policy') || title.includes('law') || content.includes('regulation')) {
        categories.push('tech-policy', 'regulation')
      }
      if (title.includes('science') || content.includes('research') || title.includes('study')) {
        categories.push('science', 'research')
      }
      if (title.includes('security') || title.includes('privacy') || content.includes('cybersecurity')) {
        categories.push('cybersecurity', 'privacy')
      }
      if (title.includes('review') || content.includes('hands-on') || title.includes('tested')) {
        categories.push('product-review', 'hardware')
      }
      if (title.includes('gaming') || content.includes('game') || title.includes('console')) {
        categories.push('gaming', 'entertainment')
      }
      if (title.includes('space') || content.includes('nasa') || title.includes('rocket')) {
        categories.push('space', 'aerospace')
      }
      if (title.includes('cars') || title.includes('automotive') || title.includes('electric vehicle')) {
        categories.push('automotive', 'transportation')
      }
      
      return {
        ...item,
        tags: [...new Set([
          ...item.tags,
          'arstechnica',
          'ars-technica',
          'tech-journalism',
          'industry-news',
          'science-tech',
          'tech-analysis',
          'investigative-journalism',
          'technical-depth',
          ...categories
        ])],
                 originalMetadata: {
           ...item.originalMetadata,
           source_name: 'Ars Technica',
           content_type: 'tech_journalism',
           publication: 'ars_technica',
           editorial_quality: 'high',
           technical_depth: 'deep',
           journalistic_standards: 'professional'
         }
      }
    })
    
    // Sort by publish date (newest first)
    enhancedItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[Ars Technica] Successfully processed ${enhancedItems.length} tech journalism articles`)
    return enhancedItems
    
  } catch (error) {
    console.error('[Ars Technica] Error fetching articles:', error)
    throw error
  }
} 