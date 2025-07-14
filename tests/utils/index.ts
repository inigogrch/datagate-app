// Test utilities for adapter testing
// Clean imports: import { loadFixture, validateAdapterOutput } from '../utils'

import { expect } from '@jest/globals'
import { 
  validateAdapterOutput, 
  compareWithSnapshot, 
  benchmarkAdapter 
} from './adapter-test-helpers'

export {
  // Fixture loaders
  loadFixture,
  loadFixtureJSON,
  
  // Validation helpers
  validateParsedItem,
  validateDateSorting,
  validateTags,
  validateMarkdownConversion,
  validateEncoding,
  validateEdgeCases,
  validateAdapterOutput,
  
  // Snapshot testing
  saveSnapshot,
  compareWithSnapshot,
  
  // Performance testing
  benchmarkAdapter
} from './adapter-test-helpers'

// Integration test helper
export async function testLiveFeed(
  adapterFn: () => Promise<any>,
  adapterName: string,
  options: {
    minItems?: number
    maxDuration?: number
    skipSnapshot?: boolean
  } = {}
): Promise<void> {
  const { minItems = 1, maxDuration = 10000, skipSnapshot = false } = options
  
  const { result: items, duration } = await benchmarkAdapter(adapterFn)
  
  // Basic checks
  expect(items.length).toBeGreaterThanOrEqual(minItems)
  expect(duration).toBeLessThan(maxDuration)
  
  // Full validation
  validateAdapterOutput(items, { adapterName })
  
  // Optional snapshot
  if (!skipSnapshot) {
    await compareWithSnapshot(adapterName, 'live-feed', items)
  }
  
  console.log(`🌐 Live feed test passed: ${items.length} items in ${duration.toFixed(2)}ms`)
}
