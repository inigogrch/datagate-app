#!/usr/bin/env node

import dotenv from 'dotenv'

// Load environment variables BEFORE importing anything that uses them
dotenv.config({ path: '.env.local' })

import { IngestionAgent } from '@/lib/agents/ingestion-agent'

async function main() {
  console.log('Starting dbt Labs feed ingestion...')
  console.log('Time:', new Date().toISOString())
  
  const agent = new IngestionAgent()
  
  try {
    await agent.fetchAndIngestDbtFeed()
    console.log('Ingestion completed successfully')
  } catch (error) {
    console.error('Ingestion failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main as ingestDbtFeed } 