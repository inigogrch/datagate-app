#!/usr/bin/env tsx

import { fetchAndParse } from '../packages/adapters/google-research-scraper'

async function testGoogleResearchScraper() {
  console.log('🔍 Testing Google Research scraper...')
  
  try {
    const items = await fetchAndParse()
    
    console.log(`\n✅ Successfully scraped ${items.length} research posts`)
    
    if (items.length > 0) {
      console.log('\n📋 Sample posts:')
      items.slice(0, 3).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`)
        console.log(`   URL: ${item.url}`)
        console.log(`   Date: ${item.publishedAt.toISOString().split('T')[0]}`)
        console.log(`   Tags: ${item.tags.join(', ')}`)
        console.log(`   External ID: ${item.externalId}`)
        console.log(`   Content preview: ${item.content.slice(0, 100)}...`)
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
    
    return items
    
  } catch (error) {
    console.error('❌ Error testing Google Research scraper:', error)
    throw error
  }
}

// Run the test
if (require.main === module) {
  testGoogleResearchScraper()
    .then((items) => {
      console.log(`\n🎉 Test completed successfully! Found ${items.length} research posts`)
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Test failed:', error)
      process.exit(1)
    })
} 