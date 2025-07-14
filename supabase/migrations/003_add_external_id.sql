-- Add external_id column to stories table for deduplication
ALTER TABLE stories ADD COLUMN external_id TEXT;

-- Create index for external_id lookups (used for deduplication)
CREATE INDEX stories_external_id_idx ON stories(external_id);

-- Create unique constraint on (source_id, external_id) to prevent duplicates
-- Note: We allow NULL external_id for existing stories that don't have this field
CREATE UNIQUE INDEX stories_source_external_id_unique_idx 
ON stories(source_id, external_id) 
WHERE external_id IS NOT NULL;

-- Comment explaining the external_id field
COMMENT ON COLUMN stories.external_id IS 'Unique identifier from the source (e.g., RSS GUID, API ID, package@version). Used for deduplication.'; 