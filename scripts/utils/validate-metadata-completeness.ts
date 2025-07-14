#!/usr/bin/env tsx

// Load environment variables FIRST
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import { ParsedItem } from '../../lib/adapters/types'

// Import all adapters for validation
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

// Adapter registry
const ADAPTERS = {
  'arxiv': { name: 'arXiv AI/ML Papers', fetch: fetchArxiv },
  'google': { name: 'Google AI Research Blog', fetch: fetchGoogleResearch },
  'huggingface': { name: 'HuggingFace Papers', fetch: fetchHuggingFace },
  'microsoft': { name: 'Microsoft Excel & Power BI Blog', fetch: fetchMicrosoft },
  'openai': { name: 'OpenAI Official Blog', fetch: fetchOpenAI },
  'pypi': { name: 'PyPI Top Packages', fetch: fetchPyPI },
  'mit': { name: 'MIT Technology Review', fetch: fetchMIT },
  'aws': { name: 'AWS Big Data Blog', fetch: fetchAWS },
  'techcrunch': { name: 'TechCrunch', fetch: fetchTechCrunch },
  'tldr': { name: 'TLDR.tech', fetch: fetchTLDR },
  'mitsloan': { name: 'MIT Sloan Management Review', fetch: fetchMITSloan },
  'venturebeat': { name: 'VentureBeat', fetch: fetchVentureBeat },
  'arstechnica': { name: 'Ars Technica', fetch: fetchArsTechnica }
}

interface MetadataAnalysis {
  adapter: string
  adapterName: string
  totalItems: number
  sampleSize: number
  metadataFields: {
    field: string
    presence: number // percentage of items that have this field
    sampleValues: any[]
    dataTypes: string[]
  }[]
  criticalFields: {
    title: boolean
    url: boolean
    content: boolean
    publishedAt: boolean
    tags: boolean
    externalId: boolean
    originalMetadata: boolean
  }
  contentQuality: {
    avgWordCount: number
    avgCharCount: number
    minWordCount: number
    maxWordCount: number
    itemsWithShortContent: number
  }
  originalMetadataAnalysis: {
    totalFields: number
    commonFields: string[]
    uniqueFields: string[]
    rawDataPreserved: boolean
  }
}

async function analyzeAdapterMetadata(adapterId: string, adapterInfo: any): Promise<MetadataAnalysis> {
  console.log(`\n🔍 Analyzing ${adapterInfo.name}...`)
  
  try {
    // Fetch fresh data from adapter
    const items: ParsedItem[] = await adapterInfo.fetch()
    
    if (items.length === 0) {
      console.warn(`   ⚠️  No items returned from adapter`)
      return createEmptyAnalysis(adapterId, adapterInfo.name)
    }
    
    const sampleSize = Math.min(items.length, 5) // Analyze up to 5 items
    const sampleItems = items.slice(0, sampleSize)
    
    console.log(`   📊 Analyzing ${sampleSize} items (of ${items.length} total)`)
    
    // Analyze critical fields
    const criticalFields = {
      title: sampleItems.every((item: ParsedItem) => !!item.title),
      url: sampleItems.every((item: ParsedItem) => !!item.url),
      content: sampleItems.every((item: ParsedItem) => !!item.content),
      publishedAt: sampleItems.every((item: ParsedItem) => !!item.publishedAt),
      tags: sampleItems.every((item: ParsedItem) => Array.isArray(item.tags)),
      externalId: sampleItems.every((item: ParsedItem) => !!item.externalId),
      originalMetadata: sampleItems.every((item: ParsedItem) => !!item.originalMetadata)
    }
    
    // Analyze content quality
    const wordCounts = sampleItems.map((item: ParsedItem) => item.content?.split(/\s+/).length || 0)
    const charCounts = sampleItems.map((item: ParsedItem) => item.content?.length || 0)
    
    const contentQuality = {
      avgWordCount: Math.round(wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length),
      avgCharCount: Math.round(charCounts.reduce((a: number, b: number) => a + b, 0) / charCounts.length),
      minWordCount: Math.min(...wordCounts),
      maxWordCount: Math.max(...wordCounts),
      itemsWithShortContent: wordCounts.filter((count: number) => count < 50).length
    }
    
    // Analyze all metadata fields across all sample items
    const allFields = new Set<string>()
    const fieldPresence: Record<string, number> = {}
    const fieldSamples: Record<string, any[]> = {}
    const fieldTypes: Record<string, Set<string>> = {}
    
    sampleItems.forEach((item: ParsedItem) => {
      const flatItem = flattenObject(item)
      Object.keys(flatItem).forEach(field => {
        allFields.add(field)
        fieldPresence[field] = (fieldPresence[field] || 0) + 1
        
        if (!fieldSamples[field]) fieldSamples[field] = []
        if (!fieldTypes[field]) fieldTypes[field] = new Set()
        
        const value = flatItem[field]
        if (fieldSamples[field].length < 3) {
          fieldSamples[field].push(value)
        }
        fieldTypes[field].add(typeof value)
      })
    })
    
    const metadataFields = Array.from(allFields).map(field => ({
      field,
      presence: Math.round((fieldPresence[field] / sampleSize) * 100),
      sampleValues: fieldSamples[field] || [],
      dataTypes: Array.from(fieldTypes[field] || [])
    })).sort((a, b) => b.presence - a.presence)
    
    // Analyze originalMetadata specifically
    const originalMetadataAnalysis = analyzeOriginalMetadata(sampleItems)
    
    return {
      adapter: adapterId,
      adapterName: adapterInfo.name,
      totalItems: items.length,
      sampleSize,
      metadataFields,
      criticalFields,
      contentQuality,
      originalMetadataAnalysis
    }
    
  } catch (error) {
    console.error(`   ❌ Error analyzing ${adapterInfo.name}:`, error)
    return createEmptyAnalysis(adapterId, adapterInfo.name)
  }
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }
  }
  
  return flattened
}

function analyzeOriginalMetadata(items: any[]): any {
  const metadataItems = items.filter(item => item.originalMetadata)
  
  if (metadataItems.length === 0) {
    return {
      totalFields: 0,
      commonFields: [],
      uniqueFields: [],
      rawDataPreserved: false
    }
  }
  
  const allMetadataFields = new Set<string>()
  const fieldCounts: Record<string, number> = {}
  
  metadataItems.forEach(item => {
    Object.keys(item.originalMetadata).forEach(field => {
      allMetadataFields.add(field)
      fieldCounts[field] = (fieldCounts[field] || 0) + 1
    })
  })
  
  const commonFields = Array.from(allMetadataFields).filter(field => 
    fieldCounts[field] === metadataItems.length
  )
  
  const uniqueFields = Array.from(allMetadataFields).filter(field => 
    fieldCounts[field] === 1
  )
  
  // Check for raw data preservation
  const rawDataPreserved = metadataItems.some(item => 
    Object.keys(item.originalMetadata).some(key => 
      key.startsWith('raw_') || key.includes('raw')
    )
  )
  
  return {
    totalFields: allMetadataFields.size,
    commonFields,
    uniqueFields,
    rawDataPreserved
  }
}

function createEmptyAnalysis(adapterId: string, adapterName: string): MetadataAnalysis {
  return {
    adapter: adapterId,
    adapterName,
    totalItems: 0,
    sampleSize: 0,
    metadataFields: [],
    criticalFields: {
      title: false,
      url: false,
      content: false,
      publishedAt: false,
      tags: false,
      externalId: false,
      originalMetadata: false
    },
    contentQuality: {
      avgWordCount: 0,
      avgCharCount: 0,
      minWordCount: 0,
      maxWordCount: 0,
      itemsWithShortContent: 0
    },
    originalMetadataAnalysis: {
      totalFields: 0,
      commonFields: [],
      uniqueFields: [],
      rawDataPreserved: false
    }
  }
}

async function validateDatabaseMetadata(): Promise<void> {
  console.log('\n📊 VALIDATING DATABASE METADATA STORAGE')
  console.log('='.repeat(60))
  
  try {
    // Get sample stories from database
    const { data: stories, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('❌ Database query error:', error)
      return
    }
    
    if (!stories || stories.length === 0) {
      console.log('⚠️  No stories found in database')
      return
    }
    
    console.log(`📋 Analyzing ${stories.length} recent stories from database`)
    
    // Analyze metadata preservation in database
    const storiesWithOriginalMetadata = stories.filter(story => story.original_metadata)
    const storiesWithTaggingMetadata = stories.filter(story => story.tagging_metadata)
    const storiesWithEmbeddings = stories.filter(story => story.embedding)
    
    console.log(`\n📈 Database Metadata Statistics:`)
    console.log(`   Stories with original_metadata: ${storiesWithOriginalMetadata.length}/${stories.length} (${Math.round(storiesWithOriginalMetadata.length/stories.length*100)}%)`)
    console.log(`   Stories with tagging_metadata: ${storiesWithTaggingMetadata.length}/${stories.length} (${Math.round(storiesWithTaggingMetadata.length/stories.length*100)}%)`)
    console.log(`   Stories with embeddings: ${storiesWithEmbeddings.length}/${stories.length} (${Math.round(storiesWithEmbeddings.length/stories.length*100)}%)`)
    
    // Sample original metadata analysis
    if (storiesWithOriginalMetadata.length > 0) {
      console.log(`\n🔍 Sample Original Metadata Fields:`)
      const sampleStory = storiesWithOriginalMetadata[0]
      const metadataKeys = Object.keys(sampleStory.original_metadata || {})
      console.log(`   Total fields in sample: ${metadataKeys.length}`)
      console.log(`   Fields: ${metadataKeys.slice(0, 10).join(', ')}${metadataKeys.length > 10 ? '...' : ''}`)
    }
    
  } catch (error) {
    console.error('❌ Database validation error:', error)
  }
}

async function main() {
  console.log('🔬 METADATA COMPLETENESS VALIDATION')
  console.log('=' .repeat(60))
  console.log(`📅 Validation run: ${DateTime.now().toISO()}`)
  console.log(`🎯 Auditing ${Object.keys(ADAPTERS).length} data source adapters`)
  console.log()
  
  const startTime = Date.now()
  const analyses: MetadataAnalysis[] = []
  
  // Analyze each adapter
  for (const [adapterId, adapterInfo] of Object.entries(ADAPTERS)) {
    const analysis = await analyzeAdapterMetadata(adapterId, adapterInfo)
    analyses.push(analysis)
  }
  
  // Generate comprehensive report
  console.log('\n📋 METADATA COMPLETENESS REPORT')
  console.log('='.repeat(60))
  
  analyses.forEach(analysis => {
    console.log(`\n📦 ${analysis.adapterName}`)
    console.log(`   Items analyzed: ${analysis.sampleSize}/${analysis.totalItems}`)
    
    // Critical fields status
    const criticalIssues = Object.entries(analysis.criticalFields)
      .filter(([_, present]) => !present)
      .map(([field, _]) => field)
    
    if (criticalIssues.length === 0) {
      console.log(`   ✅ All critical fields present`)
    } else {
      console.log(`   ❌ Missing critical fields: ${criticalIssues.join(', ')}`)
    }
    
    // Content quality
    console.log(`   📝 Content: ${analysis.contentQuality.avgWordCount} avg words, ${analysis.contentQuality.itemsWithShortContent} short items`)
    
    // Metadata richness
    console.log(`   🏷️  Metadata: ${analysis.originalMetadataAnalysis.totalFields} fields, raw preserved: ${analysis.originalMetadataAnalysis.rawDataPreserved ? 'Yes' : 'No'}`)
    
    // Top metadata fields
    const topFields = analysis.metadataFields.slice(0, 5)
    if (topFields.length > 0) {
      console.log(`   🔝 Top fields: ${topFields.map(f => `${f.field}(${f.presence}%)`).join(', ')}`)
    }
  })
  
  // Summary statistics
  const totalItems = analyses.reduce((sum, a) => sum + a.totalItems, 0)
  const adaptersWithIssues = analyses.filter(a => 
    Object.values(a.criticalFields).some(present => !present) || 
    !a.originalMetadataAnalysis.rawDataPreserved
  )
  
  console.log('\n📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Total items available: ${totalItems}`)
  console.log(`⚠️  Adapters with issues: ${adaptersWithIssues.length}/${analyses.length}`)
  console.log(`🏆 Metadata completeness: ${Math.round((analyses.length - adaptersWithIssues.length) / analyses.length * 100)}%`)
  
  if (adaptersWithIssues.length > 0) {
    console.log(`\n❌ Adapters needing attention:`)
    adaptersWithIssues.forEach(a => {
      console.log(`   - ${a.adapterName}`)
    })
  }
  
  // Database validation
  await validateDatabaseMetadata()
  
  const duration = Date.now() - startTime
  console.log(`\n⏱️  Validation completed in ${(duration / 1000).toFixed(1)}s`)
}

// CLI handling
async function run() {
  try {
    await main()
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  run()
} 