#!/usr/bin/env node

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { ParsedItem } from '../../lib/adapters/types'
import { tagStoriesWithEmbeddings } from '../../lib/adapters/utils/flexible-tagger'
import { generateEmbedding } from '../../lib/ai/embeddings'

// Adapter registry - all production adapters
const ADAPTER_REGISTRY = {
  // RSS-based adapters (use genericRssAdapter)
  'aws-big-data': () => import('../../packages/adapters/aws-big-data'),
  'openai-blog': () => import('../../packages/adapters/openai-blog'),
  'microsoft-blog': () => import('../../packages/adapters/microsoft-blog'),
  'mit-tech-review': () => import('../../packages/adapters/mit-tech-review'),
  'mit-sloan': () => import('../../packages/adapters/mit-sloan'),
  'venturebeat': () => import('../../packages/adapters/venturebeat'),
  'arstechnica': () => import('../../packages/adapters/arstechnica'),
  
  // Custom adapters
  'google-research-scraper': () => import('../../packages/adapters/google-research-scraper'),
  'huggingface-papers': () => import('../../packages/adapters/huggingface-papers'),
  'tldr-tech': () => import('../../packages/adapters/tldr-tech'),
  'arxiv-papers': () => import('../../packages/adapters/arxiv-papers'),
  'pypi-packages': () => import('../../packages/adapters/pypi-packages'),
  'techcrunch': () => import('../../packages/adapters/techcrunch')
}

// Source name mapping (adapter key -> database source name)
const SOURCE_NAME_MAPPING = {
  'aws-big-data': 'AWS Big Data Blog',
  'openai-blog': 'OpenAI Official Blog',
  'microsoft-blog': 'Microsoft Excel & Power BI Blog',
  'mit-tech-review': 'MIT Technology Review',
  'mit-sloan': 'MIT Sloan Management Review',
  'venturebeat': 'VentureBeat',
  'arstechnica': 'Ars Technica',
  'google-research-scraper': 'Google Research Blog',
  'huggingface-papers': 'HuggingFace Papers',
  'tldr-tech': 'TLDR.tech',
  'arxiv-papers': 'arXiv AI/ML Papers',
  'pypi-packages': 'PyPI Top Packages',
  'techcrunch': 'TechCrunch'
}

interface IngestionResult {
  adapter: string
  success: boolean
  itemsProcessed: number
  itemsSuccess: number
  itemsFailed: number
  itemsSkipped: number
  duration: number
  error?: string
  metadataStats: {
    withSummary: number
    withAuthor: number
    withImage: number
    withCategory: number
    withEmbedding: number
  }
}

interface PipelineConfig {
  generateEmbeddings: boolean
  enableTagging: boolean
  enableValidation: boolean
  batchSize: number
  maxRetries: number
  timeout: number
}

const DEFAULT_CONFIG: PipelineConfig = {
  generateEmbeddings: true,
  enableTagging: true,
  enableValidation: true,
  batchSize: 50,
  maxRetries: 3,
  timeout: 300000 // 5 minutes
}

class ProductionIngestionPipeline {
  private supabase: any
  private config: PipelineConfig

  constructor(config: Partial<PipelineConfig> = {}) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    // Use service role key for ingestion (bypasses RLS)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Get source ID from database
  private async getSourceId(adapterKey: string): Promise<string> {
    const sourceName = SOURCE_NAME_MAPPING[adapterKey as keyof typeof SOURCE_NAME_MAPPING]
    if (!sourceName) {
      throw new Error(`Unknown adapter: ${adapterKey}`)
    }

    const { data: source, error } = await this.supabase
      .from('sources')
      .select('id')
      .eq('name', sourceName)
      .single()

    if (error || !source) {
      throw new Error(`Source "${sourceName}" not found in database: ${error?.message || 'Not found'}`)
    }

    return source.id
  }

  // Validate parsed items
  private validateItems(items: ParsedItem[], adapterKey: string): { valid: ParsedItem[], invalid: any[] } {
    if (!this.config.enableValidation) {
      return { valid: items, invalid: [] }
    }

    const valid: ParsedItem[] = []
    const invalid: any[] = []

    for (const item of items) {
      const issues: string[] = []

      // Required fields
      if (!item.title?.trim()) issues.push('missing title')
      if (!item.url?.trim()) issues.push('missing url')
      if (!item.content?.trim()) issues.push('missing content')
      if (!item.publishedAt || !(item.publishedAt instanceof Date)) issues.push('invalid publishedAt')
      if (!item.externalId?.trim()) issues.push('missing externalId')
      if (!Array.isArray(item.tags)) issues.push('invalid tags array')

      // URL validation
      try {
        new URL(item.url)
      } catch {
        issues.push('invalid URL format')
      }

      // Image URL validation (if present)
      if (item.image_url) {
        // Allow both full URLs and local paths (starting with /)
        const isValidUrl = item.image_url.startsWith('/') || 
                          item.image_url.startsWith('http://') || 
                          item.image_url.startsWith('https://')
        if (!isValidUrl) {
          try {
            new URL(item.image_url)
          } catch {
            issues.push('invalid image_url format')
          }
        }
      }

      // Story category validation (if present)
      if (item.story_category && 
          !['research', 'news', 'tools', 'analysis', 'tutorial', 'announcement'].includes(item.story_category)) {
        issues.push(`invalid story_category: ${item.story_category}`)
      }

      if (issues.length === 0) {
        valid.push(item)
      } else {
        invalid.push({ item: { title: item.title, url: item.url }, issues })
      }
    }

    return { valid, invalid }
  }

  // Calculate metadata statistics
  private calculateMetadataStats(items: ParsedItem[]): IngestionResult['metadataStats'] {
    return {
      withSummary: items.filter(i => i.summary?.trim()).length,
      withAuthor: items.filter(i => i.author?.trim()).length,
      withImage: items.filter(i => i.image_url?.trim()).length,
      withCategory: items.filter(i => i.story_category).length,
      withEmbedding: items.filter(i => (i as any).embedding).length
    }
  }

  // Enhanced processing pipeline for items
  private async processItems(items: ParsedItem[], adapterKey: string): Promise<ParsedItem[]> {
    let processedItems = [...items]

    // Step 1: Apply content-based tagging with embeddings
    if (this.config.enableTagging) {
      console.log(`[Pipeline] Applying enhanced tagging for ${items.length} items...`)
      try {
        processedItems = await tagStoriesWithEmbeddings(
          processedItems, 
          adapterKey, 
          this.config.generateEmbeddings
        )
        console.log(`[Pipeline] ✅ Tagging complete`)
      } catch (error) {
        console.error(`[Pipeline] ⚠️  Tagging failed, continuing without enhanced tags:`, error)
      }
    }

    // Step 2: Generate embeddings if not done in tagging
    if (this.config.generateEmbeddings && !this.config.enableTagging) {
      console.log(`[Pipeline] Generating embeddings for ${items.length} items...`)
      for (const item of processedItems) {
        try {
          const embedding = await generateEmbedding(item.content)
          ;(item as any).embedding = embedding
        } catch (error) {
          console.warn(`[Pipeline] Failed to generate embedding for "${item.title}":`, error)
        }
      }
    }

    return processedItems
  }

  // Ingest items to database
  private async ingestItems(items: ParsedItem[], sourceId: string, adapterKey: string): Promise<{
    success: number
    failed: number
    skipped: number
  }> {
    let success = 0
    let failed = 0
    let skipped = 0

    // Process items in batches
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const batch = items.slice(i, i + this.config.batchSize)
      
      for (const item of batch) {
        try {
          // Prepare database record
          const storyRecord = {
            external_id: item.externalId,
            source_id: sourceId,
            title: item.title,
            url: item.url,
            content: item.content,
            summary: item.summary || null,
            author: item.author || null,
            image_url: item.image_url || null,
            published_at: item.publishedAt.toISOString(),
            story_category: item.story_category || null,
            tags: item.tags,
            embedding: (item as any).embedding || null,
            embedding_model: (item as any).embedding ? 'text-embedding-3-small' : null,
            embedding_generated_at: (item as any).embedding ? new Date().toISOString() : null,
            original_metadata: item.originalMetadata || {},
            tagging_metadata: item.taggingMetadata || {}
          }

          // Upsert story
          const { data, error } = await this.supabase
            .from('stories')
            .upsert(storyRecord, {
              onConflict: 'external_id,source_id',
              ignoreDuplicates: false
            })
            .select('id')

          if (error) {
            console.error(`[Pipeline] Failed to upsert "${item.title}":`, error.message)
            failed++
            continue
          }

          if (data && data.length > 0) {
            success++
          } else {
            skipped++
          }

        } catch (error) {
          console.error(`[Pipeline] Error processing "${item.title}":`, error)
          failed++
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    return { success, failed, skipped }
  }

  // Run ingestion for single adapter
  async runAdapter(adapterKey: string): Promise<IngestionResult> {
    const startTime = Date.now()
    
    try {
      console.log(`\n🚀 [Pipeline] Starting ingestion for ${adapterKey}`)
      
      // Load adapter
      const adapterModule = await ADAPTER_REGISTRY[adapterKey as keyof typeof ADAPTER_REGISTRY]()
      if (!adapterModule?.fetchAndParse) {
        throw new Error(`Adapter ${adapterKey} does not export fetchAndParse function`)
      }

      // Get source ID
      const sourceId = await this.getSourceId(adapterKey)
      
      // Fetch items with timeout
      console.log(`[Pipeline] Fetching items from ${adapterKey}...`)
      const items = await Promise.race([
        adapterModule.fetchAndParse(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Adapter timeout')), this.config.timeout)
        )
      ])

      if (!items || items.length === 0) {
        console.log(`[Pipeline] No items returned from ${adapterKey}`)
        return {
          adapter: adapterKey,
          success: true,
          itemsProcessed: 0,
          itemsSuccess: 0,
          itemsFailed: 0,
          itemsSkipped: 0,
          duration: Date.now() - startTime,
          metadataStats: { withSummary: 0, withAuthor: 0, withImage: 0, withCategory: 0, withEmbedding: 0 }
        }
      }

      console.log(`[Pipeline] Retrieved ${items.length} items from ${adapterKey}`)

      // Validate items
      const { valid, invalid } = this.validateItems(items, adapterKey)
      if (invalid.length > 0) {
        console.warn(`[Pipeline] ⚠️  ${invalid.length} invalid items found:`)
        invalid.forEach(({ item, issues }) => {
          console.warn(`  - "${item.title}": ${issues.join(', ')}`)
        })
      }

      if (valid.length === 0) {
        console.log(`[Pipeline] No valid items to process for ${adapterKey}`)
        return {
          adapter: adapterKey,
          success: false,
          itemsProcessed: items.length,
          itemsSuccess: 0,
          itemsFailed: invalid.length,
          itemsSkipped: 0,
          duration: Date.now() - startTime,
          error: 'No valid items found',
          metadataStats: this.calculateMetadataStats(items)
        }
      }

      // Process items (tagging + embeddings)
      const processedItems = await this.processItems(valid, adapterKey)
      
      // Calculate metadata stats
      const metadataStats = this.calculateMetadataStats(processedItems)
      console.log(`[Pipeline] Metadata coverage:`)
      console.log(`  Summary: ${metadataStats.withSummary}/${processedItems.length} (${Math.round(metadataStats.withSummary/processedItems.length*100)}%)`)
      console.log(`  Author: ${metadataStats.withAuthor}/${processedItems.length} (${Math.round(metadataStats.withAuthor/processedItems.length*100)}%)`)
      console.log(`  Image: ${metadataStats.withImage}/${processedItems.length} (${Math.round(metadataStats.withImage/processedItems.length*100)}%)`)
      console.log(`  Category: ${metadataStats.withCategory}/${processedItems.length} (${Math.round(metadataStats.withCategory/processedItems.length*100)}%)`)
      console.log(`  Embedding: ${metadataStats.withEmbedding}/${processedItems.length} (${Math.round(metadataStats.withEmbedding/processedItems.length*100)}%)`)

      // Ingest to database
      console.log(`[Pipeline] Ingesting ${processedItems.length} items to database...`)
      const ingestionResult = await this.ingestItems(processedItems, sourceId, adapterKey)

      const duration = Date.now() - startTime
      console.log(`✅ [Pipeline] ${adapterKey} complete: ${ingestionResult.success} success, ${ingestionResult.failed} failed, ${ingestionResult.skipped} skipped (${duration}ms)`)

      return {
        adapter: adapterKey,
        success: true,
        itemsProcessed: items.length,
        itemsSuccess: ingestionResult.success,
        itemsFailed: ingestionResult.failed + invalid.length,
        itemsSkipped: ingestionResult.skipped,
        duration,
        metadataStats
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [Pipeline] ${adapterKey} failed:`, errorMessage)
      
      return {
        adapter: adapterKey,
        success: false,
        itemsProcessed: 0,
        itemsSuccess: 0,
        itemsFailed: 0,
        itemsSkipped: 0,
        duration,
        error: errorMessage,
        metadataStats: { withSummary: 0, withAuthor: 0, withImage: 0, withCategory: 0, withEmbedding: 0 }
      }
    }
  }

  // Run ingestion for all adapters
  async runAllAdapters(options: { 
    parallel?: boolean, 
    continueOnError?: boolean 
  } = {}): Promise<IngestionResult[]> {
    const { parallel = false, continueOnError = true } = options
    const adapters = Object.keys(ADAPTER_REGISTRY)
    const results: IngestionResult[] = []

    console.log(`\n🌟 [Pipeline] Starting production ingestion for ${adapters.length} adapters`)
    console.log(`🔧 [Pipeline] Config: embeddings=${this.config.generateEmbeddings}, tagging=${this.config.enableTagging}, validation=${this.config.enableValidation}`)

    if (parallel) {
      console.log(`⚡ [Pipeline] Running in parallel mode`)
      const promises = adapters.map(adapter => this.runAdapter(adapter))
      const allResults = await Promise.allSettled(promises)
      
      allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`❌ [Pipeline] ${adapters[index]} failed:`, result.reason)
          results.push({
            adapter: adapters[index],
            success: false,
            itemsProcessed: 0,
            itemsSuccess: 0,
            itemsFailed: 0,
            itemsSkipped: 0,
            duration: 0,
            error: result.reason?.message || 'Unknown error',
            metadataStats: { withSummary: 0, withAuthor: 0, withImage: 0, withCategory: 0, withEmbedding: 0 }
          })
        }
      })
    } else {
      console.log(`🔄 [Pipeline] Running in sequential mode`)
      for (const adapter of adapters) {
        try {
          const result = await this.runAdapter(adapter)
          results.push(result)
          
          if (!result.success && !continueOnError) {
            console.error(`❌ [Pipeline] Stopping due to error in ${adapter}`)
            break
          }
        } catch (error) {
          console.error(`❌ [Pipeline] Critical error in ${adapter}:`, error)
          if (!continueOnError) break
        }
      }
    }

    // Print comprehensive summary
    this.printSummary(results)
    
    return results
  }

  // Print comprehensive ingestion summary
  private printSummary(results: IngestionResult[]): void {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 PRODUCTION INGESTION SUMMARY`)
    console.log(`${'='.repeat(80)}`)

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const totalItems = results.reduce((sum, r) => sum + r.itemsSuccess, 0)
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
    
    // Overall stats
    console.log(`✅ Successful adapters: ${successful.length}/${results.length}`)
    console.log(`❌ Failed adapters: ${failed.length}/${results.length}`)
    console.log(`📚 Total items ingested: ${totalItems}`)
    console.log(`⏱️  Total duration: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log(`📊 Average items per adapter: ${(totalItems / successful.length || 0).toFixed(1)}`)

    // Metadata coverage summary
    const totalItemsWithMetadata = successful.reduce((sum, r) => sum + r.itemsSuccess, 0)
    if (totalItemsWithMetadata > 0) {
      const summaryCount = successful.reduce((sum, r) => sum + r.metadataStats.withSummary, 0)
      const authorCount = successful.reduce((sum, r) => sum + r.metadataStats.withAuthor, 0)
      const imageCount = successful.reduce((sum, r) => sum + r.metadataStats.withImage, 0)
      const categoryCount = successful.reduce((sum, r) => sum + r.metadataStats.withCategory, 0)
      const embeddingCount = successful.reduce((sum, r) => sum + r.metadataStats.withEmbedding, 0)

      console.log(`\n📋 Metadata Coverage:`)
      console.log(`  Summary: ${summaryCount}/${totalItemsWithMetadata} (${Math.round(summaryCount/totalItemsWithMetadata*100)}%)`)
      console.log(`  Author: ${authorCount}/${totalItemsWithMetadata} (${Math.round(authorCount/totalItemsWithMetadata*100)}%)`)
      console.log(`  Image: ${imageCount}/${totalItemsWithMetadata} (${Math.round(imageCount/totalItemsWithMetadata*100)}%)`)
      console.log(`  Category: ${categoryCount}/${totalItemsWithMetadata} (${Math.round(categoryCount/totalItemsWithMetadata*100)}%)`)
      console.log(`  Embedding: ${embeddingCount}/${totalItemsWithMetadata} (${Math.round(embeddingCount/totalItemsWithMetadata*100)}%)`)
    }

    // Failed adapters detail
    if (failed.length > 0) {
      console.log(`\n❌ Failed Adapters:`)
      failed.forEach(result => {
        console.log(`  • ${result.adapter}: ${result.error}`)
      })
    }

    // Top performers
    if (successful.length > 0) {
      console.log(`\n🏆 Top Performers:`)
      successful
        .sort((a, b) => b.itemsSuccess - a.itemsSuccess)
        .slice(0, 5)
        .forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.adapter}: ${result.itemsSuccess} items (${(result.duration/1000).toFixed(1)}s)`)
        })
    }

    // Production readiness assessment
    console.log(`\n🎯 Production Readiness:`)
    console.log(`  ${successful.length === results.length ? '✅' : '❌'} All adapters working: ${successful.length}/${results.length}`)
    console.log(`  ${totalItems >= 200 ? '✅' : '❌'} Sufficient content: ${totalItems} items (target: 200+)`)
    console.log(`  ${totalDuration < 300000 ? '✅' : '❌'} Performance: ${(totalDuration/1000).toFixed(1)}s (target: <300s)`)
    
    const avgMetadataCoverage = totalItemsWithMetadata > 0 ? 
      successful.reduce((sum, r) => sum + r.metadataStats.withSummary + r.metadataStats.withCategory, 0) / (totalItemsWithMetadata * 2) : 0
    console.log(`  ${avgMetadataCoverage > 0.7 ? '✅' : '❌'} Metadata coverage: ${Math.round(avgMetadataCoverage * 100)}% (target: 70%+)`)

    console.log(`${'='.repeat(80)}`)
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  try {
    // Parse CLI options
    const config: Partial<PipelineConfig> = {}
    if (args.includes('--no-embeddings')) config.generateEmbeddings = false
    if (args.includes('--no-tagging')) config.enableTagging = false
    if (args.includes('--no-validation')) config.enableValidation = false
    if (args.includes('--fast')) {
      config.generateEmbeddings = false
      config.enableTagging = false
    }

    const pipeline = new ProductionIngestionPipeline(config)

    switch (command) {
      case 'all':
        const parallel = args.includes('--parallel')
        await pipeline.runAllAdapters({ parallel })
        break
        
      case 'list':
        console.log('Available adapters:')
        Object.keys(ADAPTER_REGISTRY).forEach(adapter => {
          console.log(`  • ${adapter} (${SOURCE_NAME_MAPPING[adapter as keyof typeof SOURCE_NAME_MAPPING]})`)
        })
        break
        
      default:
        if (command && ADAPTER_REGISTRY[command as keyof typeof ADAPTER_REGISTRY]) {
          await pipeline.runAdapter(command)
        } else {
          console.log('Usage:')
          console.log('  npm run ingest:production all [--parallel] [--no-embeddings] [--no-tagging] [--fast]')
          console.log('  npm run ingest:production <adapter-name>')
          console.log('  npm run ingest:production list')
          console.log('')
          console.log('Available adapters:')
          Object.keys(ADAPTER_REGISTRY).forEach(adapter => {
            console.log(`  • ${adapter}`)
          })
          process.exit(1)
        }
    }
  } catch (error) {
    console.error('❌ Pipeline failed:', error)
    process.exit(1)
  }
}

// Export for programmatic use
export { ProductionIngestionPipeline, ADAPTER_REGISTRY, SOURCE_NAME_MAPPING }

// Run CLI if called directly
if (require.main === module) {
  main()
} 