#!/usr/bin/env tsx

import { fetchAndParse } from '../packages/adapters/huggingface-papers'

async function testHuggingFacePapers() {
  console.log('🔍 Testing HuggingFace Papers scraper...')
  
  try {
    const items = await fetchAndParse()
    
    console.log(`\n✅ Successfully scraped ${items.length} research papers`)
    
    if (items.length > 0) {
      console.log('\n📋 Sample papers:')
      items.slice(0, 3).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`)
        console.log(`   URL: ${item.url}`)
        console.log(`   Date: ${item.publishedAt.toISOString().split('T')[0]}`)
        console.log(`   Tags: ${item.tags.join(', ')}`)
        console.log(`   External ID: ${item.externalId}`)
        console.log(`   Content preview: ${item.content.slice(0, 150)}...`)
      })
    }
    
    // Validate all items have required fields
    const validation = items.every(item => 
      item.title && 
      item.url && 
      item.content && 
      item.publishedAt &&
      item.tags.length > 0 &&
      item.externalId
    )
    
    if (validation) {
      console.log('\n✅ All items have required fields')
    } else {
      console.log('\n❌ Some items missing required fields')
    }
    
    // Check for common research topics
    const topics = new Set()
    items.forEach(item => {
      item.tags.forEach(tag => topics.add(tag))
    })
    
    console.log(`\n🏷️  Found research topics: ${Array.from(topics).join(', ')}`)
    
    return items
    
  } catch (error) {
    console.error('❌ Error testing HuggingFace Papers scraper:', error)
    throw error
  }
}

// Run the test
if (require.main === module) {
  testHuggingFacePapers()
    .then((items) => {
      console.log(`\n🎉 Test completed successfully! Found ${items.length} research papers`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Test failed:', error)
      process.exit(1)
    })
} 