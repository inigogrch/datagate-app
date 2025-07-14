import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { genericRssAdapter } from '../../lib/adapters/generic-rss'

// AWS Big Data Blog specific configuration
const AWS_BIG_DATA_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'AWS Big Data Blog',
  type: 'rss',
  endpoint_url: 'https://aws.amazon.com/blogs/big-data/feed/',
  fetch_freq_min: 60
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  // Create a mock source config for the adapter
  const sourceConfig: SourceConfig = {
    id: 'aws-big-data', // This will be replaced with actual DB ID
    ...AWS_BIG_DATA_CONFIG
  }

  return await genericRssAdapter(sourceConfig)
}

// Export config for registration in database
export { AWS_BIG_DATA_CONFIG }
