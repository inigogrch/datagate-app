-- Preserve raw feed/API metadata for replay and future reclassification
ALTER TABLE stories
  ADD COLUMN original_metadata JSONB,
  ADD COLUMN tagging_metadata JSONB DEFAULT '{}'::JSONB;

-- Indexes for efficient querying
-- GIN index on tags array
CREATE INDEX idx_stories_tags_gin ON stories USING GIN (tags);
-- Expression indexes on JSONB tagging_metadata fields
CREATE INDEX idx_tagging_adapter ON stories ((tagging_metadata ->> 'adapter_name'));
CREATE INDEX idx_tagging_confidence ON stories (((tagging_metadata ->> 'confidence_score')::NUMERIC));

-- Comments explaining flexible approach
COMMENT ON COLUMN stories.original_metadata IS
  'Raw feed/API payload for replay and reclassification.';
COMMENT ON COLUMN stories.tagging_metadata IS
  'Metadata on tagging: rules fired, confidence scores, adapter provenance.';

-- Lean analytics view for dashboards and experimentation
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