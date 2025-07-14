// Fetch XML content with retries and proper error handling
export async function fetchXml(url: string, retries = 2): Promise<string> {
  const headers = {
    'User-Agent': 'DataGateBot/1.0 (+https://datagate.dev)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Cache-Control': 'no-cache'
  }

  let lastError: Error

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[fetchXml] Attempting to fetch ${url} (attempt ${attempt + 1}/${retries + 1})`)
      
      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('xml') && !contentType.includes('rss')) {
        console.warn(`[fetchXml] Warning: Content-Type "${contentType}" may not be XML for ${url}`)
      }

      const xml = await response.text()
      
      if (!xml.trim()) {
        throw new Error('Empty response body')
      }

      console.log(`[fetchXml] Successfully fetched ${xml.length} characters from ${url}`)
      return xml

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Handle abort errors
      if (lastError.name === 'AbortError') {
        lastError = new Error('Request timeout (30s)')
      }
      
      console.warn(`[fetchXml] Attempt ${attempt + 1} failed for ${url}:`, lastError.message)
      
      // Don't retry on 4xx errors (client errors)
      if (lastError.message.includes('HTTP 4')) {
        break
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        console.log(`[fetchXml] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(`fetchXml failed for ${url} after ${retries + 1} attempts: ${lastError!.message}`)
}
