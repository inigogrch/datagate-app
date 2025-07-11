#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

// Create Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addExternalIdColumn() {
  console.log('🔄 Adding external_id column to stories table...\n')
  
  try {
    // Check if external_id column already exists
    console.log('🔍 Checking current table structure...')
    const { data: columns, error: columnError } = await supabase
      .from('stories')
      .select('*')
      .limit(1)
    
    if (columnError) {
      console.error('❌ Failed to query stories table:', columnError)
      return
    }
    
    console.log('✅ Stories table accessible')
    
    // Try to add the column (this will fail if it already exists, which is fine)
    console.log('\n📝 Adding external_id column...')
    
    // We'll use a direct SQL approach through a stored procedure call
    const addColumnSQL = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='stories' AND column_name='external_id'
        ) THEN
          ALTER TABLE stories ADD COLUMN external_id TEXT;
          CREATE INDEX IF NOT EXISTS stories_external_id_idx ON stories(external_id);
          CREATE UNIQUE INDEX IF NOT EXISTS stories_source_external_id_unique_idx 
            ON stories(source_id, external_id) 
            WHERE external_id IS NOT NULL;
          RAISE NOTICE 'external_id column added successfully';
        ELSE
          RAISE NOTICE 'external_id column already exists';
        END IF;
      END $$;
    `
    
    // Since Supabase doesn't allow direct SQL execution via the client,
    // let's try a workaround by creating a test record with external_id
    console.log('🧪 Testing if external_id column exists...')
    
    const { error: testError } = await supabase
      .from('stories')
      .insert({
        title: 'test-external-id-column',
        url: 'https://test-external-id.com',
        source_id: '00000000-0000-0000-0000-000000000000', // This will fail due to foreign key, but that's fine
        external_id: 'test-external-id'
      })
    
    if (testError) {
      if (testError.message.includes('external_id')) {
        console.log('❌ external_id column does not exist. Manual migration needed.')
        console.log('\n📋 Please run this SQL in your Supabase SQL editor:')
        console.log('---')
        console.log(`-- Add external_id column to stories table
ALTER TABLE stories ADD COLUMN external_id TEXT;

-- Create index for external_id lookups
CREATE INDEX stories_external_id_idx ON stories(external_id);

-- Create unique constraint on (source_id, external_id) to prevent duplicates
CREATE UNIQUE INDEX stories_source_external_id_unique_idx 
ON stories(source_id, external_id) 
WHERE external_id IS NOT NULL;`)
        console.log('---')
        console.log('\n🔗 Go to: https://supabase.com/dashboard/project/qwrmxxlgbhechjsnrdsj/sql')
        
      } else if (testError.message.includes('foreign key')) {
        // This means external_id column exists but the source_id is invalid
        console.log('✅ external_id column already exists!')
        
        // Clean up the test record if it was created
        await supabase
          .from('stories')
          .delete()
          .eq('title', 'test-external-id-column')
          
      } else {
        console.error('❌ Unexpected error:', testError.message)
      }
    } else {
      console.log('✅ external_id column exists and working!')
      
      // Clean up the test record
      await supabase
        .from('stories')
        .delete()
        .eq('title', 'test-external-id-column')
    }
    
  } catch (error) {
    console.error('❌ Migration check failed:', error)
  }
}

if (require.main === module) {
  addExternalIdColumn()
} 