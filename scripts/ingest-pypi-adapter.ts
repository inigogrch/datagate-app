#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fetchAndParse, PYPI_CONFIG } from '../packages/adapters/pypi-packages'

// Load environment variables
config({ path: '.env.local' })

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ingestPyPIAdapter() {
  console.log('🚀 PyPI Top Packages Ingestion Script\n')
  
  try {
    // Step 1: Add PyPI source to database
    console.log('📝 Adding PyPI source to database...')
    const { data: existingSource } = await supabase
      .from('sources')
      .select('id')
      .eq('name', PYPI_CONFIG.name)
      .single()
    
    let sourceId: number
    
    if (existingSource) {
      sourceId = existingSource.id
      console.log(`✅ Found existing PyPI source (ID: ${sourceId})`)
    } else {
      const { data: newSource, error: sourceError } = await supabase
        .from('sources')
        .insert({
          name: PYPI_CONFIG.name,
          type: PYPI_CONFIG.type,
          endpoint_url: PYPI_CONFIG.endpoint_url,
          fetch_freq_min: PYPI_CONFIG.fetch_freq_min,
          row_category: PYPI_CONFIG.row_category
        })
        .select('id')
        .single()
      
      if (sourceError) {
        throw new Error(`Failed to create source: ${sourceError.message}`)
      }
      
      sourceId = newSource.id
      console.log(`✅ Created new PyPI source (ID: ${sourceId})`)
    }
    
    // Step 2: Fetch and parse PyPI data
    console.log('\n📦 Fetching PyPI package releases...')
    const startTime = Date.now()
    
    const items = await fetchAndParse()
    
    const elapsed = Date.now() - startTime
    console.log(`✅ Fetched ${items.length} package releases in ${elapsed}ms`)
    
    if (items.length === 0) {
      console.warn('⚠️  No items to ingest')
      return
    }
    
    // Step 3: Check for existing stories (by external_id and URL)
    console.log('\n🔍 Checking for existing stories...')
    const externalIds = items.map(item => item.externalId)
    const urls = items.map(item => item.url)
    
    // Check for existing external_ids in this source
    const { data: existingByExternalId } = await supabase
      .from('stories')
      .select('external_id')
      .eq('source_id', sourceId)
      .in('external_id', externalIds)
    
    // Check for existing URLs across all sources (due to unique constraint)
    const { data: existingByUrl } = await supabase
      .from('stories')
      .select('url')
      .in('url', urls)
    
    const existingIds = new Set(existingByExternalId?.map(s => s.external_id) || [])
    const existingUrls = new Set(existingByUrl?.map(s => s.url) || [])
    
    // Filter out existing items
    const candidateItems = items.filter(item => 
      !existingIds.has(item.externalId) && !existingUrls.has(item.url)
    )
    
    // Internal deduplication: remove duplicates within the batch
    const seenUrls = new Set<string>()
    const seenExternalIds = new Set<string>()
    const newItems = candidateItems.filter(item => {
      if (seenUrls.has(item.url) || seenExternalIds.has(item.externalId)) {
        console.log(`   Skipping duplicate: ${item.externalId} (${item.url})`)
        return false
      }
      seenUrls.add(item.url)
      seenExternalIds.add(item.externalId)
      return true
    })
    
    console.log(`📊 Found ${existingIds.size} existing by external_id, ${existingUrls.size} existing by URL`)
    console.log(`📊 After deduplication: ${candidateItems.length} candidates → ${newItems.length} new stories`)
    
    if (newItems.length === 0) {
      console.log('✅ No new stories to insert')
      return
    }
    
    // Step 4: Insert new stories
    console.log(`\n💾 Inserting ${newItems.length} new stories...`)
    
    const storiesToInsert = newItems.map(item => ({
      source_id: sourceId,
      source: PYPI_CONFIG.name, // For backward compatibility with old schema
      title: item.title,
      url: item.url,
      content: item.content,
      published_at: item.publishedAt.toISOString(),
      tags: item.tags,
      external_id: item.externalId
    }))
    
    const { error: insertError } = await supabase
      .from('stories')
      .insert(storiesToInsert)
    
    if (insertError) {
      throw new Error(`Failed to insert stories: ${insertError.message}`)
    }
    
    console.log('✅ Successfully inserted new stories')
    
    // Step 5: Summary
    console.log('\n📊 Ingestion Summary:')
    console.log(`   • Source: ${PYPI_CONFIG.name} (ID: ${sourceId})`)
    console.log(`   • Total packages fetched: ${items.length}`)
    console.log(`   • New stories inserted: ${newItems.length}`)
    console.log(`   • Existing stories skipped: ${existingIds.size}`)
    console.log(`   • Fetch time: ${elapsed}ms`)
    
    // Show sample of new stories
    if (newItems.length > 0) {
      console.log('\n📝 Sample new stories:')
      newItems.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.title}`)
        console.log(`      External ID: ${item.externalId}`)
        console.log(`      Published: ${item.publishedAt.toISOString().slice(0, 10)}`)
        console.log(`      Tags: ${item.tags.join(', ')}`)
      })
    }
    
    console.log('\n🎉 PyPI ingestion completed successfully!')
    
  } catch (error) {
    console.error('❌ PyPI ingestion failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  ingestPyPIAdapter()
} 