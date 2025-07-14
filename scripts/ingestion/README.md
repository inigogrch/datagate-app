# DataGate Production Ingestion System

## Overview

This directory contains the **production-ready ingestion pipeline** for DataGate. We have evolved from having 9+ separate scripts to a **unified, comprehensive system** that handles all 13 Wave 1 adapters with enhanced metadata extraction, embeddings, and validation.

## 🚀 Quick Start

### Run All Adapters (Recommended)
```bash
# Full production ingestion with all features
npm run ingest:production:all

# Parallel execution (faster, more resource intensive)
npm run ingest:production:parallel

# Fast mode (no embeddings/tagging for quick testing)
npm run ingest:production:fast
```

### Run Single Adapter
```bash
# Run specific adapter
npm run ingest:production techcrunch
npm run ingest:production arxiv-papers
npm run ingest:production aws-big-data

# List all available adapters
npm run ingest:production list
```

## 🏗️ Architecture

### Unified Production Pipeline (`production-ingestion-pipeline.ts`)

The new system provides:

1. **All 13 Adapters**: Unified handling of RSS feeds, APIs, and web scrapers
2. **Enhanced Metadata**: Extracts `summary`, `author`, `image_url`, `story_category` from all sources
3. **Content-based Tagging**: Flexible tagging with confidence scoring
4. **Vector Embeddings**: OpenAI embeddings for semantic search
5. **Validation**: Comprehensive data quality checks
6. **Performance Monitoring**: Detailed metrics and timing
7. **Error Handling**: Graceful failures with detailed reporting
8. **Batch Processing**: Efficient database operations

### Adapter Registry

All production adapters are registered and managed centrally:

```typescript
const ADAPTER_REGISTRY = {
  // RSS-based adapters (use enhanced genericRssAdapter)
  'aws-big-data': AWS Big Data Blog
  'openai-blog': OpenAI Official Blog
  'microsoft-blog': Microsoft Excel & Power BI Blog
  'mit-tech-review': MIT Technology Review
  'mit-sloan': MIT Sloan Management Review
  'venturebeat': VentureBeat
  'arstechnica': Ars Technica
  
  // Custom adapters (updated with enhanced metadata)
  'google-research-scraper': Google Research Blog
  'huggingface-papers': HuggingFace Papers
  'tldr-tech': TLDR.tech
  'arxiv-papers': arXiv AI/ML Papers
  'pypi-packages': PyPI Top Packages
  'techcrunch': TechCrunch
}
```

## 📊 Enhanced Metadata Extraction

Every adapter now extracts rich metadata for **story cards**:

### Core Fields (Required)
- `title`: Story headline
- `url`: Source URL
- `content`: Full content (markdown)
- `publishedAt`: Publication date
- `externalId`: Unique identifier for deduplication
- `tags`: Content-based tags array

### Enhanced Fields (Optional)
- `summary`: Short excerpt (max 300 chars) for story cards
- `author`: Author name from RSS or content
- `image_url`: Featured image URL for visual cards
- `story_category`: High-level category (`research`, `news`, `tools`, `analysis`, `tutorial`, `announcement`)

### Processing Fields
- `embedding`: Vector embedding for semantic search
- `originalMetadata`: Complete source data preservation
- `taggingMetadata`: Tagging confidence and provenance

## 🔧 Configuration Options

The pipeline supports flexible configuration:

```bash
# Disable embeddings (faster)
npm run ingest:production:all -- --no-embeddings

# Disable tagging (faster)
npm run ingest:production:all -- --no-tagging

# Disable validation (faster, risky)
npm run ingest:production:all -- --no-validation

# Fast mode (no embeddings or tagging)
npm run ingest:production:fast
```

## 📈 Expected Metadata Coverage

Based on source types, we expect:

| Source Type | Summary | Author | Image | Category |
|-------------|---------|---------|-------|----------|
| **RSS Feeds** | 80%+ | 60%+ | 40%+ | 95%+ |
| **API Sources** | 90%+ | 70%+ | 10%+ | 95%+ |
| **Scraped Sources** | 60%+ | 50%+ | 30%+ | 95%+ |

## 📋 Comprehensive Reporting

The pipeline provides detailed reporting:

```
📊 PRODUCTION INGESTION SUMMARY
================================================================================
✅ Successful adapters: 13/13
❌ Failed adapters: 0/13
📚 Total items ingested: 1,247
⏱️  Total duration: 180.3s
📊 Average items per adapter: 95.9

📋 Metadata Coverage:
  Summary: 1,195/1,247 (96%)
  Author: 893/1,247 (72%)
  Image: 445/1,247 (36%)
  Category: 1,247/1,247 (100%)
  Embedding: 1,247/1,247 (100%)

🏆 Top Performers:
  1. techcrunch: 156 items (12.4s)
  2. arxiv-papers: 134 items (23.1s)
  3. aws-big-data: 89 items (8.7s)

🎯 Production Readiness:
  ✅ All adapters working: 13/13
  ✅ Sufficient content: 1,247 items (target: 200+)
  ✅ Performance: 180.3s (target: <300s)
  ✅ Metadata coverage: 84% (target: 70%+)
```

## 🗂️ Database Schema

All data is stored in the finalized production schema:

```sql
-- Rich story cards with enhanced metadata
SELECT 
  s.id,
  s.title,
  s.summary,          -- For card display
  s.author,           -- Attribution
  s.image_url,        -- Visual element
  s.published_at,     -- Temporal sorting
  s.story_category,   -- High-level filtering
  s.tags,             -- Content-based discovery
  src.name AS source_name
FROM stories s
LEFT JOIN sources src ON s.source_id = src.id
ORDER BY s.published_at DESC;
```

## 🏃‍♂️ Performance Characteristics

- **Sequential Mode**: Adapters run one after another (safer, slower)
- **Parallel Mode**: All adapters run simultaneously (faster, more resource intensive)
- **Timeout Protection**: 5-minute timeout per adapter
- **Rate Limiting**: 50ms delay between database operations
- **Batch Processing**: 50 items per batch for efficiency
- **Memory Efficient**: Streaming processing for large datasets

## 🚫 Deprecated Scripts

The following scripts are **deprecated** and should no longer be used:

```bash
# ❌ OLD WAY (deprecated)
npm run ingest:aws
npm run ingest:openai
npm run ingest:microsoft
npm run ingest:arxiv
# ... 9 more scripts

# ✅ NEW WAY (production-ready)
npm run ingest:production:all
```

## 🧪 Testing and Validation

### Validate All Adapters
```bash
# Test all adapters without ingestion
npm run test:adapters
```

### Monitor Metadata Quality
```bash
# Check metadata completeness
npm run validate:metadata

# Inspect database state
npm run inspect:db
```

## 🔄 Migration from Old Scripts

If you were using individual scripts:

| Old Script | New Command |
|------------|-------------|
| `npm run ingest:aws` | `npm run ingest:production aws-big-data` |
| `npm run ingest:openai` | `npm run ingest:production openai-blog` |
| `npm run ingest:microsoft` | `npm run ingest:production microsoft-blog` |
| `npm run ingest:arxiv` | `npm run ingest:production arxiv-papers` |
| `npm run ingest:enhanced` | `npm run ingest:production:all` |

## 📚 Usage Examples

### Daily Production Ingestion
```bash
# Full production ingestion (recommended for daily use)
npm run ingest:production:all
```

### Development/Testing
```bash
# Quick test without embeddings
npm run ingest:production:fast

# Test single source
npm run ingest:production techcrunch
```

### High-Volume Processing
```bash
# Maximum speed (use with caution)
npm run ingest:production:parallel
```

---

## 🎯 Production Readiness Checklist

- [x] **All 13 adapters** updated with enhanced metadata
- [x] **Unified pipeline** handling all sources
- [x] **Comprehensive validation** with quality checks
- [x] **Enhanced metadata extraction** for rich story cards
- [x] **Vector embeddings** for semantic search
- [x] **Content-based tagging** with confidence scoring
- [x] **Performance monitoring** with detailed metrics
- [x] **Error handling** with graceful degradation
- [x] **Finalized database schema** with proper indexing
- [x] **Documentation** and migration guide

**The system is now production-ready for Wave 1 deployment! 🚀** 