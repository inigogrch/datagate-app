#!/usr/bin/env node

import dotenv from 'dotenv'

// Load environment variables BEFORE importing anything that uses them
dotenv.config({ path: '.env.local' })

import { createAdminClient } from '@/lib/supabase/server'
import { OpenAI } from 'openai'

async function testSetup() {
  console.log('🔍 Testing DataGate setup...\n')
  
  let testsPass = true
  
  // Test 1: Environment variables
  console.log('1. Checking environment variables...')
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ]
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`   ❌ Missing: ${envVar}`)
      testsPass = false
    } else {
      console.log(`   ✅ Found: ${envVar}`)
    }
  }
  
  // Test 2: Supabase connection
  console.log('\n2. Testing Supabase connection...')
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('stories').select('count').limit(1)
    
    if (error) {
      console.error('   ❌ Supabase connection failed:', error.message)
      testsPass = false
    } else {
      console.log('   ✅ Supabase connection successful')
    }
  } catch (error) {
    console.error('   ❌ Supabase connection error:', error)
    testsPass = false
  }
  
  // Test 3: OpenAI connection
  console.log('\n3. Testing OpenAI connection...')
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const response = await openai.models.list()
    if (response.data.length > 0) {
      console.log('   ✅ OpenAI connection successful')
    } else {
      console.error('   ❌ OpenAI connection failed')
      testsPass = false
    }
  } catch (error) {
    console.error('   ❌ OpenAI connection error:', error)
    testsPass = false
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  if (testsPass) {
    console.log('✅ All tests passed! DataGate is ready to use.')
    console.log('\nNext steps:')
    console.log('1. Run "npm run ingest" to fetch dbt Labs posts')
    console.log('2. Run "npm run dev" to start the app')
  } else {
    console.log('❌ Some tests failed. Please check your setup.')
    console.log('\nRefer to SETUP.md for configuration instructions.')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  testSetup().catch(console.error)
} 