import { readFileSync } from 'fs'
import { join } from 'path'
import cheerio from 'cheerio'

// Mock the fetch function to use our fixture
global.fetch = jest.fn()

describe('Google Research Scraper', () => {
  let mockHtml: string
  
  beforeAll(() => {
    // Load the fixture HTML file
    const fixturePath = join(__dirname, 'fixtures', 'google-research', 'blog-homepage.html')
    mockHtml = readFileSync(fixturePath, 'utf-8')
  })
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    // Clean up any timers
    jest.useRealTimers()
  })
  
  describe('fetchAndParse', () => {
    it('should scrape blog posts from Google Research homepage', async () => {
      // Mock successful fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })
      
      // Mock timers to speed up rate limiting
      jest.useFakeTimers()
      
      // Import dynamically to ensure mocks are applied
      const { fetchAndParse } = await import('../packages/adapters/google-research-scraper')
      
      // Execute the function
      const promise = fetchAndParse()
      
      // Fast-forward the rate limiting timer
      jest.advanceTimersByTime(1000)
      
      const items = await promise
      
      // Verify results
      expect(items).toBeInstanceOf(Array)
      expect(items.length).toBeGreaterThan(0)
      
      // Verify each item has required fields
      items.forEach(item => {
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('url')
        expect(item).toHaveProperty('content')
        expect(item).toHaveProperty('publishedAt')
        expect(item).toHaveProperty('tags')
        expect(item).toHaveProperty('externalId')
        
        // Verify types
        expect(typeof item.title).toBe('string')
        expect(typeof item.url).toBe('string')
        expect(typeof item.content).toBe('string')
        expect(item.publishedAt).toBeInstanceOf(Date)
        expect(Array.isArray(item.tags)).toBe(true)
        expect(typeof item.externalId).toBe('string')
        
        // Verify content is not empty
        expect(item.title.trim()).toBeTruthy()
        expect(item.url.trim()).toBeTruthy()
        expect(item.content.trim()).toBeTruthy()
        expect(item.externalId.trim()).toBeTruthy()
        
        // Verify URL is absolute
        expect(item.url).toMatch(/^https?:\/\//)
        
        // Verify default tags are present
        expect(item.tags).toContain('research updates')
        expect(item.tags).toContain('google')
      })
      
      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://research.google/blog/',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'DataGate/1.0 (Research aggregator)'
          })
        })
      )
    })
    
    it('should handle empty results gracefully', async () => {
      // Mock HTML with no blog posts
      const emptyHtml = `
        <html>
          <head><title>Google Research Blog</title></head>
          <body>
            <div class="main">
              <p>No blog posts found</p>
            </div>
          </body>
        </html>
      `
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => emptyHtml
      })
      
      jest.useFakeTimers()
      
      const { fetchAndParse } = await import('../packages/adapters/google-research-scraper')
      
      const promise = fetchAndParse()
      jest.advanceTimersByTime(1000)
      
      const items = await promise
      
      expect(items).toBeInstanceOf(Array)
      expect(items.length).toBe(0)
    })
    
    it('should handle network errors', async () => {
      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      const { fetchAndParse } = await import('../packages/adapters/google-research-scraper')
      
      await expect(fetchAndParse()).rejects.toThrow(expect.stringContaining('Failed to fetch Google Research blog'))
    })
    
    it('should handle HTTP errors', async () => {
      // Mock 404 response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
      
      const { fetchAndParse } = await import('../packages/adapters/google-research-scraper')
      
      await expect(fetchAndParse()).rejects.toThrow(expect.stringContaining('HTTP 404: Not Found'))
    })
    
    it('should parse dates correctly', () => {
      // Test the date parsing logic directly
      const $ = cheerio.load(mockHtml)
      const dateElements = $('.glue-label.glue-spacer-1-bottom')
      
      expect(dateElements.length).toBeGreaterThan(0)
      
      // Test that at least one date matches the expected format
      let foundValidDate = false
      dateElements.each((_, element) => {
        const dateText = $(element).text().trim()
        if (dateText.match(/^[A-Za-z]+ \d{1,2}, \d{4}$/)) {
          foundValidDate = true
        }
      })
      
      expect(foundValidDate).toBe(true)
    })
    
    it('should extract tags correctly', () => {
      // Test that tags are extracted from cards
      const $ = cheerio.load(mockHtml)
      const cards = $('a.glue-card.not-glue')
      
      expect(cards.length).toBeGreaterThan(0)
      
      // Test that at least one card has tags
      let foundTags = false
      cards.each((_, element) => {
        const tagElements = $(element).find('.glue-card__link-list .not-glue.caption')
        if (tagElements.length > 0) {
          foundTags = true
        }
      })
      
      expect(foundTags).toBe(true)
    })
  })
}) 