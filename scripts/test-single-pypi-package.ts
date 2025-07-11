#!/usr/bin/env tsx

import { DateTime } from 'luxon'

// Simple test to verify PyPI API response structure
async function testSinglePackage() {
  console.log('🧪 Testing single PyPI package (pandas)...\n')
  
  try {
    const url = 'https://pypi.org/pypi/pandas/json'
    console.log(`📡 Fetching: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DataGate/1.0 (RSS aggregator)',
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Analyze the response structure
    console.log('📊 Response structure:')
    console.log(`   • Package name: ${data.info?.name}`)
    console.log(`   • Latest version: ${data.info?.version}`)
    console.log(`   • Summary: ${data.info?.summary}`)
    console.log(`   • Author: ${data.info?.author}`)
    console.log(`   • License: ${data.info?.license}`)
    console.log(`   • Requires Python: ${data.info?.requires_python}`)
    console.log(`   • Total releases: ${Object.keys(data.releases || {}).length}`)
    
    // Check upload time formats
    const latestVersion = data.info?.version
    if (latestVersion && data.releases?.[latestVersion]?.[0]) {
      const file = data.releases[latestVersion][0]
      console.log('\n⏰ Upload time formats:')
      console.log(`   • upload_time: ${file.upload_time}`)
      console.log(`   • upload_time_iso_8601: ${file.upload_time_iso_8601}`)
      console.log(`   • packagetype: ${file.packagetype}`)
      console.log(`   • yanked: ${file.yanked}`)
      
      // Test date parsing
      const uploadTime = file.upload_time_iso_8601 || file.upload_time
      const parsedDate = DateTime.fromISO(uploadTime)
      console.log(`   • Parsed date: ${parsedDate.toISO()}`)
      console.log(`   • Is valid: ${parsedDate.isValid}`)
    }
    
    // Check recent versions
    console.log('\n📦 Recent versions:')
    const versions = Object.keys(data.releases || {})
      .filter(v => data.releases[v].length > 0)
      .sort((a, b) => {
        const aTime = data.releases[a]?.[0]?.upload_time_iso_8601 || data.releases[a]?.[0]?.upload_time || '1970-01-01T00:00:00Z'
        const bTime = data.releases[b]?.[0]?.upload_time_iso_8601 || data.releases[b]?.[0]?.upload_time || '1970-01-01T00:00:00Z'
        return bTime.localeCompare(aTime)
      })
      .slice(0, 5)
    
    versions.forEach((version, i) => {
      const files = data.releases[version]
      const uploadTime = files[0]?.upload_time_iso_8601 || files[0]?.upload_time
      console.log(`   ${i + 1}. ${version} (${files.length} files) - ${uploadTime}`)
    })
    
    // Check project URLs
    if (data.info?.project_urls) {
      console.log('\n🔗 Project URLs:')
      Object.entries(data.info.project_urls).slice(0, 3).forEach(([key, url]) => {
        console.log(`   • ${key}: ${url}`)
      })
    }
    
    // Check dependencies
    if (data.info?.requires_dist) {
      console.log('\n📋 Dependencies:')
      data.info.requires_dist.slice(0, 5).forEach((dep: string) => {
        console.log(`   • ${dep}`)
      })
    }
    
    console.log('\n✅ PyPI API test completed successfully!')
    
  } catch (error) {
    console.error('❌ PyPI API test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  testSinglePackage()
} 