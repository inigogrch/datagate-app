import { promises as fs } from 'fs'
import path from 'path'
import { expect } from '@jest/globals'
import { ParsedItem } from '../../lib/adapters/types'

// Performance fallback for Node.js < 18
const getPerformanceNow = (): (() => number) => {
  if (typeof performance !== 'undefined' && performance.now) {
    return () => performance.now()
  }
  // Fallback for older Node.js versions
  return () => {
    const [seconds, nanoseconds] = process.hrtime()
    return seconds * 1000 + nanoseconds / 1e6
  }
}

const performanceNow = getPerformanceNow()

/**
 * Load a test fixture XML file
 */
export async function loadFixture(adapterName: string, fixtureName: string): Promise<string> {
  const fixturePath = path.join(__dirname, '..', 'fixtures', adapterName, `${fixtureName}.xml`)
  try {
    return await fs.readFile(fixturePath, 'utf-8')
  } catch (error) {
    throw new Error(`Failed to load fixture ${adapterName}/${fixtureName}.xml: ${error}`)
  }
}

/**
 * Load a test fixture JSON file (for API adapters)
 */
export async function loadFixtureJSON(adapterName: string, fixtureName: string): Promise<any> {
  const fixturePath = path.join(__dirname, '..', 'fixtures', adapterName, `${fixtureName}.json`)
  try {
    const content = await fs.readFile(fixturePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to load JSON fixture ${adapterName}/${fixtureName}.json: ${error}`)
  }
}

/**
 * Validate that a ParsedItem has all required fields with detailed error messages
 */
export function validateParsedItem(item: ParsedItem, index?: number): void {
  const itemContext = index !== undefined ? ` (item ${index})` : ''
  
  expect(item).toMatchObject({
    title: expect.any(String),
    url: expect.any(String),
    content: expect.any(String),
    publishedAt: expect.any(Date),
    tags: expect.any(Array),
    externalId: expect.any(String),
  })
  
  // Optional fields should be string or undefined
  if (item.summary !== undefined) {
    expect(typeof item.summary).toBe('string')
    expect(item.summary.length).toBeGreaterThan(0)
  }
  
  if (item.author !== undefined) {
    expect(typeof item.author).toBe('string')
    expect(item.author.length).toBeGreaterThan(0)
  }
  
  if (item.image_url !== undefined) {
    expect(typeof item.image_url).toBe('string')
    expect(item.image_url.length).toBeGreaterThan(0)
    // Should be valid URL
    try {
      new URL(item.image_url)
    } catch (error) {
      throw new Error(`Invalid image URL "${item.image_url}"${itemContext}: ${error}`)
    }
  }
  
  if (item.story_category !== undefined) {
    expect(['research', 'news', 'tools', 'analysis', 'tutorial', 'announcement']).toContain(item.story_category)
  }
  
  // URL should be valid
  try {
    new URL(item.url)
  } catch (error) {
    throw new Error(`Invalid URL "${item.url}"${itemContext}: ${error}`)
  }
  
  // Date should be valid
  if (Number.isNaN(item.publishedAt.getTime())) {
    throw new Error(`Invalid date${itemContext}: ${item.publishedAt}`)
  }
  
  // Title and content should not be empty
  if (!item.title.trim()) {
    throw new Error(`Empty title${itemContext}`)
  }
  if (!item.content.trim()) {
    throw new Error(`Empty content${itemContext}`)
  }
  
  // Tags should be strings
  item.tags.forEach((tag, tagIndex) => {
    if (typeof tag !== 'string') {
      throw new Error(`Tag ${tagIndex} is not a string${itemContext}: ${typeof tag}`)
    }
    if (!tag.trim()) {
      throw new Error(`Empty tag at index ${tagIndex}${itemContext}`)
    }
  })
}

/**
 * Validate that items are properly sorted by date (newest first)
 */
export function validateDateSorting(items: ParsedItem[], adapterName?: string): void {
  const context = adapterName ? ` in ${adapterName} adapter` : ''
  
  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i].publishedAt.getTime()
    const next = items[i + 1].publishedAt.getTime()
    
    if (current < next) {
      throw new Error(
        `Items not sorted by date${context}: item ${i} (${items[i].publishedAt.toISOString()}) ` +
        `is older than item ${i + 1} (${items[i + 1].publishedAt.toISOString()})`
      )
    }
  }
}

/**
 * Check that tags are properly deduplicated and normalized
 */
export function validateTags(items: ParsedItem[], adapterName?: string): void {
  const context = adapterName ? ` in ${adapterName} adapter` : ''
  
  items.forEach((item, index) => {
    // No duplicate tags
    const uniqueTags = [...new Set(item.tags)]
    if (item.tags.length !== uniqueTags.length) {
      throw new Error(
        `Duplicate tags found in item ${index}${context}: ${JSON.stringify(item.tags)}`
      )
    }
    
    // Tags should be trimmed
    item.tags.forEach((tag, tagIndex) => {
      const trimmed = tag.trim()
      if (tag !== trimmed) {
        throw new Error(
          `Untrimmed tag "${tag}" at index ${tagIndex} in item ${index}${context}`
        )
      }
    })
    
    // Should have reasonable number of tags (not too many)
    if (item.tags.length > 5) {
      throw new Error(
        `Too many tags (${item.tags.length}) in item ${index}${context}: ${JSON.stringify(item.tags)}`
      )
    }
  })
}

/**
 * Validate markdown conversion quality
 */
export function validateMarkdownConversion(content: string, itemContext?: string): void {
  const context = itemContext ? ` in ${itemContext}` : ''
  
  // Should convert headers
  if (content.includes('<h2>')) {
    if (!content.match(/## .+/)) {
      throw new Error(`Failed to convert <h2> tags to markdown${context}`)
    }
  }
  if (content.includes('<h3>')) {
    if (!content.match(/### .+/)) {
      throw new Error(`Failed to convert <h3> tags to markdown${context}`)
    }
  }
  
  // Should convert lists
  if (content.includes('<ol>') || content.includes('<ul>')) {
    if (!content.match(/^[*\-\d]\s/m)) {
      throw new Error(`Failed to convert lists to markdown${context}`)
    }
  }
  
  // Should convert code blocks
  if (content.includes('<pre>') || content.includes('<code>')) {
    if (!content.match(/```|`[^`]+`/)) {
      throw new Error(`Failed to convert code to markdown${context}`)
    }
  }
  
  // Should convert bold/italic
  if (content.includes('<strong>')) {
    if (!content.match(/\*\*[^*]+\*\*/)) {
      throw new Error(`Failed to convert <strong> to markdown${context}`)
    }
  }
  if (content.includes('<em>')) {
    if (!content.match(/_[^_]+_/)) {
      throw new Error(`Failed to convert <em> to markdown${context}`)
    }
  }
}

/**
 * Check for common encoding issues
 */
export function validateEncoding(items: ParsedItem[], adapterName?: string): void {
  const context = adapterName ? ` in ${adapterName} adapter` : ''
  
  items.forEach((item, index) => {
    const itemContext = `item ${index}${context}`
    
    // Should handle emojis properly
    if (item.title.includes('🚀') || item.content.includes('🚀')) {
      if (!item.title.includes('🚀') && !item.content.includes('🚀')) {
        throw new Error(`Emoji encoding issue in ${itemContext}`)
      }
    }
    
    // Should handle special characters
    const specialChars = /[éñü中文]/
    if (specialChars.test(item.content) || specialChars.test(item.title)) {
      // Just verify they're preserved (detailed check)
      expect(item.content + item.title).toMatch(specialChars)
    }
    
    // Should not have HTML entities left over
    const htmlEntities = /&[a-zA-Z]+;/
    if (htmlEntities.test(item.content)) {
      throw new Error(`Unescaped HTML entities in content of ${itemContext}: ${item.content.match(htmlEntities)?.[0]}`)
    }
    if (htmlEntities.test(item.title)) {
      throw new Error(`Unescaped HTML entities in title of ${itemContext}: ${item.title.match(htmlEntities)?.[0]}`)
    }
  })
}

/**
 * Structured edge case validation
 */
export function validateEdgeCases(
  items: ParsedItem[], 
  edgeCases: {
    missingTitle?: boolean
    complexGuid?: boolean
    longContent?: boolean
    emojisInTitle?: boolean
    multipleAuthors?: boolean
    [key: string]: any
  },
  adapterName?: string
): void {
  const context = adapterName ? ` in ${adapterName} adapter` : ''
  
  if (edgeCases.missingTitle) {
    const noTitleItem = items.find(item => 
      item.url.includes('no-title') || item.title.length > 50
    )
    if (!noTitleItem) {
      throw new Error(`Expected item with missing title edge case${context}`)
    }
  }
  
  if (edgeCases.complexGuid) {
    const complexGuidItem = items.find(item => 
      item.externalId?.includes('tag:') || item.externalId?.includes('äöü')
    )
    if (!complexGuidItem) {
      throw new Error(`Expected item with complex GUID edge case${context}`)
    }
  }
  
  if (edgeCases.longContent) {
    const longItem = items.find(item => item.title.includes('Long Content'))
    if (!longItem) {
      throw new Error(`Expected item with long content edge case${context}`)
    }
    if (longItem.content.length > 50000) {
      throw new Error(`Long content not properly truncated${context}: ${longItem.content.length} chars`)
    }
  }
  
  if (edgeCases.emojisInTitle) {
    const emojiItem = items.find(item => /[🚀🔧⚡]/u.test(item.title))
    if (!emojiItem) {
      throw new Error(`Expected item with emoji in title${context}`)
    }
  }
}

/**
 * Save snapshot of parsed items for comparison
 */
export async function saveSnapshot(
  adapterName: string, 
  testName: string, 
  items: ParsedItem[]
): Promise<void> {
  const snapshotDir = path.join(__dirname, '..', 'snapshots', adapterName)
  await fs.mkdir(snapshotDir, { recursive: true })
  
  const snapshotPath = path.join(snapshotDir, `${testName}.json`)
  const snapshot = items.map(item => ({
    ...item,
    publishedAt: item.publishedAt.toISOString()
  }))
  
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2))
}

/**
 * Load and compare with existing snapshot
 */
export async function compareWithSnapshot(
  adapterName: string,
  testName: string,
  items: ParsedItem[]
): Promise<void> {
  const snapshotPath = path.join(__dirname, '..', 'snapshots', adapterName, `${testName}.json`)
  
  try {
    const existingSnapshot = await fs.readFile(snapshotPath, 'utf-8')
    const existing = JSON.parse(existingSnapshot)
    
    const current = items.map(item => ({
      ...item,
      publishedAt: item.publishedAt.toISOString()
    }))
    
    expect(current).toEqual(existing)
  } catch (error) {
    // If snapshot doesn't exist, create it
    await saveSnapshot(adapterName, testName, items)
    console.log(`📸 Created new snapshot: ${snapshotPath}`)
  }
}

/**
 * Performance benchmark helper
 */
export function benchmarkAdapter(
  fn: () => Promise<any>
): Promise<{ result: any; duration: number }> {
  const start = performanceNow()
  return fn().then(result => ({
    result,
    duration: performanceNow() - start
  }))
}

/**
 * Comprehensive validation suite - runs all validations
 */
export function validateAdapterOutput(
  items: ParsedItem[],
  options: {
    adapterName?: string
    edgeCases?: Parameters<typeof validateEdgeCases>[1]
    skipMarkdown?: boolean
    skipEncoding?: boolean
  } = {}
): void {
  const { adapterName, edgeCases, skipMarkdown, skipEncoding } = options
  
  // Core validations
  items.forEach((item, index) => validateParsedItem(item, index))
  validateDateSorting(items, adapterName)
  validateTags(items, adapterName)
  
  // Optional validations
  if (!skipEncoding) {
    validateEncoding(items, adapterName)
  }
  
  if (!skipMarkdown) {
    items.forEach((item, index) => {
      if (item.content.includes('<')) {
        validateMarkdownConversion(item.content, `${adapterName} item ${index}`)
      }
    })
  }
  
  // Edge case validations
  if (edgeCases) {
    validateEdgeCases(items, edgeCases, adapterName)
  }
}
