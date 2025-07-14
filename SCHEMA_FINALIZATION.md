# DataGate Production Schema Finalization

## Overview

This document describes the finalized production schema for DataGate Wave 1, designed to support rich story cards with comprehensive metadata extraction from all adapter sources.

## Database Schema

### Stories Table

The `stories` table is the primary content storage with full metadata support:

```sql
CREATE TABLE stories (
    -- Primary key and identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL, -- From RSS GUID, API ID, etc.
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    
    -- Core content fields
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT, -- Short excerpt/description for cards
    author TEXT, -- Extracted author name
    image_url TEXT, -- Featured image for story cards
    
    -- Temporal data
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Categorization and tagging
    story_category TEXT CHECK (story_category IN ('research', 'news', 'tools', 'analysis', 'tutorial', 'announcement')),
    tags TEXT[] DEFAULT '{}', -- Array of content tags
    
    -- Vector embeddings for semantic search
    embedding vector(1536), -- OpenAI text-embedding-3-small
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    embedding_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Rich metadata storage
    original_metadata JSONB DEFAULT '{}'::JSONB, -- Complete source data
    tagging_metadata JSONB DEFAULT '{}'::JSONB, -- Tagging provenance and confidence
    
    -- Constraints
    CONSTRAINT stories_external_id_source_unique UNIQUE (external_id, source_id),
    CONSTRAINT stories_url_unique UNIQUE (url)
);
```

### Sources Table

```sql
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('rss', 'atom', 'api', 'web_scrape')),
    endpoint_url TEXT NOT NULL,
    fetch_freq_min INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Features

1. **Rich Story Cards**: Every story has `title`, `summary`, `author`, `image_url`, `published_at`, `tags`, and `story_category`
2. **Semantic Search**: Vector embeddings with optimized similarity search
3. **Flexible Metadata**: Complete source data preservation in `original_metadata`
4. **Content-based Tagging**: Enhanced tags with confidence scoring in `tagging_metadata`
5. **Performance Optimized**: Comprehensive indexing for all access patterns

## Enhanced Metadata Extraction

### Adapter Interface

All adapters now extract enhanced metadata fields:

```typescript
export interface ParsedItem {
  // Core content fields
  title: string
  url: string
  content: string
  publishedAt: Date
  externalId: string
  
  // Enhanced metadata fields for rich story cards
  summary?: string // Short excerpt for display
  author?: string // Author name from RSS/content
  image_url?: string // Featured image URL
  story_category?: 'research' | 'news' | 'tools' | 'analysis' | 'tutorial' | 'announcement'
  
  // Content-based tagging
  tags: string[]
  
  // Processing metadata
  originalMetadata?: Record<string, any>
  taggingMetadata?: TaggingMetadata
}
```

### Field Extraction Logic

#### Author Extraction
- RSS: `author`, `dc:creator`, `dc:publisher`
- Email cleanup: removes `(email)` and `<email>` patterns
- Fallback to empty if not found

#### Image URL Extraction
- RSS: `media:content`, `media:thumbnail`, `enclosure` (image types)
- HTML: First `<img src="">` in description/content
- iTunes: `itunes:image`

#### Summary Extraction
- RSS: `description`, `summary`, `dc:description` (cleaned of HTML)
- Fallback: First paragraph of content (max 300 chars)
- Auto-truncation with ellipsis

#### Story Category Determination
- **Research**: Keywords like "research", "paper", "study", "arxiv", "journal"
- **Tools**: Keywords like "release", "update", "version", "framework", "library"
- **Tutorial**: Keywords like "tutorial", "guide", "how to", "getting started"
- **Analysis**: Keywords like "analysis", "trend", "insights", "review"
- **Announcement**: Keywords like "announce", "launch", "introduces", "unveil"
- **News**: Default category for general content

## Usage Examples

### Enhanced Ingestion

```bash
# Run enhanced ingestion for specific adapter
npx tsx scripts/ingestion/ingest-with-enhanced-metadata.ts techcrunch

# Validate all adapters with enhanced field checking
npx tsx scripts/test/validate-all-adapters.ts
```

### Database Queries

#### Rich Story Cards Query
```sql
SELECT 
  s.id,
  s.title,
  s.summary,
  s.author,
  s.image_url,
  s.published_at,
  s.story_category,
  s.tags,
  src.name AS source_name
FROM stories s
LEFT JOIN sources src ON s.source_id = src.id
ORDER BY s.published_at DESC
LIMIT 20;
```

#### Semantic Search
```sql
SELECT * FROM search_stories_by_similarity(
  '[0.1, 0.2, ...]'::vector, -- query embedding
  0.7, -- similarity threshold
  10,  -- result count
  'research', -- category filter (optional)
  null -- source filter (optional)
);
```

#### Metadata Coverage Analysis
```sql
SELECT 
  src.name AS source_name,
  COUNT(*) AS total_stories,
  COUNT(s.summary) AS with_summary,
  COUNT(s.author) AS with_author,
  COUNT(s.image_url) AS with_image,
  COUNT(s.story_category) AS with_category,
  ROUND(100.0 * COUNT(s.summary) / COUNT(*), 1) AS summary_pct,
  ROUND(100.0 * COUNT(s.author) / COUNT(*), 1) AS author_pct,
  ROUND(100.0 * COUNT(s.image_url) / COUNT(*), 1) AS image_pct
FROM stories s
LEFT JOIN sources src ON s.source_id = src.id
WHERE s.published_at > NOW() - INTERVAL '7 days'
GROUP BY src.name
ORDER BY total_stories DESC;
```

## Performance Characteristics

### Indexes
- **Primary Access**: `published_at DESC`, `source_id`, `story_category`
- **Search**: GIN indexes on `tags`, `original_metadata`, `tagging_metadata`
- **Text Search**: Full-text search on `title` and `content`
- **Vector Search**: IVFFlat index for embedding similarity
- **Compound**: `(source_id, published_at)`, `(story_category, published_at)`

### Views
- **`story_analytics`**: Complete analytics data with aggregated feedback
- **`story_cards`**: Optimized for UI display with relevance scoring
- **`stories_missing_embeddings`**: Monitor embedding coverage
- **`stories_missing_metadata`**: Track metadata extraction gaps

## Migration Path

1. **Apply Schema**: Run migration `008_finalize_production_schema.sql`
2. **Update Adapters**: Enhanced adapters extract all metadata fields
3. **Enhanced Ingestion**: Use new ingestion script with metadata validation
4. **Monitoring**: Use analytics views to track coverage and quality

## Validation and Quality

### Adapter Validation
Enhanced validation checks:
- Core fields: `title`, `url`, `content`, `publishedAt`, `externalId`
- Metadata fields: `summary`, `author`, `image_url`, `story_category`
- Data quality: URL validity, date parsing, category constraints
- Coverage reporting: Percentage of items with each metadata field

### Expected Coverage by Source Type
- **RSS Feeds**: 80%+ summary, 60%+ author, 40%+ images
- **API Sources**: 90%+ summary, 70%+ author, varies on images
- **Scraped Sources**: 60%+ summary, 50%+ author, 30%+ images

## Production Readiness Checklist

- [x] Finalized schema with all required fields
- [x] Enhanced adapters extracting rich metadata
- [x] Comprehensive indexing for performance
- [x] Validation scripts with metadata checking
- [x] Enhanced ingestion pipeline
- [x] Analytics views for monitoring
- [x] Proper constraints and data integrity
- [x] Vector search capabilities
- [x] Complete metadata preservation

The schema is now production-ready for rich story card UIs with comprehensive metadata support across all Wave 1 adapters. 