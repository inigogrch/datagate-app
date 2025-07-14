-- Enable pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to stories table  
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for efficient similarity search
CREATE INDEX IF NOT EXISTS stories_embedding_idx ON stories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add embedding metadata columns
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP WITH TIME ZONE;

-- Create function to search stories by similarity
CREATE OR REPLACE FUNCTION search_stories_by_similarity(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  url text,
  content text,
  published_at timestamp with time zone,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.url,
    s.content,
    s.published_at,
    s.tags,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM stories s
  WHERE s.embedding IS NOT NULL
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create view for stories with missing embeddings
CREATE OR REPLACE VIEW stories_missing_embeddings AS
SELECT 
  id,
  title,
  source_id,
  published_at,
  created_at
FROM stories
WHERE embedding IS NULL
ORDER BY published_at DESC;

-- Add comment
COMMENT ON COLUMN stories.embedding IS 'Vector embedding of story content for semantic search and similarity matching';
COMMENT ON COLUMN stories.embedding_model IS 'Model used to generate the embedding';
COMMENT ON COLUMN stories.embedding_generated_at IS 'Timestamp when embedding was generated'; 