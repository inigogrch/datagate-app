#!/usr/bin/env tsx

import { fetchAndParse } from '../packages/adapters/pypi-packages'
import { validateParsedItem } from '../tests/utils/adapter-test-helpers'

async function testPyPIAdapter() {
  console.log('🧪 Testing PyPI Top Packages Adapter...\n')
  
  try {
    console.log('📦 Fetching PyPI package releases...')
    const startTime = Date.now()
    
    const items = await fetchAndParse()
    
    const elapsed = Date.now() - startTime
    console.log(`✅ Fetched ${items.length} package releases in ${elapsed}ms\n`)
    
    if (items.length === 0) {
      console.warn('⚠️  No items returned')
      return
    }
    
    // Test first few items
    console.log('🔍 Validating parsed items...')
    let validCount = 0
    let errorCount = 0
    
    for (const [index, item] of items.slice(0, 5).entries()) {
      try {
        validateParsedItem(item)
        validCount++
        
        console.log(`\n✅ Item ${index + 1}:`)
        console.log(`   Title: ${item.title.slice(0, 80)}...`)
        console.log(`   External ID: ${item.externalId}`)
        console.log(`   Published: ${item.publishedAt.toISOString().slice(0, 10)}`)
        console.log(`   Tags: ${item.tags.join(', ')}`)
        console.log(`   URL: ${item.url}`)
        console.log(`   Content length: ${item.content.length} chars`)
        
      } catch (error) {
        errorCount++
        console.error(`❌ Item ${index + 1} validation failed:`, error)
      }
    }
    
    // Check external ID uniqueness
    const externalIds = items.map(item => item.externalId)
    const uniqueIds = new Set(externalIds)
    if (externalIds.length !== uniqueIds.size) {
      console.warn(`⚠️  Found ${externalIds.length - uniqueIds.size} duplicate external IDs`)
    } else {
      console.log('✅ All external IDs are unique')
    }
    
    // Check date sorting
    let sortedCorrectly = true
    for (let i = 1; i < items.length; i++) {
      if (items[i-1].publishedAt < items[i].publishedAt) {
        sortedCorrectly = false
        break
      }
    }
    
    if (sortedCorrectly) {
      console.log('✅ Items are sorted by publish date (newest first)')
    } else {
      console.warn('⚠️  Items are not properly sorted by publish date')
    }
    
         // Package distribution analysis
     const packageCounts = new Map<string, number>()
     items.forEach(item => {
       if (item.externalId) {
         const packageName = item.externalId.split('@')[0]
         packageCounts.set(packageName, (packageCounts.get(packageName) || 0) + 1)
       }
     })
    
    console.log('\n📊 Package distribution:')
    for (const [pkg, count] of [...packageCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${pkg}: ${count} versions`)
    }
    
    // Tag analysis
    const tagCounts = new Map<string, number>()
    items.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    console.log('\n🏷️  Most common tags:')
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    
    for (const [tag, count] of topTags) {
      console.log(`   ${tag}: ${count} items`)
    }
    
    console.log(`\n✅ PyPI Adapter Test Summary:`)
    console.log(`   • ${items.length} total package releases`)
    console.log(`   • ${validCount} valid items`)
    console.log(`   • ${errorCount} validation errors`)
    console.log(`   • ${uniqueIds.size} unique packages`)
    console.log(`   • Execution time: ${elapsed}ms`)
    
  } catch (error) {
    console.error('❌ PyPI adapter test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  testPyPIAdapter()
} 