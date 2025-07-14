#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '../../lib/ai/embeddings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function for string repeat
function repeat(str: string, count: number): string {
  return new Array(count + 1).join(str)
}

async function backfillEmbeddings() {
  console.log('🔄 Backfilling Embeddings for Existing Stories')
  console.log(repeat('=', 50))
  
  try {
    // Get stories without embeddings
    const { data: storiesWithoutEmbeddings, error } = await supabase
      .from('stories')
      .select('id, title, content')
      .is('embedding', null)
      .limit(10) // Start with just 10 for testing
    
    if (error) {
      console.error('Error fetching stories:', error)
      return
    }
    
    if (!storiesWithoutEmbeddings?.length) {
      console.log('✅ All stories already have embeddings!')
      return
    }
    
    console.log(`📝 Found ${storiesWithoutEmbeddings.length} stories without embeddings`)
    console.log('🚀 Starting embedding generation...\n')
    
    let processed = 0
    let errors = 0
    
    for (const story of storiesWithoutEmbeddings) {
      try {
        console.log(`Processing: "${story.title.slice(0, 60)}..."`)
        
        // Generate embedding
        const startTime = Date.now()
        const embedding = await generateEmbedding(story.content)
        const duration = Date.now() - startTime
        
        // Update story with embedding
        const { error: updateError } = await supabase
          .from('stories')
          .update({
            embedding: embedding,
            embedding_model: 'text-embedding-3-small',
            embedding_generated_at: new Date().toISOString()
          })
          .eq('id', story.id)
        
        if (updateError) {
          console.error(`❌ Update failed: ${updateError.message}`)
          errors++
        } else {
          console.log(`✅ Embedding added (${duration}ms, ${embedding.length} dimensions)`)
          processed++
        }
        
      } catch (error) {
        console.error(`❌ Error processing story: ${error}`)
        errors++
      }
      
      console.log() // Add spacing
    }
    
    console.log(repeat('=', 50))
    console.log('📊 Backfill Summary:')
    console.log(`   Processed: ${processed}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Remaining: ${storiesWithoutEmbeddings.length - processed}`)
    
    if (processed > 0) {
      // Verify the embeddings
      const { count } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null)
      
      console.log(`   Total stories with embeddings: ${count}`)
    }
    
  } catch (error) {
    console.error('💥 Backfill failed:', error)
  }
}

if (require.main === module) {
  backfillEmbeddings()
    .then(() => {
      console.log('\n🎉 Embedding backfill completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Backfill failed:', error)
      process.exit(1)
    })
} 