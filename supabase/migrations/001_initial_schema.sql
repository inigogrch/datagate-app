-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Stories table: stores the raw content from feeds
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    content TEXT,
    summary JSONB, -- Will store {tldr: string[], impact: string}
    published_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddings table: stores vector embeddings for stories
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id)
);

-- Create an index for vector similarity search
CREATE INDEX embeddings_embedding_idx ON embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Feedback table: stores user reactions
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- For now, we'll use anonymous IDs
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    score INTEGER CHECK (score IN (-1, 1)), -- -1 for 👎, 1 for 👍
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

-- Create indexes for performance
CREATE INDEX stories_published_at_idx ON stories(published_at DESC);
CREATE INDEX stories_source_idx ON stories(source);
CREATE INDEX feedback_user_id_idx ON feedback(user_id);
CREATE INDEX feedback_story_id_idx ON feedback(story_id);

-- Create a view for ranked feed
CREATE OR REPLACE VIEW ranked_stories AS
SELECT 
    s.*,
    COALESCE(f.avg_score, 0) as relevance_score,
    COALESCE(f.feedback_count, 0) as feedback_count
FROM stories s
LEFT JOIN (
    SELECT 
        story_id,
        AVG(score) as avg_score,
        COUNT(*) as feedback_count
    FROM feedback
    GROUP BY story_id
) f ON s.id = f.story_id
ORDER BY 
    -- Boost by recency (stories from last 7 days get higher score)
    CASE 
        WHEN s.published_at > NOW() - INTERVAL '7 days' THEN 1.5
        WHEN s.published_at > NOW() - INTERVAL '30 days' THEN 1.0
        ELSE 0.5
    END * COALESCE(f.avg_score + 1, 1) DESC,
    s.published_at DESC; 