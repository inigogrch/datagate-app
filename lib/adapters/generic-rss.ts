import { DateTime } from 'luxon'
import { createHash } from 'crypto'
import { ParsedItem, SourceConfig } from './types'
import { fetchXml, parseRss } from './utils'

// Generic RSS adapter for extracting RAW metadata only
// Processing, content extraction, and field sanitization handled by IngestionAgent
export async function fetchAndParseGenericRss(sourceConfig: Omit<SourceConfig, 'id'>): Promise<ParsedItem[]> {
  console.log(`[adapter:${sourceConfig.name}] Starting raw metadata extraction from ${sourceConfig.endpoint_url}`)
  
  try {
    // Fetch and parse RSS feed
    const xmlData = await fetchXml(sourceConfig.endpoint_url)
    const feed = await parseRss(xmlData)
    
    if (!feed?.items?.length) {
      console.warn(`[adapter:${sourceConfig.name}] No items found in RSS feed`)
      return []
    }

    console.log(`[adapter:${sourceConfig.name}] Found ${feed.items.length} raw items to process`)

    const items: ParsedItem[] = []
    const seenIds = new Set<string>()

    for (const item of feed.items) {
      try {
        // Extract basic required fields for ParsedItem interface
        const title = item.title?.trim() || 'Untitled'
        // Fix: ensure link is always a string
        let link = ''
        if (typeof item.link === 'string') {
          link = item.link.trim()
        } else if (item.link && typeof (item.link as any).value === 'string') {
          link = (item.link as any).value.trim()
        } else if (item.guid && typeof item.guid === 'string') {
          link = item.guid.trim()
        } else {
          link = ''
        }
        
        if (!link) {
          console.warn(`[adapter:${sourceConfig.name}] Skipping item without URL: ${title}`)
          continue
        }

        // Parse publication date
        let publishedAt: Date
        try {
          if (item.pubDate) {
            publishedAt = DateTime.fromJSDate(new Date(item.pubDate)).toJSDate()
          } else if (item.isoDate) {
            publishedAt = DateTime.fromISO(item.isoDate).toJSDate()
          } else {
            publishedAt = new Date()
          }
        } catch {
          publishedAt = new Date()
        }

        // Generate external ID for deduplication
        let externalId = ''
        if (item.guid) {
          if (typeof item.guid === 'string') {
            externalId = item.guid
          } else if (typeof (item.guid as any).value === 'string') {
            externalId = (item.guid as any).value
          } else if (typeof (item.guid as any)._ === 'string') {
            externalId = (item.guid as any)._
          }
        }
        if (!externalId) {
          externalId = createHash('sha256').update(link + title).digest('hex').slice(0, 16)
        }

        // Skip duplicates
        if (seenIds.has(externalId)) {
          console.log(`[adapter:${sourceConfig.name}] Skipping duplicate: ${title}`)
          continue
        }
        seenIds.add(externalId)

        // Extract ALL available raw content (no processing)
        const rawContent = item['content:encoded'] || item.content || item.description || item.summary || title

        // Create comprehensive original metadata object preserving EVERYTHING
        const originalMetadata = {
          // Basic RSS fields
          rss_title: item.title,
          rss_link: item.link,
          rss_guid: typeof item.guid === 'string' ? item.guid : (item.guid as any)?.value || (item.guid as any)?._,
          rss_pub_date: item.pubDate,
          rss_iso_date: item.isoDate,
          rss_description: item.description,
          rss_content_encoded: item['content:encoded'],
          rss_content: item.content,
          rss_summary: item.summary,
          rss_author: item.author,
          rss_creator: item['dc:creator'],
          rss_publisher: item['dc:publisher'],
          rss_categories: item.categories,
          
          // Media fields
          rss_enclosure: item.enclosure,
          rss_media_content: item['media:content'],
          rss_media_thumbnail: item['media:thumbnail'],
          rss_media_description: item['media:description'],
          rss_media_credit: item['media:credit'],
          rss_media_category: item['media:category'],
          rss_media_keywords: item['media:keywords'],
          
          // Extended RSS fields
          rss_comments: item.comments,
          rss_comment_rss: item.commentRss,
          rss_source: item.source,
          rss_language: item.language,
          
          // Dublin Core metadata
          dc_title: item['dc:title'],
          dc_creator: item['dc:creator'],
          dc_subject: item['dc:subject'],
          dc_description: item['dc:description'],
          dc_publisher: item['dc:publisher'],
          dc_contributor: item['dc:contributor'],
          dc_date: item['dc:date'],
          dc_type: item['dc:type'],
          dc_format: item['dc:format'],
          dc_identifier: item['dc:identifier'],
          dc_source: item['dc:source'],
          dc_language: item['dc:language'],
          dc_relation: item['dc:relation'],
          dc_coverage: item['dc:coverage'],
          dc_rights: item['dc:rights'],
          
          // Atom fields
          atom_id: item.id,
          atom_updated: item.updated,
          atom_published: item.published,
          atom_rights: item.rights,
          
          // Content namespace
          content_encoded: item['content:encoded'],
          
          // RSS feed metadata
          feed_title: feed.title,
          feed_description: feed.description,
          feed_link: feed.link,
          feed_language: feed.language,
          feed_last_build_date: feed.lastBuildDate,
          feed_managing_editor: (feed as any).managingEditor,
          feed_webmaster: (feed as any).webMaster,
          feed_generator: (feed as any).generator,
          feed_docs: (feed as any).docs,
          feed_ttl: (feed as any).ttl,
          feed_image: (feed as any).image,
          
          // Processing metadata
          extraction_timestamp: new Date().toISOString(),
          source_name: sourceConfig.name,
          source_type: sourceConfig.type,
          source_endpoint: sourceConfig.endpoint_url,
          adapter_version: 'raw-metadata-v1',
          
          // Preserve complete raw item
          raw_rss_item: item as any,
          raw_feed_metadata: {
            title: feed.title,
            description: feed.description,
            link: feed.link,
            language: feed.language,
            lastBuildDate: feed.lastBuildDate,
            managingEditor: (feed as any).managingEditor,
            webMaster: (feed as any).webMaster,
            generator: (feed as any).generator,
            docs: (feed as any).docs,
            ttl: (feed as any).ttl,
            image: (feed as any).image
          }
        }

        // Create minimal ParsedItem with ALL raw metadata preserved
        items.push({
          title,
          url: link,
          content: rawContent, // Raw content - no processing
          publishedAt,
          summary: undefined, // No summary generation
          author: undefined, // No field extraction
          image_url: undefined, // No image extraction
          story_category: undefined, // No categorization
          tags: [], // No tag generation
          externalId,
          originalMetadata
        })

      } catch (itemErr) {
        console.warn(`[adapter:${sourceConfig.name}] Error processing item:`, itemErr, item?.title || '[no title]')
        continue
      }
    }

    // Sort by publication date (newest first)
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    console.log(`[adapter:${sourceConfig.name}] Extracted ${items.length} raw items with complete metadata`)

    return items

  } catch (err) {
    console.error(`[adapter:${sourceConfig.name}] Fatal error during raw extraction:`, err)
    throw err
  }
}


