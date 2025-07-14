#!/usr/bin/env tsx

// Load environment variables FIRST
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import fs from 'fs'
import path from 'path'
import { ParsedItem, TaggingMetadata } from '../../lib/adapters/types'
import { tagStoriesWithEmbeddings } from '../../lib/adapters/utils/flexible-tagger'

// Import all adapters
import { fetchAndParse as fetchArxiv } from '../../packages/adapters/arxiv-papers'
import { fetchAndParse as fetchGoogleResearch } from '../../packages/adapters/google-research-scraper'
import { fetchAndParse as fetchHuggingFace } from '../../packages/adapters/huggingface-papers'
import { fetchAndParse as fetchMicrosoft } from '../../packages/adapters/microsoft-blog'
import { fetchAndParse as fetchOpenAI } from '../../packages/adapters/openai-blog'
import { fetchAndParse as fetchPyPI } from '../../packages/adapters/pypi-packages'
import { fetchAndParse as fetchMIT } from '../../packages/adapters/mit-tech-review'
import { fetchAndParse as fetchAWS } from '../../packages/adapters/aws-big-data'
import { fetchAndParse as fetchTechCrunch } from '../../packages/adapters/techcrunch'
import { fetchAndParse as fetchTLDR } from '../../packages/adapters/tldr-tech'
import { fetchAndParse as fetchMITSloan } from '../../packages/adapters/mit-sloan'
import { fetchAndParse as fetchVentureBeat } from '../../packages/adapters/venturebeat'
import { fetchAndParse as fetchArsTechnica } from '../../packages/adapters/arstechnica'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AdapterConfig {
  id: string
  name: string
  fetch: () => Promise<ParsedItem[]>
  fixturePath?: string
  hasFixtures: boolean
  timeout: number
  critical: boolean
}

const ADAPTERS: AdapterConfig[] = [
  { id: 'aws', name: 'AWS Big Data Blog', fetch: fetchAWS, fixturePath: 'aws-big-data', hasFixtures: true, timeout: 8000, critical: true },
  { id: 'openai', name: 'OpenAI Official Blog', fetch: fetchOpenAI, hasFixtures: false, timeout: 8000, critical: true },
  { id: 'microsoft', name: 'Microsoft Excel & Power BI Blog', fetch: fetchMicrosoft, hasFixtures: false, timeout: 10000, critical: true },
  { id: 'pypi', name: 'PyPI Top Packages', fetch: fetchPyPI, hasFixtures: false, timeout: 12000, critical: true },
  { id: 'arxiv', name: 'arXiv AI/ML Papers', fetch: fetchArxiv, hasFixtures: false, timeout: 10000, critical: true },
  { id: 'google', name: 'Google Research Blog', fetch: fetchGoogleResearch, fixturePath: 'google-research', hasFixtures: true, timeout: 8000, critical: true },
  { id: 'huggingface', name: 'HuggingFace Papers', fetch: fetchHuggingFace, hasFixtures: false, timeout: 10000, critical: true },
  { id: 'mit', name: 'MIT Technology Review', fetch: fetchMIT, hasFixtures: false, timeout: 10000, critical: true },
  { id: 'techcrunch', name: 'TechCrunch', fetch: fetchTechCrunch, hasFixtures: false, timeout: 8000, critical: true },
  { id: 'tldr', name: 'TLDR.tech', fetch: fetchTLDR, hasFixtures: false, timeout: 25000, critical: false },
  { id: 'mitsloan', name: 'MIT Sloan Management Review', fetch: fetchMITSloan, hasFixtures: false, timeout: 8000, critical: true },
  { id: 'venturebeat', name: 'VentureBeat', fetch: fetchVentureBeat, hasFixtures: false, timeout: 8000, critical: true },
  { id: 'arstechnica', name: 'Ars Technica', fetch: fetchArsTechnica, hasFixtures: false, timeout: 8000, critical: true }
]

interface FieldAnalysis {
  fieldName: string
  coverage: number
  dataType: string[]
  sampleValues: any[]
  nullCount: number
  emptyCount: number
}

interface OriginalMetadataAnalysis {
  totalFields: number
  fieldsCovered: string[]
  uniqueFields: string[]
  commonFields: string[]
  fieldDiff: Record<string, number>
}

interface EdgeCaseAnalysis {
  emptyTitles: number
  emptyContent: number
  invalidDates: number
  missingUrls: number
  duplicateExternalIds: number
  malformedItems: string[]
}

interface AdapterTestResult {
  adapterId: string
  adapterName: string
  testType: 'live' | 'fixture'
  success: boolean
  duration: number
  error?: string
  
  // Core metrics
  totalItemsParsed: number
  validItems: number
  invalidItems: number
  
  // Field analysis
  canonicalFields: FieldAnalysis[]
  missingFields: string[]
  nullFields: string[]
  
  // Metadata analysis
  originalMetadataAnalysis: OriginalMetadataAnalysis
  taggingMetadataAnalysis?: any
  
  // Edge cases
  edgeCases: EdgeCaseAnalysis
  
  // Sample data
  sampleItems: any[]
  
  // Database operations (if not dry run)
  storiesIngested?: number
  storiesSkipped?: number
  storiesErrored?: number
  duplicatesFound?: number
}

interface TestSummary {
  totalAdapters: number
  successfulAdapters: number
  failedAdapters: number
  criticalFailures: number
  totalItemsProcessed: number
  totalStoriesIngested: number
  totalStoriesSkipped: number
  totalAnomalies: number
  testDuration: number
  adaptersWithIssues: string[]
}

function analyzeFields(items: ParsedItem[]): FieldAnalysis[] {
  const requiredFields = ['title', 'url', 'content', 'publishedAt', 'tags', 'externalId']
  const analyses: FieldAnalysis[] = []
  
  for (const fieldName of requiredFields) {
    const analysis: FieldAnalysis = {
      fieldName,
      coverage: 0,
      dataType: [],
      sampleValues: [],
      nullCount: 0,
      emptyCount: 0
    }
    
    const types = new Set<string>()
    let validCount = 0
    
    for (const item of items) {
      const value = (item as any)[fieldName]
      
      if (value === null || value === undefined) {
        analysis.nullCount++
      } else if (value === '' || (Array.isArray(value) && value.length === 0)) {
        analysis.emptyCount++
      } else {
        validCount++
        types.add(typeof value)
        if (analysis.sampleValues.length < 3) {
          analysis.sampleValues.push(value)
        }
      }
    }
    
    analysis.coverage = Math.round((validCount / items.length) * 100)
    analysis.dataType = Array.from(types)
    analyses.push(analysis)
  }
  
  return analyses
}

function analyzeOriginalMetadata(items: ParsedItem[]): OriginalMetadataAnalysis {
  const allFields = new Set<string>()
  const fieldCounts: Record<string, number> = {}
  
  for (const item of items) {
    if (item.originalMetadata) {
      for (const field of Object.keys(item.originalMetadata)) {
        allFields.add(field)
        fieldCounts[field] = (fieldCounts[field] || 0) + 1
      }
    }
  }
  
  const totalItems = items.filter(item => item.originalMetadata).length
  const fieldsCovered = Array.from(allFields)
  const commonFields = fieldsCovered.filter(field => fieldCounts[field] === totalItems)
  const uniqueFields = fieldsCovered.filter(field => fieldCounts[field] === 1)
  
  return {
    totalFields: allFields.size,
    fieldsCovered,
    uniqueFields,
    commonFields,
    fieldDiff: fieldCounts
  }
}

function analyzeEdgeCases(items: ParsedItem[]): EdgeCaseAnalysis {
  const edgeCases: EdgeCaseAnalysis = {
    emptyTitles: 0,
    emptyContent: 0,
    invalidDates: 0,
    missingUrls: 0,
    duplicateExternalIds: 0,
    malformedItems: []
  }
  
  const externalIds = new Set<string>()
  const duplicateIds = new Set<string>()
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    // Check for empty/missing core fields
    if (!item.title || item.title.trim() === '') {
      edgeCases.emptyTitles++
      edgeCases.malformedItems.push(`Item ${i}: Empty title`)
    }
    
    if (!item.content || item.content.trim() === '') {
      edgeCases.emptyContent++
      edgeCases.malformedItems.push(`Item ${i}: Empty content`)
    }
    
    if (!item.url || item.url.trim() === '') {
      edgeCases.missingUrls++
      edgeCases.malformedItems.push(`Item ${i}: Missing URL`)
    }
    
    if (!item.publishedAt || !(item.publishedAt instanceof Date) || isNaN(item.publishedAt.getTime())) {
      edgeCases.invalidDates++
      edgeCases.malformedItems.push(`Item ${i}: Invalid publishedAt: ${item.publishedAt}`)
    }
    
    // Check for duplicate external IDs
    if (externalIds.has(item.externalId)) {
      duplicateIds.add(item.externalId)
    } else {
      externalIds.add(item.externalId)
    }
  }
  
  edgeCases.duplicateExternalIds = duplicateIds.size
  
  return edgeCases
}

async function testAdapterWithLiveData(adapter: AdapterConfig): Promise<AdapterTestResult> {
  const startTime = Date.now()
  const result: AdapterTestResult = {
    adapterId: adapter.id,
    adapterName: adapter.name,
    testType: 'live',
    success: false,
    duration: 0,
    totalItemsParsed: 0,
    validItems: 0,
    invalidItems: 0,
    canonicalFields: [],
    missingFields: [],
    nullFields: [],
    originalMetadataAnalysis: {
      totalFields: 0,
      fieldsCovered: [],
      uniqueFields: [],
      commonFields: [],
      fieldDiff: {}
    },
    edgeCases: {
      emptyTitles: 0,
      emptyContent: 0,
      invalidDates: 0,
      missingUrls: 0,
      duplicateExternalIds: 0,
      malformedItems: []
    },
    sampleItems: []
  }
  
  try {
    console.log(`\n🔄 Testing ${adapter.name} with LIVE DATA...`)
    
    // Fetch with timeout
    const items = await Promise.race([
      adapter.fetch(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), adapter.timeout)
      )
    ])
    
    result.duration = Date.now() - startTime
    result.totalItemsParsed = items.length
    
    if (items.length === 0) {
      result.error = 'No items returned from adapter'
      console.log(`   ⚠️  No items returned`)
      return result
    }
    
    console.log(`   📊 Retrieved ${items.length} items`)
    
    // Analyze fields
    result.canonicalFields = analyzeFields(items)
    result.originalMetadataAnalysis = analyzeOriginalMetadata(items)
    result.edgeCases = analyzeEdgeCases(items)
    
    // Count valid vs invalid items
    result.validItems = items.filter(item => 
      item.title && item.url && item.content && item.publishedAt && item.externalId
    ).length
    result.invalidItems = items.length - result.validItems
    
    // Collect missing and null fields
    const missingFields = result.canonicalFields.filter(f => f.coverage < 100).map(f => f.fieldName)
    const nullFields = result.canonicalFields.filter(f => f.nullCount > 0).map(f => f.fieldName)
    
    result.missingFields = missingFields
    result.nullFields = nullFields
    
    // Sample items for inspection
    result.sampleItems = items.slice(0, 3).map(item => ({
      title: item.title?.substring(0, 100) + '...',
      url: item.url,
      contentLength: item.content?.length || 0,
      publishedAt: item.publishedAt,
      tagCount: item.tags?.length || 0,
      hasOriginalMetadata: !!item.originalMetadata,
      originalMetadataKeys: item.originalMetadata ? Object.keys(item.originalMetadata).slice(0, 10) : []
    }))
    
    result.success = result.invalidItems === 0 && result.edgeCases.malformedItems.length === 0
    
    // Log detailed analysis
    console.log(`   ✅ Valid items: ${result.validItems}/${result.totalItemsParsed}`)
    console.log(`   📋 Field coverage:`)
    for (const field of result.canonicalFields) {
      const status = field.coverage === 100 ? '✅' : '❌'
      console.log(`      ${status} ${field.fieldName}: ${field.coverage}% (${field.nullCount} null, ${field.emptyCount} empty)`)
    }
    
    console.log(`   🏷️  Original metadata: ${result.originalMetadataAnalysis.totalFields} fields`)
    console.log(`      Common fields: ${result.originalMetadataAnalysis.commonFields.join(', ')}`)
    
    if (result.edgeCases.malformedItems.length > 0) {
      console.log(`   ⚠️  Edge cases found: ${result.edgeCases.malformedItems.length}`)
      result.edgeCases.malformedItems.slice(0, 5).forEach(issue => console.log(`      - ${issue}`))
    }
    
  } catch (error) {
    result.duration = Date.now() - startTime
    result.error = error instanceof Error ? error.message : String(error)
    result.success = false
    console.log(`   ❌ Error: ${result.error}`)
  }
  
  return result
}

async function testAdapterWithFixtures(adapter: AdapterConfig): Promise<AdapterTestResult | null> {
  if (!adapter.hasFixtures || !adapter.fixturePath) {
    return null
  }
  
  console.log(`\n🧪 Testing ${adapter.name} with FIXTURE DATA...`)
  
  const fixturesPath = path.join(__dirname, '../../tests/fixtures', adapter.fixturePath)
  
  if (!fs.existsSync(fixturesPath)) {
    console.log(`   ⚠️  Fixtures directory not found: ${fixturesPath}`)
    return null
  }
  
  const fixtureFiles = fs.readdirSync(fixturesPath).filter(f => f.endsWith('.xml') || f.endsWith('.html'))
  console.log(`   📁 Found ${fixtureFiles.length} fixture files`)
  
  // For now, just log that fixtures exist - implementing fixture testing would require
  // modifying each adapter to accept fixture data as input
  console.log(`   📋 Fixture files: ${fixtureFiles.join(', ')}`)
  console.log(`   ℹ️  Fixture testing requires adapter modifications - marking as TODO`)
  
  return null
}

async function attemptDatabaseIngestion(adapter: AdapterConfig, items: ParsedItem[], dryRun: boolean = true): Promise<{
  ingested: number
  skipped: number
  errored: number
  duplicates: number
}> {
  if (dryRun || items.length === 0) {
    return { ingested: 0, skipped: 0, errored: 0, duplicates: 0 }
  }
  
  let ingested = 0
  let skipped = 0
  let errored = 0
  let duplicates = 0
  
  try {
    // Apply semantic tagging
    const taggedItems = await tagStoriesWithEmbeddings(items)
    
    for (const item of taggedItems) {
      try {
        // Check for existing story by external ID
        const { data: existing, error: selectError } = await supabase
          .from('stories')
          .select('id')
          .eq('external_id', item.externalId)
          .single()
        
        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError
        }
        
        if (existing) {
          duplicates++
          skipped++
          continue
        }
        
        // Insert new story
        const { error: insertError } = await supabase
          .from('stories')
          .insert({
            title: item.title,
            url: item.url,
            content: item.content,
            published_at: item.publishedAt.toISOString(),
            tags: item.tags,
            external_id: item.externalId,
            original_metadata: item.originalMetadata,
            tagging_metadata: item.taggingMetadata,
            source_id: adapter.id
          })
        
        if (insertError) {
          throw insertError
        }
        
        ingested++
        
      } catch (error) {
        console.log(`      ❌ Failed to ingest item: ${error}`)
        errored++
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Tagging failed: ${error}`)
    errored = items.length
  }
  
  return { ingested, skipped, errored, duplicates }
}

async function comprehensiveE2ETest(options: { dryRun?: boolean; adapterFilter?: string[] } = {}): Promise<TestSummary> {
  const { dryRun = true, adapterFilter } = options
  
  console.log('🧪 COMPREHENSIVE END-TO-END ADAPTER TEST')
  console.log('=' + '='.repeat(60))
  console.log(`📅 Test run: ${DateTime.now().toISO()}`)
  console.log(`🎯 Testing ${adapterFilter ? adapterFilter.length : ADAPTERS.length} adapters`)
  console.log(`🏃 Mode: ${dryRun ? 'DRY RUN' : 'LIVE INGESTION'}`)
  console.log()
  
  const startTime = Date.now()
  const results: AdapterTestResult[] = []
  let totalItemsProcessed = 0
  let totalStoriesIngested = 0
  let totalStoriesSkipped = 0
  let totalAnomalies = 0
  
  const adaptersToTest = adapterFilter 
    ? ADAPTERS.filter(a => adapterFilter.includes(a.id))
    : ADAPTERS
  
  for (const adapter of adaptersToTest) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔬 TESTING: ${adapter.name} (${adapter.id})`)
    console.log(`${'='.repeat(80)}`)
    
    // Test with live data
    const liveResult = await testAdapterWithLiveData(adapter)
    results.push(liveResult)
    totalItemsProcessed += liveResult.totalItemsParsed
    
    // Test with fixtures if available
    const fixtureResult = await testAdapterWithFixtures(adapter)
    if (fixtureResult) {
      results.push(fixtureResult)
    }
    
    // Attempt database ingestion if not dry run
    if (!dryRun && liveResult.success && liveResult.totalItemsParsed > 0) {
      console.log(`\n💾 Attempting database ingestion...`)
      
      // Re-fetch items for ingestion
      try {
        const items = await adapter.fetch()
        const ingestionResult = await attemptDatabaseIngestion(adapter, items, false)
        
        liveResult.storiesIngested = ingestionResult.ingested
        liveResult.storiesSkipped = ingestionResult.skipped + ingestionResult.duplicates
        liveResult.storiesErrored = ingestionResult.errored
        liveResult.duplicatesFound = ingestionResult.duplicates
        
        totalStoriesIngested += ingestionResult.ingested
        totalStoriesSkipped += ingestionResult.skipped
        
        console.log(`   ✅ Ingested: ${ingestionResult.ingested}, Skipped: ${ingestionResult.skipped}, Errored: ${ingestionResult.errored}`)
        
      } catch (error) {
        console.log(`   ❌ Ingestion failed: ${error}`)
        liveResult.storiesErrored = liveResult.totalItemsParsed
      }
    }
    
    // Count anomalies
    totalAnomalies += liveResult.edgeCases.malformedItems.length
  }
  
  const testDuration = Date.now() - startTime
  
  // Generate comprehensive summary
  console.log(`\n\n${'='.repeat(80)}`)
  console.log(`📊 COMPREHENSIVE TEST SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const criticalFailures = failed.filter(r => ADAPTERS.find(a => a.id === r.adapterId)?.critical)
  
  const summary: TestSummary = {
    totalAdapters: adaptersToTest.length,
    successfulAdapters: successful.length,
    failedAdapters: failed.length,
    criticalFailures: criticalFailures.length,
    totalItemsProcessed,
    totalStoriesIngested,
    totalStoriesSkipped,
    totalAnomalies,
    testDuration,
    adaptersWithIssues: failed.map(r => r.adapterId)
  }
  
  console.log(`✅ Successful adapters: ${summary.successfulAdapters}/${summary.totalAdapters}`)
  console.log(`❌ Failed adapters: ${summary.failedAdapters}/${summary.totalAdapters}`)
  console.log(`⚠️  Critical failures: ${summary.criticalFailures}`)
  console.log(`📚 Total items processed: ${summary.totalItemsProcessed}`)
  console.log(`💾 Stories ingested: ${summary.totalStoriesIngested}`)
  console.log(`⏭️  Stories skipped: ${summary.totalStoriesSkipped}`)
  console.log(`🚨 Total anomalies: ${summary.totalAnomalies}`)
  console.log(`⏱️  Test duration: ${(summary.testDuration / 1000).toFixed(1)}s`)
  
  // Detailed breakdown by adapter
  console.log(`\n📋 DETAILED ADAPTER BREAKDOWN:`)
  console.log(`${'='.repeat(80)}`)
  
  for (const result of results) {
    const adapter = ADAPTERS.find(a => a.id === result.adapterId)
    const criticalFlag = adapter?.critical ? ' [CRITICAL]' : ''
    const status = result.success ? '✅' : '❌'
    
    console.log(`\n${status} ${result.adapterName}${criticalFlag}:`)
    console.log(`   📊 Items parsed: ${result.totalItemsParsed}`)
    console.log(`   ✅ Valid items: ${result.validItems}`)
    console.log(`   ❌ Invalid items: ${result.invalidItems}`)
    console.log(`   ⏱️  Duration: ${result.duration}ms`)
    
    if (result.storiesIngested !== undefined) {
      console.log(`   💾 Database: ${result.storiesIngested} ingested, ${result.storiesSkipped} skipped, ${result.storiesErrored} errored`)
    }
    
    if (result.missingFields.length > 0) {
      console.log(`   ⚠️  Missing fields: ${result.missingFields.join(', ')}`)
    }
    
    if (result.nullFields.length > 0) {
      console.log(`   🔍 Null fields: ${result.nullFields.join(', ')}`)
    }
    
    console.log(`   🏷️  Metadata: ${result.originalMetadataAnalysis.totalFields} fields (${result.originalMetadataAnalysis.commonFields.length} common)`)
    
    if (result.edgeCases.malformedItems.length > 0) {
      console.log(`   🚨 Anomalies: ${result.edgeCases.malformedItems.length}`)
      result.edgeCases.malformedItems.slice(0, 3).forEach(anomaly => 
        console.log(`      - ${anomaly}`)
      )
    }
    
    if (result.error) {
      console.log(`   💥 Error: ${result.error}`)
    }
  }
  
  // Final recommendations
  console.log(`\n🎯 PRODUCTION READINESS ASSESSMENT:`)
  console.log(`${'='.repeat(80)}`)
  
  if (summary.criticalFailures === 0 && summary.successfulAdapters === summary.totalAdapters) {
    console.log(`🎉 ALL SYSTEMS GO! Ready for production deployment.`)
  } else if (summary.criticalFailures === 0) {
    console.log(`⚠️  Minor issues detected but system operational. Monitor non-critical adapters.`)
  } else {
    console.log(`❌ CRITICAL FAILURES DETECTED! Production deployment not recommended.`)
    console.log(`   Fix these adapters: ${criticalFailures.map(r => r.adapterName).join(', ')}`)
  }
  
  console.log(`\n📋 Quick debugging guide:`)
  console.log(`   • Check network connectivity for timeout errors`)
  console.log(`   • Verify API endpoints haven't changed for fetch errors`)
  console.log(`   • Check HTML/XML structure for parse errors`)
  console.log(`   • Review logs above for specific field issues`)
  
  return summary
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--live')
  const adapterFilter = args.find(arg => arg.startsWith('--adapters='))?.split('=')[1]?.split(',')
  
  if (args.includes('--help')) {
    console.log(`
Usage: tsx comprehensive-adapter-e2e-test.ts [options]

Options:
  --live                Run live ingestion to database (default: dry run)
  --adapters=id1,id2    Test only specific adapters
  --help                Show this help

Examples:
  tsx comprehensive-adapter-e2e-test.ts                    # Dry run all adapters
  tsx comprehensive-adapter-e2e-test.ts --live             # Live ingestion all adapters
  tsx comprehensive-adapter-e2e-test.ts --adapters=aws,mit # Test only AWS and MIT
    `)
    return
  }
  
  try {
    await comprehensiveE2ETest({ dryRun, adapterFilter })
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { comprehensiveE2ETest, AdapterTestResult, TestSummary } 