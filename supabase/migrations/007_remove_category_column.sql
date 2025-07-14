-- Migration: Remove hardcoded category column
-- Date: 2025-07-13
-- Description: Remove row_category column from sources table as we now use flexible tagging

-- First, drop the story_analytics view that depends on row_category
DROP VIEW IF EXISTS story_analytics;

-- Remove the constraint if it exists
ALTER TABLE sources 
DROP CONSTRAINT IF EXISTS sources_row_category_check;

-- Remove the row_category column
ALTER TABLE sources 
DROP COLUMN IF EXISTS row_category;

-- Recreate the story_analytics view without row_category dependency
CREATE OR REPLACE VIEW story_analytics AS
SELECT
  s.id,
  s.source_id,
  s.title,
  s.url,
  s.published_at,
  src.name AS source_name,
  s.tags,
  jsonb_build_object(
    'adapter', s.tagging_metadata ->> 'adapter_name',
    'confidence', s.tagging_metadata ->> 'confidence_score',
    'rules', s.tagging_metadata ->> 'tag_categories_matched'
  ) AS tagging_details,
  array_length(s.tags, 1) AS tag_count
FROM stories s
LEFT JOIN sources src ON s.source_id = src.id;

-- Note: This migration removes the hardcoded categorization system
-- We now rely on content-based tagging for flexible categorization 