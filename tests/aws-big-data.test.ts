import { fetchAndParse } from '../packages/adapters/aws-big-data'
import {
  loadFixture,
  validateParsedItem,
  validateDateSorting,
  validateTags,
  validateMarkdownConversion,
  validateEncoding,
  compareWithSnapshot,
  benchmarkAdapter
} from './utils/adapter-test-helpers'

// Mock the fetchXml utility
jest.mock('../lib/adapters/utils/fetchXml', () => ({
  fetchXml: jest.fn()
}))

import { fetchXml } from '../lib/adapters/utils/fetchXml'
const mockFetchXml = fetchXml as jest.MockedFunction<typeof fetchXml>

describe('AWS Big Data Blog Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console output for cleaner tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('🎯 Real-world feed structure', () => {
    it('should parse realistic AWS feed with all edge cases', async () => {
      const realisticXml = await loadFixture('aws-big-data', 'realistic-feed')
      mockFetchXml.mockResolvedValueOnce(realisticXml)

      const { result: items, duration } = await benchmarkAdapter(fetchAndParse)

      // Should parse all valid items (4 total, but we expect some edge cases)
      expect(items).toHaveLength(4)
      console.log(`⏱️  Parsing took ${duration.toFixed(2)}ms`)

      // Validate all items have required fields
      items.forEach(validateParsedItem)

      // Validate sorting (newest first)
      validateDateSorting(items)

      // Validate tag quality
      validateTags(items)

      // Validate encoding handling
      validateEncoding(items)

      // Check specific real-world items
      const mainPost = items.find(item => item.title.includes('SageMaker Unified Studio'))
      expect(mainPost).toBeDefined()
      expect(mainPost!.tags).toEqual(
        expect.arrayContaining(['tools frameworks', 'aws', 'analytics', 'data'])
      )

      // Should handle emoji in title
      const emojiPost = items.find(item => item.title.includes('��'))
      expect(emojiPost).toBeDefined()
      expect(emojiPost!.title).toContain('🔧')

      // Compare with snapshot
      await compareWithSnapshot('aws-big-data', 'realistic-feed', items)
    })

    it('should handle complex markdown conversion correctly', async () => {
      const realisticXml = await loadFixture('aws-big-data', 'realistic-feed')
      mockFetchXml.mockResolvedValueOnce(realisticXml)

      const items = await fetchAndParse()
      const mainPost = items.find(item => item.title.includes('SageMaker Unified Studio'))

      expect(mainPost).toBeDefined()
      
      // Validate markdown conversion
      validateMarkdownConversion(mainPost!.content)

      // Check specific conversions
      expect(mainPost!.content).toMatch(/## Solution overview/)
      expect(mainPost!.content).toMatch(/### Prerequisites/)
      expect(mainPost!.content).toMatch(/\*\*EMR Serverless\*\*/)
      expect(mainPost!.content).toMatch(/_Jupyter notebook_/)
      expect(mainPost!.content).toMatch(/```[\s\S]*?spark\.read\.parquet/)
      expect(mainPost!.content).toMatch(/> \*\*Note:\*\*/)
      
      // Should handle lists
      expect(mainPost!.content).toMatch(/1\. Create an/)
      expect(mainPost!.content).toMatch(/\* The action that triggered/)
    })
  })

  describe('🛡️ Edge cases and error handling', () => {
    it('should handle malformed feed gracefully', async () => {
      const malformedXml = await loadFixture('aws-big-data', 'malformed-feed')
      mockFetchXml.mockResolvedValueOnce(malformedXml)

      const items = await fetchAndParse()

      // Should get valid items only (2 valid out of 4 total)
      expect(items).toHaveLength(2)

      // Valid article should be present
      expect(items.find(item => item.title === 'Valid Article')).toBeDefined()

      // Article with no title should use description truncated as title
      const noTitleItem = items.find(item => item.url.includes('no-title'))
      expect(noTitleItem?.title).toContain('This description should become the title')

      // Invalid items should be skipped
      expect(items.find(item => item.title === 'Article with no link')).toBeUndefined()
      expect(items.find(item => item.title === 'Article with bad date')).toBeUndefined()

      // All remaining items should be valid
      items.forEach(validateParsedItem)
    })

    it('should handle network and parsing errors', async () => {
      // Network error
      mockFetchXml.mockRejectedValueOnce(new Error('HTTP 503 Service Unavailable'))
      await expect(fetchAndParse()).rejects.toThrow('HTTP 503 Service Unavailable')

      // Invalid XML
      mockFetchXml.mockResolvedValueOnce('not valid xml at all')
      await expect(fetchAndParse()).rejects.toThrow()

      // Empty response
      mockFetchXml.mockResolvedValueOnce('')
      await expect(fetchAndParse()).rejects.toThrow()
    })

    it('should handle content truncation correctly', async () => {
      const realisticXml = await loadFixture('aws-big-data', 'realistic-feed')
      mockFetchXml.mockResolvedValueOnce(realisticXml)

      const items = await fetchAndParse()
      
      // Find the long content item
      const longItem = items.find(item => item.title.includes('Extremely Long Content'))
      expect(longItem).toBeDefined()
      
      // Should be truncated at 50,000 chars
      expect(longItem!.content.length).toBeLessThanOrEqual(50000)
      
      // Should still be readable (not cut off mid-word)
      expect(longItem!.content).toMatch(/Lorem ipsum/)
    })

    it('should handle various GUID formats', async () => {
      const realisticXml = await loadFixture('aws-big-data', 'realistic-feed')
      mockFetchXml.mockResolvedValueOnce(realisticXml)

      const items = await fetchAndParse()

      // Different GUID types should be handled
      expect(items.find(item => item.externalId?.includes('https://'))).toBeDefined() // Permalink GUID
      expect(items.find(item => item.externalId === 'no-title-guid-12345')).toBeDefined() // Simple GUID
      expect(items.find(item => item.externalId?.includes('tag:aws.amazon.com'))).toBeDefined() // Complex GUID

      // All items should have external IDs
      items.forEach(item => {
        expect(item.externalId).toBeDefined()
        expect(item.externalId).toBeTruthy()
      })
    })
  })

  describe('🏷️ Tag extraction and categorization', () => {
    it('should extract AWS-specific technical tags', async () => {
      const techFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Building Serverless Analytics with AWS Lambda Python and SQL</title>
              <link>https://example.com/test</link>
              <description>Learn to build cloud analytics frameworks using AWS services, Python libraries, and SQL processing for big data applications</description>
              <content:encoded><![CDATA[
                <p>This post covers AWS Lambda, Python pandas, SQL analytics, and cloud data processing frameworks.</p>
              ]]></content:encoded>
              <pubDate>Mon, 01 Jan 2024 09:00:00 GMT</pubDate>
              <guid>tech-tags-test</guid>
            </item>
          </channel>
        </rss>`

      mockFetchXml.mockResolvedValueOnce(techFeed)
      const items = await fetchAndParse()

      expect(items).toHaveLength(1)
      expect(items[0].tags).toEqual(
        expect.arrayContaining([
          'tools frameworks',
          'aws', 
          'python',
          'sql',
          'analytics',
          'cloud'
        ])
      )

      // Should be deduplicated and limited
      expect(items[0].tags.length).toBeLessThanOrEqual(5)
      expect([...new Set(items[0].tags)]).toEqual(items[0].tags)
    })

    it('should handle case sensitivity and normalization', async () => {
      const caseFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>AWS AWS aws Python PYTHON python</title>
              <link>https://example.com/case</link>
              <description>Mixed case AWS and Python references</description>
              <pubDate>Mon, 01 Jan 2024 09:00:00 GMT</pubDate>
              <guid>case-test</guid>
            </item>
          </channel>
        </rss>`

      mockFetchXml.mockResolvedValueOnce(caseFeed)
      const items = await fetchAndParse()

      expect(items[0].tags).toContain('aws')
      expect(items[0].tags).toContain('python')
      
      // Should not have duplicates despite different cases
      const awsCount = items[0].tags.filter(tag => tag.toLowerCase() === 'aws').length
      const pythonCount = items[0].tags.filter(tag => tag.toLowerCase() === 'python').length
      expect(awsCount).toBe(1)
      expect(pythonCount).toBe(1)
    })
  })

  describe('📊 Performance and reliability', () => {
    it('should handle large feeds efficiently', async () => {
      // Create a large feed with many items
      const largeItems = Array.from({ length: 100 }, (_, i) => `
        <item>
          <title>AWS Article ${i + 1}</title>
          <link>https://aws.amazon.com/blogs/big-data/article-${i + 1}/</link>
          <description>Description for article ${i + 1}</description>
          <content:encoded><![CDATA[<p>Content for article ${i + 1} with AWS and analytics keywords.</p>]]></content:encoded>
          <pubDate>Mon, ${String(i + 1).padStart(2, '0')} Jan 2024 09:00:00 GMT</pubDate>
          <guid>article-${i + 1}</guid>
        </item>
      `).join('')

      const largeFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>AWS Big Data Blog</title>
            <link>https://aws.amazon.com/blogs/big-data/</link>
            <description>Large feed test</description>
            ${largeItems}
          </channel>
        </rss>`

      mockFetchXml.mockResolvedValueOnce(largeFeed)

      const { result: items, duration } = await benchmarkAdapter(fetchAndParse)

      expect(items).toHaveLength(100)
      expect(duration).toBeLessThan(5000) // Should parse 100 items in under 5 seconds

      // Should still be properly sorted
      validateDateSorting(items)
      
      // All items should be valid
      items.forEach(validateParsedItem)
    })

    it('should be resilient to partial failures', async () => {
      const mixedFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Good Article 1</title>
              <link>https://example.com/good1</link>
              <description>Valid article</description>
              <pubDate>Mon, 01 Jan 2024 09:00:00 GMT</pubDate>
              <guid>good-1</guid>
            </item>
            <item>
              <title>Bad Article - No Link</title>
              <description>This should be skipped</description>
              <pubDate>Mon, 01 Jan 2024 08:00:00 GMT</pubDate>
            </item>
            <item>
              <title>Good Article 2</title>
              <link>https://example.com/good2</link>
              <description>Another valid article</description>
              <pubDate>invalid-date</pubDate>
              <guid>bad-date</guid>
            </item>
            <item>
              <title>Good Article 3</title>
              <link>https://example.com/good3</link>
              <description>Final valid article</description>
              <pubDate>Sun, 31 Dec 2023 09:00:00 GMT</pubDate>
              <guid>good-3</guid>
            </item>
          </channel>
        </rss>`

      mockFetchXml.mockResolvedValueOnce(mixedFeed)
      const items = await fetchAndParse()

      // Should get 2 valid items (good-1 and good-3, bad ones skipped)
      expect(items).toHaveLength(2)
      expect(items.find(item => item.title === 'Good Article 1')).toBeDefined()
      expect(items.find(item => item.title === 'Good Article 3')).toBeDefined()
      
      // Invalid items should be skipped
      expect(items.find(item => item.title.includes('Bad Article'))).toBeUndefined()
      expect(items.find(item => item.title === 'Good Article 2')).toBeUndefined()
    })
  })
})
