#!/usr/bin/env node

import dotenv from 'dotenv'

// Load environment variables BEFORE importing anything that uses them
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '@/lib/supabase/server'
import { fetchAndParse } from '@/packages/adapters/aws-big-data'

async function main() {
  console.log('🚀 Starting AWS Big Data Blog ingestion...')
  console.log('Time:', new Date().toISOString())
  
  const supabase = createAdminClient()
  
  try {
    // Fetch AWS source from database
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('id, name')
      .eq('name', 'AWS Big Data Blog')
      .single()
    
    if (sourceError || !source) {
      console.error('❌ AWS Big Data Blog source not found in database')
      console.log('Make sure to run the migrations: supabase db push')
      process.exit(1)
    }
    
    console.log(`📡 Found source: ${source.name} (ID: ${source.id})`)
    
    // Fetch and parse feed using our adapter
    console.log('🔄 Fetching feed...')
    const items = await fetchAndParse()
    console.log(`📄 Parsed ${items.length} items`)
    
    let inserted = 0
    let skipped = 0
    
    // Process each item
    for (const item of items) {
      // Check if story already exists
      const { data: existing } = await supabase
        .from('stories')
        .select('id')
        .eq('url', item.url)
        .single()
      
      if (existing) {
        console.log(`⏭️  Story already exists: ${item.title.slice(0, 60)}...`)
        skipped++
        continue
      }
      
      // Insert story with source_id
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: item.title,
          url: item.url,
          content: item.content,
          published_at: item.publishedAt.toISOString(),
          tags: item.tags,
          source: source.name,  // Old column (still required)
          source_id: source.id  // New column
        })
        .select()
        .single()
      
      if (storyError) {
        console.error('❌ Error inserting story:', storyError)
        continue
      }
      
      console.log(`✅ Inserted: ${story.title.slice(0, 60)}...`)
      inserted++
    }
    
    console.log(`\n📊 Ingestion Summary:`)
    console.log(`   • Total items processed: ${items.length}`)
    console.log(`   • New stories inserted: ${inserted}`)
    console.log(`   • Stories skipped (duplicates): ${skipped}`)
    console.log(`   • Success rate: ${((inserted / items.length) * 100).toFixed(1)}%`)
    
    console.log('\n🎉 AWS ingestion completed successfully!')
    
  } catch (error) {
    console.error('💥 Ingestion failed:', error)
    
    // Print more details if it's a network or parsing error
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
    }
    
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main as ingestAwsFeed } 