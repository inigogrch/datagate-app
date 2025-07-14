#!/usr/bin/env node

// Import all adapters - Wave 1 complete set (13 adapters)
import { fetchAndParse as fetchArxiv } from '../../packages/adapters/arxiv-papers'
import { fetchAndParse as fetchAWS } from '../../packages/adapters/aws-big-data'
import { fetchAndParse as fetchGoogle } from '../../packages/adapters/google-research-scraper'
import { fetchAndParse as fetchHuggingFace } from '../../packages/adapters/huggingface-papers'
import { fetchAndParse as fetchMicrosoft } from '../../packages/adapters/microsoft-blog'
import { fetchAndParse as fetchOpenAI } from '../../packages/adapters/openai-blog'
import { fetchAndParse as fetchPyPI } from '../../packages/adapters/pypi-packages'
// New Wave 1 adapters
import { fetchAndParse as fetchMIT } from '../../packages/adapters/mit-tech-review'
import { fetchAndParse as fetchTechCrunch } from '../../packages/adapters/techcrunch'
import { fetchAndParse as fetchTLDR } from '../../packages/adapters/tldr-tech'
import { fetchAndParse as fetchMITSloan } from '../../packages/adapters/mit-sloan'
import { fetchAndParse as fetchVentureBeat } from '../../packages/adapters/venturebeat'
import { fetchAndParse as fetchArsTechnica } from '../../packages/adapters/arstechnica'

interface AdapterTest {
  name: string
  fetch: () => Promise<any[]>
  expectedMinItems: number
  timeout: number
  critical?: boolean // Mark critical adapters that should always work
}

const ADAPTERS: AdapterTest[] = [
  // All adapters without category grouping
  { name: 'AWS Big Data Blog', fetch: fetchAWS, expectedMinItems: 5, timeout: 5000, critical: true },
  { name: 'OpenAI Official Blog', fetch: fetchOpenAI, expectedMinItems: 5, timeout: 5000, critical: true },
  { name: 'Microsoft Excel & Power BI Blog', fetch: fetchMicrosoft, expectedMinItems: 5, timeout: 8000, critical: true },
  { name: 'PyPI Top Packages', fetch: fetchPyPI, expectedMinItems: 20, timeout: 10000, critical: true },
  { name: 'arXiv AI/ML Papers', fetch: fetchArxiv, expectedMinItems: 20, timeout: 8000, critical: true },
  { name: 'Google Research Blog', fetch: fetchGoogle, expectedMinItems: 5, timeout: 6000, critical: true },
  { name: 'HuggingFace Papers', fetch: fetchHuggingFace, expectedMinItems: 10, timeout: 8000, critical: true },
  { name: 'MIT Technology Review', fetch: fetchMIT, expectedMinItems: 10, timeout: 8000, critical: true },
  { name: 'TechCrunch', fetch: fetchTechCrunch, expectedMinItems: 10, timeout: 5000, critical: true },
  { name: 'TLDR.tech', fetch: fetchTLDR, expectedMinItems: 3, timeout: 20000 }, // Longer timeout for complex scraping
  { name: 'MIT Sloan Management Review', fetch: fetchMITSloan, expectedMinItems: 3, timeout: 6000, critical: true },
  { name: 'VentureBeat', fetch: fetchVentureBeat, expectedMinItems: 5, timeout: 5000, critical: true },
  { name: 'Ars Technica', fetch: fetchArsTechnica, expectedMinItems: 10, timeout: 5000, critical: true }
]

interface ValidationResult {
  adapter: string
  success: boolean
  itemCount: number
  duration: number
  error?: string
  errorType?: 'timeout' | 'fetch' | 'parse' | 'network' | 'unknown'
  sampleItem?: any
  issues: string[]
  critical: boolean
}

function categorizeError(error: unknown): { type: 'timeout' | 'fetch' | 'parse' | 'network' | 'unknown', message: string } {
  const message = error instanceof Error ? error.message : String(error)
  
  if (message.includes('timeout') || message.includes('TIMEOUT')) return { type: 'timeout', message }
  if (message.includes('fetch') || message.includes('HTTP')) return { type: 'fetch', message }
  if (message.includes('parse') || message.includes('JSON') || message.includes('XML')) return { type: 'parse', message }
  if (message.includes('network') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) return { type: 'network', message }
  
  return { type: 'unknown', message }
}

async function validateAdapter(adapter: AdapterTest): Promise<ValidationResult> {
  const result: ValidationResult = {
    adapter: adapter.name,
    success: false,
    itemCount: 0,
    duration: 0,
    issues: [],
    critical: adapter.critical || false
  }
  
  try {
    const startTime = Date.now()
    
    // Run with timeout
    const items = await Promise.race([
      adapter.fetch(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), adapter.timeout)
      )
    ]) as any[]
    
    result.duration = Date.now() - startTime
    result.itemCount = items.length
    
    // Validate item count
    if (items.length < adapter.expectedMinItems) {
      result.issues.push(`Low item count: ${items.length} < ${adapter.expectedMinItems}`)
    }
    
    // Validate item structure
    if (items.length > 0) {
      const sample = items[0]
      result.sampleItem = {
        title: sample.title?.slice(0, 50) + '...',
        hasUrl: !!sample.url,
        hasContent: !!sample.content,
        hasPublishedAt: !!sample.publishedAt,
        hasTags: Array.isArray(sample.tags),
        hasExternalId: !!sample.externalId,
        hasSummary: !!sample.summary,
        hasAuthor: !!sample.author,
        hasImageUrl: !!sample.image_url,
        hasStoryCategory: !!sample.story_category,
        tagCount: sample.tags?.length || 0,
        contentLength: sample.content?.length || 0,
        summaryLength: sample.summary?.length || 0,
        storyCategory: sample.story_category || 'none'
      }
      
      // Check required fields
      const required = ['title', 'url', 'content', 'publishedAt', 'externalId']
      for (const field of required) {
        if (!sample[field]) {
          result.issues.push(`Missing required field: ${field}`)
        }
      }
      
      // Check enhanced metadata fields
      if (sample.story_category && 
          !['research', 'news', 'tools', 'analysis', 'tutorial', 'announcement'].includes(sample.story_category)) {
        result.issues.push(`Invalid story_category: ${sample.story_category}`)
      }
      
      if (sample.image_url) {
        // Allow both full URLs and local paths (starting with /)
        const isValidUrl = sample.image_url.startsWith('/') || 
                          sample.image_url.startsWith('http://') || 
                          sample.image_url.startsWith('https://')
        if (!isValidUrl) {
          try {
            new URL(sample.image_url)
          } catch {
            result.issues.push('Invalid image_url format')
          }
        }
      }
      
      // Check data types
      if (!(sample.publishedAt instanceof Date)) {
        result.issues.push('publishedAt is not a Date object')
      }
      
      if (!Array.isArray(sample.tags)) {
        result.issues.push('tags is not an array')
      }
      
      // Check content quality
      if (sample.content && sample.content.length < 50) {
        result.issues.push('Content too short (may indicate parsing issues)')
      }
      
      // Check for duplicate items
      const urls = new Set(items.map(item => item.url))
      if (urls.size !== items.length) {
        result.issues.push(`Duplicate URLs found: ${items.length - urls.size} duplicates`)
      }
    } else {
      result.issues.push('No items returned')
    }
    
    result.success = result.issues.length === 0
    
  } catch (error) {
    const errorInfo = categorizeError(error)
    result.error = errorInfo.message
    result.errorType = errorInfo.type
    result.success = false
  }
  
  return result
}

async function validateAllAdapters() {
  console.log(`🚀 Wave 1 Enhanced Adapter Validation (${ADAPTERS.length} Adapters)`)
  console.log('=' + '='.repeat(60))
  console.log()
  
  const results: ValidationResult[] = []
  let totalDuration = 0
  
  for (const adapter of ADAPTERS) {
    const result = await validateAdapter(adapter)
    results.push(result)
    totalDuration += result.duration
    
    if (result.success) {
      console.log(`✅ ${result.adapter}: ${result.itemCount} items (${result.duration}ms)`)
    } else {
      const criticalFlag = result.critical ? ' ⚠️ CRITICAL' : ''
      console.log(`❌ ${result.adapter}${criticalFlag}: ${result.errorType || 'unknown'} - ${result.error || result.issues.join(', ')}`)
    }
    console.log()
  }
  
  // Summary report
  console.log('=' + '='.repeat(60))
  console.log('📊 ENHANCED VALIDATION SUMMARY')
  console.log('=' + '='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const criticalFailed = failed.filter(r => r.critical)
  
  console.log(`✅ Successful adapters: ${successful.length}/${results.length}`)
  console.log(`❌ Failed adapters: ${failed.length}/${results.length}`)
  console.log(`⚠️  Critical failures: ${criticalFailed.length}/${results.filter(r => r.critical).length}`)
  console.log(`⏱️  Total validation time: ${(totalDuration/1000).toFixed(1)}s`)
  console.log(`📚 Total items available: ${successful.reduce((sum, r) => sum + r.itemCount, 0)}`)
  console.log()
  
  // Error Analysis
  console.log('🔍 Error Analysis:')
  const errorTypes = [...new Set(failed.map(r => r.errorType).filter(Boolean))]
  for (const errorType of errorTypes) {
    const count = failed.filter(r => r.errorType === errorType).length
    console.log(`   ${errorType}: ${count} adapter(s)`)
  }
  console.log()
  
  // Detailed Results
  console.log('📋 Detailed Results:')
  console.log()
  
  for (const result of results) {
    const icon = result.success ? '✅' : '❌'
    const criticalFlag = result.critical ? ' [CRITICAL]' : ''
    
    console.log(`${icon} ${result.adapter}${criticalFlag}:`)
    console.log(`   Items: ${result.itemCount}`)
    console.log(`   Duration: ${result.duration}ms`)
    
    if (result.sampleItem) {
      console.log(`   Sample: "${result.sampleItem.title}"`)
      console.log(`   Core: URL=${result.sampleItem.hasUrl ? '✓' : '✗'}, Content=${result.sampleItem.hasContent ? '✓' : '✗'} (${result.sampleItem.contentLength}), Tags=${result.sampleItem.hasTags ? '✓' : '✗'} (${result.sampleItem.tagCount})`)
      console.log(`   Enhanced: Summary=${result.sampleItem.hasSummary ? '✓' : '✗'} (${result.sampleItem.summaryLength}), Author=${result.sampleItem.hasAuthor ? '✓' : '✗'}, Image=${result.sampleItem.hasImageUrl ? '✓' : '✗'}, Category=${result.sampleItem.storyCategory}`)
    }
    
    if (result.issues.length > 0) {
      console.log(`   Issues: ${result.issues.join(', ')}`)
    }
    console.log()
  }
  
  // Production Readiness Assessment
  console.log('🎯 Production Readiness Assessment:')
  console.log(`   ${successful.length === results.length ? '✅' : '❌'} All adapters working: ${successful.length}/${results.length}`)
  console.log(`   ${criticalFailed.length === 0 ? '✅' : '❌'} Critical adapters working: ${results.filter(r => r.critical).length - criticalFailed.length}/${results.filter(r => r.critical).length}`)
  console.log(`   ${successful.reduce((sum, r) => sum + r.itemCount, 0) >= 200 ? '✅' : '❌'} Sufficient content volume (200+ items)`)
  console.log(`   ${totalDuration < 15000 ? '✅' : '❌'} Performance acceptable (<15s)`)
  console.log()
  
  // Failed adapters requiring attention
  if (criticalFailed.length > 0) {
    console.log('🚨 Critical adapters requiring immediate attention:')
    for (const result of criticalFailed) {
      console.log(`   • ${result.adapter}: ${result.error || result.issues.join(', ')}`)
    }
    console.log()
  }
  
  if (failed.length > 0) {
    console.log('⚠️  All failed adapters:')
    for (const result of failed) {
      const criticalFlag = result.critical ? ' [CRITICAL]' : ''
      console.log(`   • ${result.adapter}${criticalFlag}: ${result.errorType || 'unknown'} - ${result.error || result.issues.join(', ')}`)
    }
    console.log()
  }
  
  // Final recommendation
  if (successful.length === results.length) {
    console.log('🎉 Validation completed!')
    console.log('📈 Ready for production deployment!')
  } else if (criticalFailed.length === 0) {
    console.log('⚠️  Some non-critical adapters failed but system is operational')
    console.log('📈 Ready for production deployment with monitoring!')
  } else {
    console.log('❌ Critical failures detected - production deployment not recommended')
  }
}

// Run validation
validateAllAdapters().catch(console.error) 