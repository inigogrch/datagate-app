#!/usr/bin/env node

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { fetchAndParse } from '@/packages/adapters/openai-blog'

async function main() {
  console.log('🧪 Testing OpenAI Official Blog Adapter...')
  console.log('Time:', new Date().toISOString())
  console.log('---')
  
  try {
    const startTime = Date.now()
    
    // Test the adapter
    console.log('🔄 Fetching and parsing OpenAI Official Blog...')
    const items = await fetchAndParse()
    
    const duration = Date.now() - startTime
    
    console.log(`\n✅ Successfully parsed ${items.length} items in ${duration}ms`)
    console.log('---')
    
    // Show first few items
    items.slice(0, 3).forEach((item, index) => {
      console.log(`\n📄 Item ${index + 1}:`)
      console.log(`   Title: ${item.title}`)
      console.log(`   URL: ${item.url}`)
      console.log(`   Published: ${item.publishedAt.toISOString()}`)
      console.log(`   Tags: [${item.tags.join(', ')}]`)
      console.log(`   Content preview: ${item.content.slice(0, 150)}...`)
      console.log(`   External ID: ${item.externalId || 'none'}`)
    })
    
    if (items.length > 3) {
      console.log(`\n   ... and ${items.length - 3} more items`)
    }
    
    // Validate data quality
    console.log('\n🔍 Data Quality Check:')
    
    // Check dates are valid and sorted
    const dates = items.map(item => item.publishedAt.getTime())
    const sortedDates = [...dates].sort((a, b) => b - a)
    const isDateSorted = JSON.stringify(dates) === JSON.stringify(sortedDates)
    console.log(`   • Date sorting (newest first): ${isDateSorted ? '✅' : '❌'}`)
    
    // Check for required fields
    const hasTitle = items.every(item => item.title?.trim())
    const hasUrl = items.every(item => item.url?.trim())
    const hasContent = items.every(item => item.content?.trim())
    console.log(`   • All items have title: ${hasTitle ? '✅' : '❌'}`)
    console.log(`   • All items have URL: ${hasUrl ? '✅' : '❌'}`)
    console.log(`   • All items have content: ${hasContent ? '✅' : '❌'}`)
    
    // Check for duplicates
    const urls = items.map(item => item.url)
    const uniqueUrls = new Set(urls)
    const noDuplicates = urls.length === uniqueUrls.size
    console.log(`   • No duplicate URLs: ${noDuplicates ? '✅' : '❌'}`)
    
    // Check markdown conversion
    const hasMarkdown = items.some(item => 
      item.content.includes('**') || 
      item.content.includes('##') || 
      item.content.includes('```')
    )
    console.log(`   • Markdown conversion: ${hasMarkdown ? '✅' : '❌'}`)
    
    // Average content length
    const avgLength = Math.round(
      items.reduce((sum, item) => sum + item.content.length, 0) / items.length
    )
    console.log(`   • Average content length: ${avgLength} chars`)
    
    // Check for AI-specific content
    const hasAiKeywords = items.some(item => 
      /\b(ai|artificial intelligence|machine learning|gpt|chatgpt|dall-e|whisper|api)\b/i.test(item.content + item.title)
    )
    console.log(`   • Contains AI-specific keywords: ${hasAiKeywords ? '✅' : '❌'}`)
    
    console.log('\n🎉 OpenAI adapter test completed successfully!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
    
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

export { main as testOpenAIAdapter } 