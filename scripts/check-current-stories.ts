#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkCurrentStories() {
  console.log('📊 Checking current database state...\n')
  
  try {
    // Get all sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, name, type, endpoint_url')
      .order('name')
    
    if (sourcesError) {
      console.error('❌ Failed to fetch sources:', sourcesError)
      return
    }
    
    console.log('🏢 CONFIGURED SOURCES:')
    console.log('=' .repeat(80))
    
    for (const source of sources || []) {
      // Get story count for each source
      const { count } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('source_id', source.id)
      
      console.log(`📡 ${source.name}`)
      console.log(`   Type: ${source.type}`)
      console.log(`   URL: ${source.endpoint_url}`)
      console.log(`   Stories: ${count || 0}`)
      console.log(`   ID: ${source.id}`)
      console.log('')
    }
    
    // Get recent stories from each source
    console.log('📰 RECENT STORIES BY SOURCE:')
    console.log('=' .repeat(80))
    
    for (const source of sources || []) {
      const { data: recentStories } = await supabase
        .from('stories')
        .select('title, published_at, external_id')
        .eq('source_id', source.id)
        .order('published_at', { ascending: false })
        .limit(3)
      
      if (recentStories && recentStories.length > 0) {
        console.log(`\n📡 ${source.name} (${recentStories.length} recent):`)
        recentStories.forEach((story, i) => {
          const publishedDate = new Date(story.published_at).toISOString().slice(0, 10)
          console.log(`   ${i + 1}. ${story.title?.slice(0, 60)}...`)
          console.log(`      📅 ${publishedDate} | 🆔 ${story.external_id?.slice(0, 40)}...`)
        })
      } else {
        console.log(`\n📡 ${source.name}: No stories yet`)
      }
    }
    
    // Overall stats
    const { count: totalStories } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
    
    console.log('\n📈 OVERALL STATS:')
    console.log('=' .repeat(80))
    console.log(`📊 Total sources: ${sources?.length || 0}`)
    console.log(`📰 Total stories: ${totalStories || 0}`)
    console.log(`📅 Database updated: ${new Date().toISOString()}`)
    
  } catch (error) {
    console.error('❌ Failed to check current stories:', error)
  }
}

if (require.main === module) {
  checkCurrentStories()
} 