#!/usr/bin/env node

import dotenv from 'dotenv'
import { existsSync, readFileSync } from 'fs'

// Load environment variables
console.log('🔍 Debugging environment variables...\n')

// Check if .env.local exists
const envPath = '.env.local'
console.log(`1. Checking if ${envPath} exists:`, existsSync(envPath) ? '✅ Yes' : '❌ No')

if (existsSync(envPath)) {
  console.log('\n📄 Raw .env.local file contents:')
  console.log('-----------------------------------')
  try {
    const fileContents = readFileSync(envPath, 'utf8')
    console.log(fileContents)
  } catch (error) {
    console.error('Error reading file:', error)
  }
  console.log('-----------------------------------\n')
}

// Load the environment variables
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading .env.local:', result.error)
} else {
  console.log('✅ .env.local loaded successfully')
}

console.log('\n2. Environment variables (FULL VALUES):')
const envVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
]

envVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
      console.log(`${varName}: "${value}" (length: ${value.length})`)
    } else {
      console.log(`${varName}: ${value.substring(0, 20)}...${value.substring(value.length - 10)} (length: ${value.length})`)
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`)
  }
})

console.log('\n3. URL validation:')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl) {
  console.log(`Raw URL value: "${supabaseUrl}"`)
  console.log(`Trimmed URL: "${supabaseUrl.trim()}"`)
  console.log(`Length: ${supabaseUrl.length}`)
  
  try {
    new URL(supabaseUrl.trim())
    console.log('✅ Supabase URL is valid')
  } catch (error) {
    console.log('❌ Supabase URL is invalid:', (error as Error).message)
    console.log('   Expected format: https://your-project-id.supabase.co')
    console.log('   Make sure it starts with https:// and ends with .supabase.co')
  }
} else {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL is not set')
} 