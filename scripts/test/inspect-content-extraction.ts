#!/usr/bin/env tsx

// Script to inspect actual content extraction from adapters
import { fetchAndParse as fetchGoogle } from '../../packages/adapters/google-research-scraper'
import { fetchAndParse as fetchArxiv } from '../../packages/adapters/arxiv-papers'
import { fetchAndParse as fetchArsTechnica } from '../../packages/adapters/arstechnica'
import { fetchAndParse as fetchAWS } from '../../packages/adapters/aws-big-data'

async function inspectAdapter(name: string, fetchFn: () => Promise<any[]>) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🔍 INSPECTING: ${name}`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    const items = await fetchFn()
    
    if (items.length === 0) {
      console.log('❌ No items found')
      return
    }
    
    const firstItem = items[0]
    
    console.log(`📊 Found ${items.length} items`)
    console.log(`\n📝 FIRST ITEM ANALYSIS:`)
    console.log(`Title: "${firstItem.title}"`)
    console.log(`URL: ${firstItem.url}`)
    console.log(`Content Length: ${firstItem.content?.length || 0} characters`)
    console.log(`Summary Length: ${firstItem.summary?.length || 0} characters`)
    
    console.log(`\n📄 ACTUAL CONTENT (first 500 chars):`)
    console.log(`"${firstItem.content?.substring(0, 500) || 'NO CONTENT'}..."`)
    
    console.log(`\n📋 ACTUAL SUMMARY (first 200 chars):`)
    console.log(`"${firstItem.summary?.substring(0, 200) || 'NO SUMMARY'}..."`)
    
    // Show a few more examples
    if (items.length > 1) {
      console.log(`\n📊 OTHER EXAMPLES:`)
      for (let i = 1; i < Math.min(4, items.length); i++) {
        const item = items[i]
        console.log(`\n  ${i+1}. "${item.title}" (${item.content?.length || 0} chars)`)
        console.log(`     Content preview: "${item.content?.substring(0, 100) || 'NO CONTENT'}..."`)
      }
    }
    
  } catch (error) {
    console.error(`❌ Error inspecting ${name}:`, error)
  }
}

async function main() {
  console.log('🔍 CONTENT EXTRACTION INSPECTION')
  console.log('This script shows what content is actually being extracted by each adapter')
  
  // Test adapters one by one
  await inspectAdapter('Google Research Blog', fetchGoogle)
  await inspectAdapter('arXiv Papers', () => fetchArxiv().then(items => items.slice(0, 3))) // Limit to 3 for speed
  await inspectAdapter('Ars Technica', fetchArsTechnica)
  await inspectAdapter('AWS Big Data Blog', fetchAWS)
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('🎯 SUMMARY: Check if content contains full articles or just summaries!')
  console.log(`${'='.repeat(60)}`)
}

main().catch(console.error) 