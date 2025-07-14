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

interface PyPIPackageInfo {
  info: {
    name: string
    version: string
    summary: string
    description: string
    author: string
    author_email: string
    home_page: string
    project_urls?: Record<string, string>
    classifiers: string[]
    keywords: string
    license: string
    package_url: string
    project_url: string
    release_url: string
    requires_dist?: string[]
    requires_python?: string
    yanked: boolean
    yanked_reason?: string | null
  }
  releases: Record<string, Array<{
    upload_time: string
    upload_time_iso_8601: string
    filename: string
    url: string
    size: number
    python_version: string
    packagetype: string
    yanked: boolean
    yanked_reason?: string | null
  }>>
  urls: Array<{
    upload_time: string
    upload_time_iso_8601: string
    filename: string
    url: string
    size: number
    python_version: string
    packagetype: string
    yanked: boolean
    yanked_reason?: string | null
  }>
  last_serial: number
  vulnerabilities?: Array<{
    aliases: string[]
    details: string
    summary: string
    fixed_in: string[]
    id: string
    link: string
    source: string
    withdrawn?: string | null
  }>
}

async function fetchPackageInfo(packageName: string): Promise<PyPIPackageInfo> {
  const url = `https://pypi.org/pypi/${packageName}/json`
  
  try {
    console.log(`[PyPI Adapter] Fetching ${packageName} from ${url}`)
    
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
    return data
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[PyPI Adapter] Failed to fetch ${packageName}:`, errorMessage)
    throw new Error(`PyPI API failed for ${packageName}: ${errorMessage}`)
  }
}

function createItemFromRelease(packageInfo: PyPIPackageInfo, version: string): ParsedItem {
  const { info } = packageInfo
  const releaseFiles = packageInfo.releases[version] || []
  const latestFile = releaseFiles[0] // Use first file for upload time
  
  if (!latestFile) {
    throw new Error(`No release files found for ${info.name}@${version}`)
  }
  
  // Parse upload time - prefer ISO 8601 format
  const uploadTimeStr = latestFile.upload_time_iso_8601 || latestFile.upload_time
  const publishedAt = DateTime.fromISO(uploadTimeStr).toJSDate()
  if (!publishedAt || Number.isNaN(+publishedAt)) {
    throw new Error(`Invalid upload_time for ${info.name}@${version}: ${uploadTimeStr}`)
  }
  
  // Create content from package info
  const content = createPackageContent(info, version, releaseFiles)
  
  // Generate tags
  const tags = extractPackageTags(info)
  
  // Create version-specific URL to avoid duplicates
  const url = `https://pypi.org/project/${info.name}/${version}/`
  
  return {
    title: `${info.name} ${version} - ${info.summary}`,
    url,
    content,
    publishedAt,
    summary: info.summary || `Latest release of ${info.name} Python package`,
    author: info.author || info.author_email || undefined,
    image_url: '/lib/images/pypi_logo.jpg', // PyPI logo fallback
    story_category: 'tools',
    tags,
    externalId: `${info.name}@${version}`,
    originalMetadata: {
      // PyPI package metadata
      pypi_name: info.name,
      pypi_version: version,
      pypi_summary: info.summary,
      pypi_description: info.description,
      pypi_author: info.author,
      pypi_author_email: info.author_email,
      pypi_home_page: info.home_page,
      pypi_project_urls: info.project_urls,
      pypi_classifiers: info.classifiers,
      pypi_keywords: info.keywords,
      pypi_license: info.license,
      pypi_package_url: info.package_url,
      pypi_project_url: info.project_url,
      pypi_release_url: info.release_url,
      pypi_requires_dist: info.requires_dist,
      pypi_requires_python: info.requires_python,
      pypi_yanked: info.yanked,
      pypi_yanked_reason: info.yanked_reason,
      
      // Release file metadata
      pypi_release_files: releaseFiles,
      pypi_upload_time: latestFile.upload_time,
      pypi_upload_time_iso: latestFile.upload_time_iso_8601,
      pypi_file_size: latestFile.size,
      pypi_python_version: latestFile.python_version,
      pypi_package_type: latestFile.packagetype,
      
      // Processing metadata
      content_word_count: content.split(/\s+/).length,
      content_character_count: content.length,
      processing_timestamp: new Date().toISOString(),
      processing_source: 'PyPI API',
      
      // Content type
      source_name: 'PyPI Top Packages',
      content_type: 'package_release',
      package_ecosystem: 'python',
      
      // Raw package info for complete preservation
      raw_pypi_package_info: packageInfo
    }
  }
}

function createPackageContent(info: any, version: string, releaseFiles: any[]): string {
  const lines = [
    `# ${info.name} ${version}`,
    '',
    info.summary || 'Python package release',
    '',
    `**Version:** ${version}`,
    `**Author:** ${info.author || 'Unknown'}`,
    `**License:** ${info.license || 'Not specified'}`,
    ''
  ]
  
  // Add Python version requirements
  if (info.requires_python) {
    lines.push(`**Python Version:** ${info.requires_python}`, '')
  }
  
  // Add description if available (truncated)
  if (info.description && info.description !== info.summary) {
    const description = info.description.slice(0, 1000)
    lines.push('**Description:**', description, '')
  }
  
  // Add keywords
  if (info.keywords) {
    lines.push(`**Keywords:** ${info.keywords}`, '')
  }
  
  // Add dependency information
  if (info.requires_dist && info.requires_dist.length > 0) {
    lines.push('**Key Dependencies:**')
    info.requires_dist.slice(0, 5).forEach((dep: string) => {
      lines.push(`- ${dep}`)
    })
    lines.push('')
  }
  
  // Add release info with package types
  const packageTypes = [...new Set(releaseFiles.map(f => f.packagetype))].filter(Boolean)
  lines.push(`**Release Files:** ${releaseFiles.length} files`)
  if (packageTypes.length > 0) {
    lines.push(`**Package Types:** ${packageTypes.join(', ')}`)
  }
  lines.push('')
  
  // Add project URLs
  if (info.project_urls) {
    lines.push('**Project Links:**')
    Object.entries(info.project_urls).slice(0, 3).forEach(([key, url]) => {
      lines.push(`- [${key}](${url})`)
    })
    lines.push('')
  }
  
  // Add yanked status warning
  if (info.yanked) {
    lines.push('⚠️ **Warning:** This release has been yanked')
    if (info.yanked_reason) {
      lines.push(`**Reason:** ${info.yanked_reason}`)
    }
    lines.push('')
  }
  
  return lines.join('\n')
}

function extractPackageTags(info: any): string[] {
  const tags = ['python'] // Default tags
  
  // Add tags based on classifiers
  const classifiers = info.classifiers || []
  const lowerClassifiers = classifiers.join(' ').toLowerCase()
  
  if (lowerClassifiers.includes('machine learning') || lowerClassifiers.includes('artificial intelligence')) {
    tags.push('machine learning', 'ai')
  }
  if (lowerClassifiers.includes('data') || lowerClassifiers.includes('analytics')) {
    tags.push('data', 'analytics')
  }
  if (lowerClassifiers.includes('web') || lowerClassifiers.includes('framework')) {
    tags.push('web', 'framework')
  }
  if (lowerClassifiers.includes('visualization') || lowerClassifiers.includes('plotting')) {
    tags.push('visualization')
  }
  if (lowerClassifiers.includes('database') || lowerClassifiers.includes('sql')) {
    tags.push('database', 'sql')
  }
  
  // Add package-specific tags
  const packageName = info.name.toLowerCase()
  if (['pandas', 'numpy'].includes(packageName)) {
    tags.push('data science')
  }
  if (['flask', 'django', 'fastapi'].includes(packageName)) {
    tags.push('web development')
  }
  if (['tensorflow', 'torch', 'scikit-learn'].includes(packageName)) {
    tags.push('machine learning')
  }
  
  // Deduplicate and limit to 5 tags
  return [...new Set(tags)].slice(0, 5)
}

export async function fetchAndParse(): Promise<ParsedItem[]> {
  console.log(`[PyPI Adapter] Starting fetch for ${TOP_PACKAGES.length} packages`)
  
  const allItems: ParsedItem[] = []
  const seenIds = new Set<string>()
  
  for (const packageName of TOP_PACKAGES) {
    try {
      const packageInfo = await fetchPackageInfo(packageName)
      
      // Helper function to safely get upload time using ISO 8601 format
      const getUploadTime = (version: string): string => {
        const files = packageInfo.releases[version]
        if (!files || files.length === 0) return '1970-01-01T00:00:00Z'
        const firstFile = files[0]
        if (!firstFile) return '1970-01-01T00:00:00Z'
        
        // Prefer ISO 8601 format, fallback to regular upload_time, then default
        return firstFile.upload_time_iso_8601 || firstFile.upload_time || '1970-01-01T00:00:00Z'
      }
      
      // Get the latest few versions (limit to avoid too much data)
      const versions = Object.keys(packageInfo.releases)
        .filter(v => {
          const files = packageInfo.releases[v]
          // Only versions with files and not yanked
          return files && files.length > 0 && !files.some(f => f.yanked)
        })
        .sort((a, b) => {
          // Sort by upload time of first file in each version
          const aTime = getUploadTime(a)
          const bTime = getUploadTime(b)
          return bTime.localeCompare(aTime) // Newest first
        })
        .slice(0, 3) // Only latest 3 versions per package
      
      console.log(`[PyPI Adapter] ${packageName}: found ${versions.length} recent versions`)
      
      for (const version of versions) {
        try {
          const item = createItemFromRelease(packageInfo, version)
          
          // Deduplicate by external ID
          if (seenIds.has(item.externalId)) continue
          seenIds.add(item.externalId)
          
          allItems.push(item)
        } catch (versionError) {
          console.warn(`[PyPI Adapter] Skipping ${packageName}@${version}:`, versionError)
        }
      }
      
    } catch (packageError) {
      console.error(`[PyPI Adapter] Failed to process ${packageName}:`, packageError)
      // Continue with other packages
    }
  }
  
  // Sort by publish date (newest first)
  allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  
  console.log(`[PyPI Adapter] Successfully processed ${allItems.length} package releases`)
  
  return allItems
}

// Export config for registration in database
export { PYPI_CONFIG } 