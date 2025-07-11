#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fetchAndParse, MICROSOFT_BLOG_CONFIG } from '../packages/adapters/microsoft-blog'

// Load environment variables
config({ path: '.env.local' })

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ingestMicrosoftAdapter() {
  console.log('🚀 Microsoft Excel & Power BI Blog Ingestion Script\n')
  
  try {
    // Step 1: Get Microsoft source from database
    console.log('📝 Finding Microsoft source in database...')
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('id, name')
      .eq('name', MICROSOFT_BLOG_CONFIG.name)
      .single()
    
    if (sourceError || !source) {
      console.error('❌ Microsoft Excel & Power BI Blog source not found in database')
      console.log('Available sources should include:', MICROSOFT_BLOG_CONFIG.name)
      process.exit(1)
    }
    
    console.log(`✅ Found source: ${source.name} (ID: ${source.id})`)
    
    // Step 2: Fetch and parse Microsoft feeds
    console.log('\n📦 Fetching Microsoft blog feeds...')
    const startTime = Date.now()
    
    const items = await fetchAndParse()
    
    const elapsed = Date.now() - startTime
    console.log(`✅ Fetched ${items.length} blog posts in ${elapsed}ms`)
    
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
      .eq('source_id', source.id)
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
      source_id: source.id,
      source: MICROSOFT_BLOG_CONFIG.name, // For backward compatibility with old schema
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
    console.log(`   • Source: ${MICROSOFT_BLOG_CONFIG.name} (ID: ${source.id})`)
    console.log(`   • Total blog posts fetched: ${items.length}`)
    console.log(`   • New stories inserted: ${newItems.length}`)
    console.log(`   • Existing stories skipped: ${existingIds.size + existingUrls.size}`)
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
    
    console.log('\n🎉 Microsoft ingestion completed successfully!')
    
  } catch (error) {
    console.error('❌ Microsoft ingestion failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  ingestMicrosoftAdapter()
} 