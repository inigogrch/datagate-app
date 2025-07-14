#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function for string repeat
function repeat(str: string, count: number): string {
  return new Array(count + 1).join(str)
}

async function inspectDatabase() {
  console.log('🔍 Database Inspection Report')
  console.log(repeat('=', 50))
  console.log()

  try {
    // Count total stories
    const { count: totalStories } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📚 Total Stories: ${totalStories}`)

    // Count by source
    const { data: sourceStats } = await supabase
      .from('stories')
      .select('source')
      .order('source')
    
    if (sourceStats) {
      const sourceCounts = sourceStats.reduce((acc, story) => {
        acc[story.source] = (acc[story.source] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log('\n📊 Stories by Source:')
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`)
      })
    }

    // Check embeddings
    const { count: withEmbeddings } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null)
    
    const { count: withoutEmbeddings } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .is('embedding', null)

    console.log('\n🧮 Embedding Status:')
    console.log(`   Stories WITH embeddings: ${withEmbeddings}`)
    console.log(`   Stories WITHOUT embeddings: ${withoutEmbeddings}`)

    // Check tagging metadata
    const { count: withTaggingMetadata } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .not('tagging_metadata', 'is', null)

    console.log('\n🏷️  Tagging Metadata:')
    console.log(`   Stories with tagging metadata: ${withTaggingMetadata}`)

    // Show recent stories
    const { data: recentStories } = await supabase
      .from('stories')
      .select('title, source, published_at, tags, embedding')
      .order('published_at', { ascending: false })
      .limit(5)

    console.log('\n📝 Recent Stories:')
    recentStories?.forEach((story, idx) => {
      console.log(`   ${idx + 1}. "${story.title.slice(0, 60)}..." (${story.source})`)
      console.log(`      Published: ${story.published_at}`)
      console.log(`      Tags: [${story.tags?.join(', ') || 'none'}]`)
      console.log(`      Has embedding: ${story.embedding ? '✅' : '❌'}`)
      console.log()
    })

    // Test if new columns exist by trying to select them
    console.log('🗃️  Testing Schema Columns:')
    const testColumns = [
      'external_id', 'tagging_metadata', 'original_metadata', 
      'embedding', 'embedding_model', 'embedding_generated_at'
    ]
    
    for (const col of testColumns) {
      try {
        await supabase
          .from('stories')
          .select(col)
          .limit(1)
        console.log(`   ${col}: ✅`)
      } catch (error) {
        console.log(`   ${col}: ❌`)
      }
    }

  } catch (error) {
    console.error('Error inspecting database:', error)
  }
}

if (require.main === module) {
  inspectDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed:', error)
      process.exit(1)
    })
} 