import { createAdminClient } from '@/lib/supabase/server'
import { OpenAI } from 'openai'
import Parser from 'rss-parser'
// import { createHash } from 'crypto' // For future use

const parser = new Parser()

// dbt Labs RSS feed URL - Updated to working feed
const DBT_FEED_URL = 'https://www.getdbt.com/blog/feed.xml'

export interface FeedItem {
  title: string
  link: string
  pubDate: string
  content: string
  contentSnippet: string
}

export class IngestionAgent {
  private supabase = createAdminClient()
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  async fetchAndIngestDbtFeed() {
    console.log('Starting dbt Labs feed ingestion...')
    
    try {
      // Fetch RSS feed
      const feed = await parser.parseURL(DBT_FEED_URL)
      console.log(`Fetched ${feed.items.length} items from dbt Labs feed`)

      // Process each item
      for (const item of feed.items) {
        if (!item.link || !item.title) continue
        
        // Create a hash of the URL to check for duplicates (for future use)
        // const urlHash = createHash('md5').update(item.link).digest('hex')
        
        // Check if story already exists
        const { data: existing } = await this.supabase
          .from('stories')
          .select('id')
          .eq('url', item.link)
          .single()
        
        if (existing) {
          console.log(`Story already exists: ${item.title}`)
          continue
        }

        // Parse content - use contentSnippet if available, otherwise content
        const content = item.contentSnippet || item.content || ''
        
        // Insert story
        const { data: story, error: storyError } = await this.supabase
          .from('stories')
          .insert({
            title: item.title,
            url: item.link,
            source: 'dbt Labs Blog',
            content: content,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            tags: this.extractTags(item.title + ' ' + content)
          })
          .select()
          .single()
        
        if (storyError) {
          console.error('Error inserting story:', storyError)
          continue
        }

        console.log(`Inserted story: ${story.title}`)

        // Generate embedding
        await this.generateAndStoreEmbedding(story.id, item.title + ' ' + content)
        
        // Generate summary
        await this.generateAndStoreSummary(story.id, item.title, content)
      }
      
      console.log('dbt Labs feed ingestion completed')
    } catch (error) {
      console.error('Error during ingestion:', error)
      throw error
    }
  }

  private async generateAndStoreEmbedding(storyId: string, text: string) {
    try {
      // Generate embedding using OpenAI
      const response = await this.openai.embeddings.create({
        input: text.slice(0, 8192), // Limit text length
        model: 'text-embedding-3-small'
      })

      const embedding = response.data[0].embedding

      // Store embedding
      const { error } = await this.supabase
        .from('embeddings')
        .insert({
          story_id: storyId,
          embedding: JSON.stringify(embedding) // Supabase expects JSON for vector type
        })

      if (error) {
        console.error('Error storing embedding:', error)
      }
    } catch (error) {
      console.error('Error generating embedding:', error)
    }
  }

  private async generateAndStoreSummary(storyId: string, title: string, content: string) {
    try {
      const prompt = `
        You are a data engineering expert. Summarize this dbt Labs blog post for data professionals.
        
        Title: ${title}
        Content: ${content.slice(0, 2000)}
        
        Provide:
        1. A 3-bullet TL;DR (each bullet should be concise and actionable)
        2. A single sentence explaining "Why it matters to data teams"
        
        Format your response as JSON:
        {
          "tldr": ["bullet 1", "bullet 2", "bullet 3"],
          "impact": "why it matters..."
        }
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500
      })

      const summary = JSON.parse(response.choices[0].message.content || '{}')

      // Update story with summary
      const { error } = await this.supabase
        .from('stories')
        .update({ summary })
        .eq('id', storyId)

      if (error) {
        console.error('Error updating summary:', error)
      }
    } catch (error) {
      console.error('Error generating summary:', error)
    }
  }

  private extractTags(text: string): string[] {
    const tags: string[] = []
    
    // Common dbt-related keywords
    const keywords = [
      'dbt', 'dbt-core', 'dbt cloud', 'transformation', 'sql', 'analytics',
      'data modeling', 'testing', 'documentation', 'orchestration',
      'snowflake', 'bigquery', 'redshift', 'databricks', 'postgres'
    ]
    
    const lowerText = text.toLowerCase()
    
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        tags.push(keyword)
      }
    })
    
    // Deduplicate and return top 5 tags
    return [...new Set(tags)].slice(0, 5)
  }
} 