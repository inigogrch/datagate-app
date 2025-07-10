// Canonical DTO for all feed items
export interface ParsedItem {
  title: string
  url: string
  content: string
  publishedAt: Date
  tags: string[]
  externalId?: string // For deduplication
}

// Source configuration from database
export interface SourceConfig {
  id: string
  name: string
  type: 'rss' | 'atom' | 'api'
  endpoint_url: string
  fetch_freq_min: number
  row_category: 'tools_frameworks' | 'research_updates' | 'industry_news'
}

// Base adapter interface
export interface FeedAdapter {
  fetchAndParse(): Promise<ParsedItem[]>
}
