#!/usr/bin/env tsx

import { createAdminClient } from '../../lib/supabase/server'
import { generateEmbedding } from '../../lib/ai/embeddings'

const supabase = createAdminClient()

// Strip markdown formatting from content
function stripMarkdownFormatting(text: string): string {
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove blockquotes
    .replace(/^>\s*/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean up multiple spaces and newlines
    .replace(/\n\s*\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

async function cleanContentAndRegenerateEmbeddings() {
  console.log('🧹 Cleaning content and regenerating embeddings...')
  
  try {
    // Get all stories with content that might need cleaning
    const { data: stories, error } = await supabase
      .from('stories')
      .select('id, title, content, summary')
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    if (!stories || stories.length === 0) {
      console.log('No stories found to process.')
      return
    }
    
    console.log(`Found ${stories.length} stories to process`)
    
    let processed = 0
    let cleaned = 0
    let errors = 0
    
    for (const story of stories) {
      try {
        // Check if content needs cleaning (has markdown formatting)
        const hasMarkdown = story.content.includes('**') || 
                           story.content.includes('# ') || 
                           story.content.includes('[') ||
                           story.content.includes('---')
        
        let needsUpdate = false
        let cleanContent = story.content
        let cleanSummary = story.summary
        
        if (hasMarkdown) {
          cleanContent = stripMarkdownFormatting(story.content)
          cleanSummary = story.summary ? stripMarkdownFormatting(story.summary) : story.summary
          needsUpdate = true
          cleaned++
        }
        
        // Always regenerate embeddings for better quality
        const embedding = await generateEmbedding(`${story.title} ${cleanContent}`)
        
        // Update the story
        const { error: updateError } = await supabase
          .from('stories')
          .update({
            content: cleanContent,
            summary: cleanSummary,
            embedding: embedding,
            embedding_model: 'text-embedding-3-small',
            embedding_generated_at: new Date().toISOString()
          })
          .eq('id', story.id)
        
        if (updateError) {
          console.error(`❌ Failed to update story ${story.id}:`, updateError.message)
          errors++
        } else {
          processed++
          if (needsUpdate) {
            console.log(`✅ Cleaned and updated: "${story.title.slice(0, 60)}..."`)
          } else {
            console.log(`🔄 Updated embedding: "${story.title.slice(0, 60)}..."`)
          }
        }
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error processing story ${story.id}:`, error)
        errors++
      }
    }
    
    console.log('\n📊 Processing Summary:')
    console.log(`✅ Successfully processed: ${processed}`)
    console.log(`🧹 Content cleaned: ${cleaned}`)
    console.log(`❌ Errors: ${errors}`)
    
    if (errors === 0) {
      console.log('\n🎉 All content cleaned and embeddings regenerated successfully!')
    } else {
      console.log(`\n⚠️  Completed with ${errors} error(s)`)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  cleanContentAndRegenerateEmbeddings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export { cleanContentAndRegenerateEmbeddings } 