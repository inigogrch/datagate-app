import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { fetchAndParseGenericRss } from '../../lib/adapters/generic-rss'

// AWS Big Data Blog specific configuration
const AWS_BIG_DATA_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'AWS Big Data Blog',
  type: 'rss',
  endpoint_url: 'https://aws.amazon.com/blogs/big-data/feed/',
  fetch_freq_min: 60
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[AWS Big Data Blog] Starting raw metadata extraction from AWS RSS feed')
  
  try {
    // Use generic RSS adapter to extract all raw metadata
    const items = await fetchAndParseGenericRss(AWS_BIG_DATA_CONFIG)
    
    // Add AWS-specific metadata to originalMetadata
    const enhancedItems = items.map(item => ({
      ...item,
      originalMetadata: {
        ...item.originalMetadata,
        // AWS-specific context
        platform: 'aws',
        publication_type: 'technical_blog',
        content_focus: 'big_data_analytics_cloud',
        geographic_focus: 'global_cloud_services',
        publication_frequency: 'regular',
        article_format: 'technical_tutorials_announcements'
      }
    }))
    
    console.log(`[AWS Big Data Blog] Successfully extracted ${enhancedItems.length} raw articles`)
    return enhancedItems
    
  } catch (error) {
    console.error('[AWS Big Data Blog] Error extracting raw metadata:', error)
    throw error
  }
}

// Export config for registration in database
export { AWS_BIG_DATA_CONFIG }
