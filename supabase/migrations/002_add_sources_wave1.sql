-- Create sources table
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('rss', 'atom', 'api')),
    endpoint_url TEXT NOT NULL,
    fetch_freq_min INTEGER NOT NULL DEFAULT 60,
    row_category TEXT NOT NULL CHECK (row_category IN ('tools_frameworks', 'research_updates', 'industry_news')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add source_id to stories table
ALTER TABLE stories ADD COLUMN source_id UUID REFERENCES sources(id);

-- Create index for source lookups
CREATE INDEX stories_source_id_idx ON stories(source_id);

-- Insert dbt Labs source (for existing data)
INSERT INTO sources (name, type, endpoint_url, fetch_freq_min, row_category) VALUES
    ('dbt Labs Blog', 'rss', 'https://www.getdbt.com/blog/feed.xml', 60, 'tools_frameworks');

-- Update existing stories to reference dbt Labs source
UPDATE stories 
SET source_id = (SELECT id FROM sources WHERE name = 'dbt Labs Blog')
WHERE source = 'dbt Labs Blog';

-- Insert Wave 1 Tools & Frameworks sources
INSERT INTO sources (name, type, endpoint_url, fetch_freq_min, row_category) VALUES
    ('AWS Big Data Blog', 'rss', 'https://aws.amazon.com/blogs/big-data/feed/', 60, 'tools_frameworks'),
    ('OpenAI Official Blog', 'rss', 'https://openai.com/blog/rss.xml', 60, 'tools_frameworks'),
    ('Microsoft Excel & Power BI Blog', 'rss', 'https://powerbi.microsoft.com/en-us/blog/feed/', 120, 'tools_frameworks'),
    ('PyPI Top Packages', 'atom', 'pypi-packages', 180, 'tools_frameworks'); -- Special handling for multiple feeds

-- Make source_id NOT NULL after populating existing data
ALTER TABLE stories ALTER COLUMN source_id SET NOT NULL;

-- Drop the old source column (we'll keep it for now for backward compatibility)
-- ALTER TABLE stories DROP COLUMN source;
