#!/usr/bin/env tsx

import { fetchAndParse } from '../packages/adapters/pypi-packages'

// Simple validation function without Jest
function validateParsedItem(item: any) {
  if (!item.title || typeof item.title !== 'string') {
    throw new Error('Missing or invalid title')
  }
  if (!item.url || typeof item.url !== 'string') {
    throw new Error('Missing or invalid url')
  }
  if (!item.content || typeof item.content !== 'string') {
    throw new Error('Missing or invalid content')
  }
  if (!item.publishedAt || !(item.publishedAt instanceof Date)) {
    throw new Error('Missing or invalid publishedAt')
  }
  if (!item.tags || !Array.isArray(item.tags)) {
    throw new Error('Missing or invalid tags')
  }
  if (!item.externalId || typeof item.externalId !== 'string') {
    throw new Error('Missing or invalid externalId')
  }
  return true
}

async function testPyPIAdapter() {
  console.log('🧪 Testing PyPI Top Packages Adapter (Simple)...\n')
  
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
    
    for (const [index, item] of items.slice(0, 3).entries()) {
      try {
        validateParsedItem(item)
        validCount++
        
        console.log(`\n✅ Item ${index + 1}:`)
        console.log(`   Title: ${item.title.slice(0, 60)}...`)
        console.log(`   External ID: ${item.externalId}`)
        console.log(`   Published: ${item.publishedAt.toISOString().slice(0, 10)}`)
        console.log(`   Tags: ${item.tags.join(', ')}`)
        console.log(`   URL: ${item.url}`)
        console.log(`   Content preview: ${item.content.slice(0, 100)}...`)
        
      } catch (error) {
        errorCount++
        console.error(`❌ Item ${index + 1} validation failed:`, error)
      }
    }
    
    // Check external ID uniqueness
    const externalIds = items.map(item => item.externalId).filter(Boolean)
    const uniqueIds = new Set(externalIds)
    if (externalIds.length !== uniqueIds.size) {
      console.warn(`⚠️  Found ${externalIds.length - uniqueIds.size} duplicate external IDs`)
    } else {
      console.log('✅ All external IDs are unique')
    }
    
    // Package distribution
    const packageCounts = new Map<string, number>()
    items.forEach(item => {
      if (item.externalId) {
        const packageName = item.externalId.split('@')[0]
        packageCounts.set(packageName, (packageCounts.get(packageName) || 0) + 1)
      }
    })
    
    console.log('\n📊 Package distribution:')
    for (const [pkg, count] of [...packageCounts.entries()].slice(0, 5)) {
      console.log(`   ${pkg}: ${count} versions`)
    }
    
    console.log(`\n✅ PyPI Adapter Test Summary:`)
    console.log(`   • ${items.length} total package releases`)
    console.log(`   • ${validCount} valid items`)
    console.log(`   • ${errorCount} validation errors`)
    console.log(`   • ${uniqueIds.size} unique external IDs`)
    console.log(`   • Execution time: ${elapsed}ms`)
    
  } catch (error) {
    console.error('❌ PyPI adapter test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  testPyPIAdapter()
} 