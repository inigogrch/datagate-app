-- Reset Script: Complete Database Cleanup
-- Date: 2025-07-14  
-- Description: Drops all existing DataGate tables, views, functions, and indexes for clean migration
-- WARNING: This will delete ALL data! Use only for development or when explicitly resetting.

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Drop all views (order matters due to dependencies)
DROP VIEW IF EXISTS story_cards CASCADE;
DROP VIEW IF EXISTS story_analytics CASCADE;
DROP VIEW IF EXISTS stories_missing_embeddings CASCADE;
DROP VIEW IF EXISTS stories_missing_metadata CASCADE;
DROP VIEW IF EXISTS ranked_stories CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS search_stories_by_similarity(vector, float, int, text, uuid) CASCADE;

-- Drop all tables (order matters due to foreign keys)
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS sources CASCADE;

-- Drop any remaining indexes explicitly (in case they weren't dropped with tables)
DROP INDEX IF EXISTS stories_published_at_desc_idx CASCADE;
DROP INDEX IF EXISTS stories_source_id_idx CASCADE;
DROP INDEX IF EXISTS stories_story_category_idx CASCADE;
DROP INDEX IF EXISTS stories_author_idx CASCADE;
DROP INDEX IF EXISTS stories_title_text_idx CASCADE;
DROP INDEX IF EXISTS stories_content_text_idx CASCADE;
DROP INDEX IF EXISTS stories_tags_gin_idx CASCADE;
DROP INDEX IF EXISTS stories_original_metadata_gin_idx CASCADE;
DROP INDEX IF EXISTS stories_tagging_metadata_gin_idx CASCADE;
DROP INDEX IF EXISTS stories_embedding_cosine_idx CASCADE;
DROP INDEX IF EXISTS stories_source_published_idx CASCADE;
DROP INDEX IF EXISTS stories_category_published_idx CASCADE;
DROP INDEX IF EXISTS stories_published_at_idx CASCADE;
DROP INDEX IF EXISTS stories_source_idx CASCADE;
DROP INDEX IF EXISTS embeddings_embedding_idx CASCADE;
DROP INDEX IF EXISTS feedback_user_id_idx CASCADE;
DROP INDEX IF EXISTS feedback_story_id_idx CASCADE;
DROP INDEX IF EXISTS feedback_created_at_idx CASCADE;

-- Drop any custom types that might exist
DROP TYPE IF EXISTS story_category_enum CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Clean up any orphaned sequences
DROP SEQUENCE IF EXISTS stories_id_seq CASCADE;
DROP SEQUENCE IF EXISTS sources_id_seq CASCADE;
DROP SEQUENCE IF EXISTS feedback_id_seq CASCADE;
DROP SEQUENCE IF EXISTS embeddings_id_seq CASCADE;

-- Ensure extensions are available (will be needed for the new schema)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Clear any cached data
RESET ALL;

-- Analyze the database to update statistics
ANALYZE;