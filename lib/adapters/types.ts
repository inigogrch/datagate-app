// Content-based tagging metadata for experimentation and analysis
export interface TaggingMetadata {
  adapter_name: string
  version: string // Tagging rules version used
  tags_found: number // Total number of tags extracted
  tag_categories_matched: string[] // Which tag categories had matches
  keywords_matched?: string[] // Keywords that triggered classification
  patterns_matched?: string[] // Regex patterns that matched
  confidence_score?: number // Overall confidence in tagging quality
  processing_time_ms?: number // Time taken to process
  processing_notes?: string[] // Additional context for debugging
}

// Enhanced DTO for all feed items with complete metadata extraction
export interface ParsedItem {
  // Core content fields
  title: string
  url: string
  content: string
  publishedAt: Date
  externalId: string // Required for deduplication (RSS: GUID/link hash, API: unique ID)
  
  // Enhanced metadata fields for rich story cards
  summary?: string // Short excerpt for display
  author?: string // Author name from RSS/content
  image_url?: string // Featured image URL
  story_category?: 'research' | 'news' | 'tools' | 'analysis' | 'tutorial' | 'announcement' // High-level categorization
  
  // Content-based tagging
  tags: string[] // Content-extracted tags for personalization
  
  // Processing metadata
  originalMetadata?: Record<string, any> // Preserve original feed data
  taggingMetadata?: TaggingMetadata // Tagging processing details
}

// Source configuration from database
export interface SourceConfig {
  id: string
  name: string
  type: 'rss' | 'atom' | 'api' | 'web_scrape'
  endpoint_url: string
  fetch_freq_min: number
}

// Base adapter interface
export interface FeedAdapter {
  fetchAndParse(): Promise<ParsedItem[]>
}

// Database story record (matches final schema)
export interface Story {
  id: string
  external_id: string
  source_id: string
  title: string
  url: string
  content: string
  summary?: string
  author?: string
  image_url?: string
  published_at: Date
  created_at: Date
  updated_at: Date
  story_category?: string
  tags: string[]
  embedding?: number[]
  embedding_model?: string
  embedding_generated_at?: Date
  original_metadata: Record<string, any>
  tagging_metadata: Record<string, any>
}
