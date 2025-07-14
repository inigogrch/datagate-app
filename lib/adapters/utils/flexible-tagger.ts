import { ParsedItem, TaggingMetadata } from '../types';
import { performance } from 'perf_hooks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateEmbedding, getSemanticTags, initializePrototypeEmbeddings } from '../../ai/embeddings';

// Metrics interface for instrumentation
interface Metrics {
  histogram: (name: string, value: number, tags?: Record<string, string>) => void;
  counter: (name: string, increment?: number, tags?: Record<string, string>) => void;
}

// Mock metrics implementation (replace with actual metrics client)
const metrics: Metrics = {
  histogram: (name: string, value: number, tags?: Record<string, string>) => {
    console.log(`[METRICS] ${name}: ${value}ms`, tags || {});
  },
  counter: (name: string, increment = 1, tags?: Record<string, string>) => {
    console.log(`[METRICS] ${name}: +${increment}`, tags || {});
  }
};

// Strict typing for content-based tagging results
export interface ContentTaggingResult {
  tags: string[];
  metadata: TaggingMetadata;
  processingTimeMs: number;
}

// Enhanced tagging result with semantic similarity scores
export interface HybridTaggingResult extends ContentTaggingResult {
  semanticTags?: { tag: string; similarity: number }[];
  heuristicTags?: string[];
  embedding?: number[];
}

// Compiled tagging configuration for performance
interface CompiledTagConfig {
  version: string;
  confidenceThreshold: number;
  productionMode: boolean;
  maxTagsPerStory: number;
  tagCategories: Record<string, {
    description: string;
    tags: Record<string, string[]>; // tag -> keywords mapping
  }>;
  patterns: Record<string, RegExp>;
}

// Global compiled config cache
let COMPILED_CONFIG: CompiledTagConfig | null = null;
const MEMOIZATION_CACHE = new Map<string, ContentTaggingResult>();

// Load and compile content-based tagging configuration
function loadCompiledConfig(): CompiledTagConfig {
  if (COMPILED_CONFIG) return COMPILED_CONFIG;
  
  try {
    const configPath = join(__dirname, '../config/tagging-rules.json');
    const rawConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    
    // Precompile regex patterns for performance
    const patterns: Record<string, RegExp> = {};
    for (const [patternName, patternStr] of Object.entries(rawConfig.patterns)) {
      patterns[patternName] = new RegExp(patternStr as string, 'gi');
    }
    
    COMPILED_CONFIG = {
      version: rawConfig.version,
      confidenceThreshold: rawConfig.confidence_threshold,
      productionMode: rawConfig.production_mode,
      maxTagsPerStory: rawConfig.max_tags_per_story,
      tagCategories: rawConfig.tag_categories,
      patterns
    };
    
    console.log(`[ContentTagger] Loaded unified config v${COMPILED_CONFIG.version} with ${Object.keys(rawConfig.tag_categories).length} tag categories`);
    return COMPILED_CONFIG;
    
  } catch (error) {
    console.error('[ContentTagger] Failed to load unified config:', error);
    throw new Error('Failed to initialize unified content tagging configuration');
  }
}

// Content-based batch tagging with performance instrumentation
export async function tagStories(
  items: ParsedItem[],
  adapterName: string
): Promise<ParsedItem[]> {
  const start = performance.now();
  const config = loadCompiledConfig();
  const tagged: ParsedItem[] = [];
  
  console.log(`[${adapterName}] Starting content-based tagging of ${items.length} items...`);
  metrics.counter('content_tagger_batch_start', 1, { adapter: adapterName });

  for (const item of items) {
    try {
      const result = extractContentTags(item, adapterName, config);
      
      // Apply results to item
      item.tags = result.tags;
      item.taggingMetadata = result.metadata;
      
      tagged.push(item);
      
      // Record individual metrics
      metrics.histogram('content_tagger_latency_ms', result.processingTimeMs, { adapter: adapterName });
      metrics.counter('content_tagger_tags_extracted', result.tags.length, { adapter: adapterName });
      
    } catch (err) {
      console.error(`[${adapterName}] Error processing item ${item.externalId}:`, err);
      metrics.counter('content_tagger_error_count', 1, { adapter: adapterName });
      // Skip tagging but preserve original item with empty tags
      item.tags = [];
      tagged.push(item);
    }
  }

  const duration = performance.now() - start;
  const avgTime = items.length > 0 ? (duration / items.length).toFixed(2) : '0';
  
  console.log(`[${adapterName}] Tagged ${tagged.length}/${items.length} items in ${duration.toFixed(2)}ms (${avgTime}ms/item)`);
  metrics.histogram('content_tagger_batch_duration_ms', duration, { adapter: adapterName });
  
  // Log tag distribution for analysis
  const tagStats = tagged.reduce((acc, item) => {
    item.tags?.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`[${adapterName}] Tag distribution:`, tagStats);
  
  return tagged;
}

// Extract content-based tags using semantic analysis
function extractContentTags(
  item: ParsedItem,
  adapterName: string,
  config: CompiledTagConfig
): ContentTaggingResult {
  const start = performance.now();
  
  // Generate cache key for memoization
  const cacheKey = `${item.url}:${item.title.slice(0, 50)}`;
  const cached = MEMOIZATION_CACHE.get(cacheKey);
  if (cached) {
    return { ...cached, processingTimeMs: performance.now() - start };
  }
  
  // Normalize text for analysis (title gets extra weight)
  const text = (item.title + ' ' + item.title + ' ' + item.content).toLowerCase();
  const wordSet = new Set(text.split(/\s+/).map(word => word.replace(/[^\w]/g, '')));
  
  const extractedTags: string[] = [];
  const keywordsMatched: string[] = [];
  const patternsMatched: string[] = [];
  const categoriesMatched: string[] = [];
  const processingNotes: string[] = [];

  // Extract tags from each category
  for (const [categoryName, categoryConfig] of Object.entries(config.tagCategories)) {
    try {
      let categoryHasMatches = false;
      
      // Check each tag in this category
      for (const [tagName, keywords] of Object.entries(categoryConfig.tags)) {
        let tagMatches = 0;
        
        // Check if any keywords for this tag are present
        for (const keyword of keywords) {
          const normalizedKeyword = keyword.toLowerCase();
          if (wordSet.has(normalizedKeyword) || text.includes(normalizedKeyword)) {
            tagMatches++;
            keywordsMatched.push(keyword);
          }
        }
        
        // If we found matches for this tag, add it
        if (tagMatches > 0) {
          extractedTags.push(tagName);
          categoryHasMatches = true;
          processingNotes.push(`${tagName}: ${tagMatches} keyword matches`);
        }
      }
      
      if (categoryHasMatches) {
        categoriesMatched.push(categoryName);
      }
      
    } catch (error) {
      processingNotes.push(`Error processing category ${categoryName}: ${error}`);
      console.warn(`[${adapterName}] Category ${categoryName} processing error:`, error);
    }
  }
  
  // Check for special patterns (URLs, version numbers, etc.)
  try {
    for (const [patternName, pattern] of Object.entries(config.patterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        patternsMatched.push(patternName);
        
        // Add pattern-specific tags
        switch (patternName) {
          case 'version_numbers':
            extractedTags.push('release');
            break;
          case 'funding_amounts':
            extractedTags.push('startup', 'funding');
            break;
          case 'arxiv_papers':
            extractedTags.push('research', 'paper');
            break;
          case 'github_repos':
            extractedTags.push('open-source', 'github');
            break;
        }
      }
    }
  } catch (error) {
    processingNotes.push(`Error processing patterns: ${error}`);
  }

  // Remove duplicates and limit to max tags
  const uniqueTags = [...new Set(extractedTags)]
    .slice(0, config.maxTagsPerStory)
    .sort();

  const processingTimeMs = performance.now() - start;
  
  // Calculate confidence based on tag extraction quality
  const confidenceScore = uniqueTags.length > 0 
    ? Math.min(uniqueTags.length / config.maxTagsPerStory, 1.0)
    : 0;

  const metadata: TaggingMetadata = {
    adapter_name: adapterName,
    version: config.version,
    tags_found: uniqueTags.length,
    tag_categories_matched: categoriesMatched,
    keywords_matched: [...new Set(keywordsMatched)].slice(0, 10),
    patterns_matched: patternsMatched,
    confidence_score: confidenceScore,
    processing_time_ms: processingTimeMs,
    processing_notes: [
      `Analyzed ${text.length} chars in ${processingTimeMs.toFixed(2)}ms`,
      `Extracted ${uniqueTags.length}/${config.maxTagsPerStory} tags`,
      `Categories matched: ${categoriesMatched.join(', ')}`,
      ...processingNotes
    ].slice(0, 8) // Limit processing notes for performance
  };

  const result: ContentTaggingResult = {
    tags: uniqueTags,
    metadata,
    processingTimeMs
  };
  
  // Cache result for future use
  if (MEMOIZATION_CACHE.size < 1000) { // Prevent cache bloat
    MEMOIZATION_CACHE.set(cacheKey, result);
  }

  return result;
}

/**
 * Single-story content tagging with detailed logging
 * Useful for testing and debugging content extraction
 */
export function tagStoryContent(
  title: string,
  content: string,
  adapterName: string
): {
  tags: string[];
  taggingMetadata: TaggingMetadata;
} {
  // Create temporary ParsedItem for processing
  const tempItem: ParsedItem = {
    title,
    content,
    url: `temp-${Date.now()}`,
    publishedAt: new Date(),
    tags: [],
    externalId: `temp-${Date.now()}`
  };
  
  const config = loadCompiledConfig();
  const result = extractContentTags(tempItem, adapterName, config);
  
  console.log(`[${adapterName}] "${title.slice(0, 50)}..."`);
  console.log(`   🏷️  Tags (${result.tags.length}): [${result.tags.join(', ')}]`);
  console.log(`   📊 Confidence: ${((result.metadata.confidence_score || 0) * 100).toFixed(0)}%`);
  console.log(`   ⚡ Processing: ${result.processingTimeMs.toFixed(2)}ms`);
  console.log(`   📂 Categories: ${result.metadata.tag_categories_matched.join(', ')}`);

  return {
    tags: result.tags,
    taggingMetadata: result.metadata
  };
}

/**
 * Debug function to explain content tagging decisions
 * Disabled in production mode for performance
 */
export function explainContentTagging(
  title: string, 
  content: string, 
  adapterName: string
): {
  analysis: string[];
  tagBreakdown: Record<string, string[]>;
  suggestions: string[];
} {
  const config = loadCompiledConfig();
  
  // Skip detailed analysis in production mode
  if (config.productionMode) {
    return {
      analysis: ['🚀 Production mode: Detailed analysis disabled for performance'],
      tagBreakdown: {},
      suggestions: []
    };
  }
  
  const tempItem: ParsedItem = {
    title, content, url: `debug-${Date.now()}`, publishedAt: new Date(), tags: [], externalId: `debug-${Date.now()}`
  };
  
  const result = extractContentTags(tempItem, adapterName, config);
  
  const analysis = [
    `📊 CONTENT-BASED TAGGING ANALYSIS for "${title}"`,
    ``,
    `🔍 Content Analysis:`,
    `   • Text length: ${(title + content).length} characters`,
    `   • Processing time: ${result.processingTimeMs.toFixed(2)}ms`,
    `   • Tags extracted: ${result.tags.length}/${config.maxTagsPerStory}`,
    `   • Categories matched: ${result.metadata.tag_categories_matched.length}`,
    ``,
    `🏷️  Extracted Tags: [${result.tags.join(', ')}]`,
    `📂 Categories: ${result.metadata.tag_categories_matched.join(', ')}`,
    `🎯 Confidence: ${((result.metadata.confidence_score || 0) * 100).toFixed(0)}%`,
    `⚙️  Config Version: ${config.version}`,
    ``
  ];

  if (result.metadata.keywords_matched?.length) {
    analysis.push(`🔑 Keywords Matched: ${result.metadata.keywords_matched.slice(0, 10).join(', ')}`);
    analysis.push(``);
  }

  if (result.metadata.patterns_matched?.length) {
    analysis.push(`🎯 Patterns Matched: ${result.metadata.patterns_matched.join(', ')}`);
    analysis.push(``);
  }

  // Create tag breakdown by category
  const tagBreakdown: Record<string, string[]> = {};
  for (const categoryName of result.metadata.tag_categories_matched) {
    tagBreakdown[categoryName] = result.tags.filter(tag => 
      Object.keys(config.tagCategories[categoryName]?.tags || {}).includes(tag)
    );
  }

  return { 
    analysis, 
    tagBreakdown, 
    suggestions: [] // No suggestions in content-based version
  };
} 

// Hybrid content tagging combining heuristic and semantic approaches
async function extractHybridTags(
  item: ParsedItem,
  adapterName: string,
  config: CompiledTagConfig,
  useSemanticTagging: boolean = true
): Promise<HybridTaggingResult> {
  const start = performance.now();
  
  // First, get heuristic tags using existing logic
  const heuristicResult = extractContentTags(item, adapterName, config);
  
  // If semantic tagging is disabled, return heuristic results only
  if (!useSemanticTagging || config.productionMode === false) {
    return {
      ...heuristicResult,
      heuristicTags: heuristicResult.tags
    };
  }
  
  try {
    // Prepare content for semantic analysis (title weighted 2x)
    const semanticContent = `${item.title} ${item.title} ${item.content}`.slice(0, 8000);
    
    // Get semantic tags with similarity scores
    const semanticTagsWithScores = await getSemanticTags(
      semanticContent,
      config.confidenceThreshold || 0.7,
      config.maxTagsPerStory
    );
    
    // Generate embedding for storage
    const embedding = await generateEmbedding(semanticContent);
    
    // Merge heuristic and semantic tags
    const mergedTags = new Set<string>(heuristicResult.tags);
    const semanticTags: string[] = [];
    
    // Add semantic tags that meet threshold
    for (const { tag, similarity } of semanticTagsWithScores) {
      mergedTags.add(tag);
      semanticTags.push(tag);
    }
    
    // Convert to array and limit to max tags
    const finalTags = Array.from(mergedTags).slice(0, config.maxTagsPerStory);
    
    const processingTimeMs = performance.now() - start;
    
    // Enhanced metadata with semantic info
    const metadata: TaggingMetadata = {
      ...heuristicResult.metadata,
      processing_time_ms: processingTimeMs,
      processing_notes: [
        ...heuristicResult.metadata.processing_notes || [],
        `Semantic tags: ${semanticTags.length} found`,
        `Hybrid processing: ${processingTimeMs.toFixed(2)}ms`
      ].slice(0, 8)
    };
    
    return {
      tags: finalTags,
      metadata,
      processingTimeMs,
      heuristicTags: heuristicResult.tags,
      semanticTags: semanticTagsWithScores,
      embedding
    };
    
  } catch (error) {
    console.warn(`[${adapterName}] Semantic tagging failed, falling back to heuristic:`, error);
    
    // Fall back to heuristic-only tagging
    return {
      ...heuristicResult,
      heuristicTags: heuristicResult.tags,
      metadata: {
        ...heuristicResult.metadata,
        processing_notes: [
          ...heuristicResult.metadata.processing_notes || [],
          'Semantic tagging failed - using heuristic only'
        ].slice(0, 8)
      }
    };
  }
}

// Enhanced batch tagging with hybrid approach
export async function tagStoriesWithEmbeddings(
  items: ParsedItem[],
  adapterName: string,
  useSemanticTagging: boolean = true
): Promise<ParsedItem[]> {
  const start = performance.now();
  const config = loadCompiledConfig();
  const tagged: ParsedItem[] = [];
  
  // Initialize prototype embeddings if using semantic tagging
  if (useSemanticTagging && config.productionMode) {
    try {
      await initializePrototypeEmbeddings();
    } catch (error) {
      console.error(`[${adapterName}] Failed to initialize prototype embeddings:`, error);
      useSemanticTagging = false;
    }
  }
  
  console.log(`[${adapterName}] Starting ${useSemanticTagging ? 'hybrid' : 'heuristic-only'} tagging of ${items.length} items...`);
  metrics.counter('hybrid_tagger_batch_start', 1, { adapter: adapterName, mode: useSemanticTagging ? 'hybrid' : 'heuristic' });

  for (const item of items) {
    try {
      const result = await extractHybridTags(item, adapterName, config, useSemanticTagging);
      
      // Apply results to item
      item.tags = result.tags;
      item.taggingMetadata = result.metadata;
      
      // Store embedding if available (caller should persist this)
      if (result.embedding) {
        (item as any).embedding = result.embedding;
      }
      
      tagged.push(item);
      
      // Record individual metrics
      metrics.histogram('hybrid_tagger_latency_ms', result.processingTimeMs, { adapter: adapterName, mode: useSemanticTagging ? 'hybrid' : 'heuristic' });
      
      // Count semantic tags found
      if (result.semanticTags && result.semanticTags.length > 0) {
        metrics.counter('semantic_tags_extracted', result.semanticTags.length, { adapter: adapterName });
      }
      
    } catch (err) {
      console.error(`[${adapterName}] Error processing item ${item.externalId}:`, err);
      metrics.counter('hybrid_tagger_error_count', 1, { adapter: adapterName });
      // Skip tagging but preserve original item with basic tags
      item.tags = item.tags || [];
      tagged.push(item);
    }
  }

  const duration = performance.now() - start;
  const avgTime = items.length > 0 ? (duration / items.length).toFixed(2) : '0';
  
  console.log(`[${adapterName}] Tagged ${tagged.length}/${items.length} items in ${duration.toFixed(2)}ms (${avgTime}ms/item)`);
  metrics.histogram('hybrid_tagger_batch_duration_ms', duration, { adapter: adapterName });
  
  // Log tag distribution for analysis
  const tagStats = tagged.reduce((acc, item) => {
    item.tags?.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`[${adapterName}] Tag distribution:`, tagStats);
  
  return tagged;
} 