#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fetchAndParse, HUGGINGFACE_PAPERS_CONFIG } from '../packages/adapters/huggingface-papers'

// Load environment variables
config({ path: '.env.local' })

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureSourceExists(): Promise<string> {
  // Check if source exists
  const { data: existingSource, error: selectError } = await supabase
    .from('sources')
    .select('id')
    .eq('name', HUGGINGFACE_PAPERS_CONFIG.name)
    .single()
  
  if (existingSource) {
    console.log(`✅ Found existing source: ${HUGGINGFACE_PAPERS_CONFIG.name}`)
    return existingSource.id
  }
  
  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to check for existing source: ${selectError.message}`)
  }
  
  // Create new source
  console.log(`🔄 Creating new source: ${HUGGINGFACE_PAPERS_CONFIG.name}`)
  const { data: newSource, error: insertError } = await supabase
    .from('sources')
    .insert({
      name: HUGGINGFACE_PAPERS_CONFIG.name,
      type: HUGGINGFACE_PAPERS_CONFIG.type,
      endpoint_url: HUGGINGFACE_PAPERS_CONFIG.endpoint_url,
      fetch_freq_min: HUGGINGFACE_PAPERS_CONFIG.fetch_freq_min,
      row_category: HUGGINGFACE_PAPERS_CONFIG.row_category,
      is_active: true
    })
    .select('id')
    .single()
  
  if (insertError) {
    throw new Error(`Failed to create source: ${insertError.message}`)
  }
  
  console.log(`✅ Created new source with ID: ${newSource.id}`)
  return newSource.id
}

async function ingestHuggingFacePapers() {
  console.log('🚀 Starting HuggingFace Papers ingestion...')
  
  try {
    // Ensure source exists in database
    const sourceId = await ensureSourceExists()
    
    // Fetch and parse papers
    console.log('📡 Fetching HuggingFace Papers...')
    const items = await fetchAndParse()
    
    if (items.length === 0) {
      console.log('⚠️  No papers found to ingest')
      return
    }
    
    console.log(`📝 Ingesting ${items.length} research papers...`)
    
    let insertedCount = 0
    let skippedCount = 0
    
    // Process each paper
    for (const item of items) {
      try {
        const { data, error } = await supabase
          .from('stories')
          .insert({
            title: item.title,
            url: item.url,
            source: HUGGINGFACE_PAPERS_CONFIG.name, // Legacy field
            source_id: sourceId,
            content: item.content,
            published_at: item.publishedAt.toISOString(),
            tags: item.tags,
            external_id: item.externalId
          })
          .select('id')
          .single()
        
        if (error) {
          if (error.code === '23505') {
            // Unique constraint violation (duplicate)
            console.log(`⏭️  Skipped duplicate: "${item.title}"`)
            skippedCount++
          } else {
            console.error(`❌ Failed to insert "${item.title}":`, error.message)
          }
        } else {
          console.log(`✅ Inserted: "${item.title}"`)
          insertedCount++
        }
      } catch (itemError) {
        console.error(`❌ Error processing "${item.title}":`, itemError)
      }
    }
    
    console.log(`\n📊 Ingestion Summary:`)
    console.log(`   • Inserted: ${insertedCount} new papers`)
    console.log(`   • Skipped: ${skippedCount} duplicates`)
    console.log(`   • Total processed: ${items.length}`)
    
    // Show some sample titles
    if (insertedCount > 0) {
      console.log(`\n📋 Sample inserted papers:`)
      items.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title}`)
      })
    }
    
    // Show research topics discovered
    const topics = new Set()
    items.forEach(item => {
      item.tags.forEach(tag => topics.add(tag))
    })
    
    console.log(`\n🏷️  Research topics found: ${Array.from(topics).slice(0, 10).join(', ')}`)
    
  } catch (error) {
    console.error('💥 Ingestion failed:', error)
    throw error
  }
}

// Run the ingestion
if (require.main === module) {
  ingestHuggingFacePapers()
    .then(() => {
      console.log('\n🎉 HuggingFace Papers ingestion completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Ingestion failed:', error)
      process.exit(1)
    })
} 