import { SourceConfig, ParsedItem } from '../../lib/adapters/types'
import { DateTime } from 'luxon'

// PyPI Top Packages specific configuration
const PYPI_CONFIG: Omit<SourceConfig, 'id'> = {
  name: 'PyPI Top Packages',
  type: 'api',
  endpoint_url: 'https://pypi.org/pypi/', // Base URL, package names will be appended
  fetch_freq_min: 180
}

// Top Python packages to monitor for new releases
const TOP_PACKAGES = [
  'pandas',        // Data analysis
  'numpy',         // Numerical computing
  'scikit-learn',  // Machine learning
  'matplotlib',    // Data visualization
  'seaborn',       // Statistical visualization
  'jupyter',       // Interactive computing
  'flask',         // Web framework
  'django',        // Web framework
  'requests',      // HTTP library
  'tensorflow',    // Machine learning
  'torch',         // Machine learning (PyTorch)
  'sqlalchemy',    // Database toolkit
  'fastapi',       // Modern web framework
  'streamlit',     // Data app framework
  'plotly',        // Interactive visualization
]

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log('[PyPI Adapter] Starting raw metadata extraction for PyPI packages')
  
  try {
    const items: ParsedItem[] = []
    
    console.log(`[PyPI Adapter] Fetching raw metadata for ${TOP_PACKAGES.length} packages`)
    
    for (const packageName of TOP_PACKAGES) {
      try {
        const packageUrl = `${PYPI_CONFIG.endpoint_url}${packageName}/json`
        console.log(`[PyPI Adapter] Fetching ${packageName} from ${packageUrl}`)
        
        const response = await fetch(packageUrl)
    if (!response.ok) {
          console.warn(`[PyPI Adapter] Failed to fetch ${packageName}: ${response.status}`)
          continue
        }
        
        const packageData = await response.json()
        
        // Extract all releases (not just latest)
        const releases = packageData.releases || {}
        const releaseVersions = Object.keys(releases)
          .filter(version => releases[version].length > 0) // Only versions with files
          .sort((a, b) => {
            // Basic version sorting (newest first)
            try {
              const aParts = a.split('.').map(n => parseInt(n) || 0)
              const bParts = b.split('.').map(n => parseInt(n) || 0)
              
              for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aDiff = (aParts[i] || 0) - (bParts[i] || 0)
                if (aDiff !== 0) return -aDiff // Negative for descending
              }
              return 0
            } catch {
              return b.localeCompare(a)
            }
          })
          .slice(0, 3) // Take only 3 most recent versions
        
        console.log(`[PyPI Adapter] ${packageName}: found ${releaseVersions.length} recent versions`)
        
        for (const version of releaseVersions) {
          const releaseFiles = releases[version]
          if (!releaseFiles || releaseFiles.length === 0) continue
          
          // Use the upload time from the first file as the release date
          const firstFile = releaseFiles[0]
          const uploadTime = firstFile.upload_time || firstFile.upload_time_iso_8601
          
          let publishedAt: Date
          try {
            publishedAt = uploadTime ? DateTime.fromISO(uploadTime).toJSDate() : new Date()
          } catch {
            publishedAt = new Date()
          }
          
          // Create external ID for this package version
          const externalId = `pypi-${packageName}-${version}`
          
          const title = `${packageData.info.name} ${version}`
          const url = `https://pypi.org/project/${packageName}/${version}/`
          
          // Store ALL raw PyPI metadata
          const originalMetadata = {
            // Complete package info
            pypi_package_info: packageData.info,
            pypi_urls: packageData.urls,
            pypi_vulnerabilities: packageData.vulnerabilities,
            pypi_last_serial: packageData.last_serial,
            
            // Release-specific data
            pypi_release_version: version,
            pypi_release_files: releaseFiles,
            pypi_release_upload_time: uploadTime,
            pypi_release_first_file: firstFile,
            
            // All releases for context
            pypi_all_releases: releases,
            pypi_recent_versions: releaseVersions,
            
            // Extraction metadata
            extraction_timestamp: new Date().toISOString(),
            source_name: PYPI_CONFIG.name,
            source_type: PYPI_CONFIG.type,
            source_endpoint: packageUrl,
            adapter_version: 'raw-metadata-v1',
            
            // Package context
            platform: 'pypi',
            package_ecosystem: 'python',
            content_type: 'package_release',
            package_name: packageName,
            version_number: version
          }
          
          items.push({
            title,
            url,
            content: JSON.stringify(packageData.info.description || packageData.info.summary || '', null, 2), // Raw description as content
            publishedAt,
            summary: undefined, // No summary generation
            author: undefined, // No field extraction
            image_url: undefined, // No image processing
            story_category: undefined, // No categorization
            tags: [], // No tag generation
            externalId,
            originalMetadata
          })
      }
      
    } catch (packageError) {
        console.warn(`[PyPI Adapter] Error processing package ${packageName}:`, packageError)
        continue
    }
  }
  
  // Sort by publish date (newest first)
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[PyPI Adapter] Successfully extracted ${items.length} raw package releases`)
  
    return items
  
  } catch (error) {
    console.error('[PyPI Adapter] Error extracting raw metadata:', error)
    throw error
  }
}

// Export config for registration in database
export { PYPI_CONFIG } 