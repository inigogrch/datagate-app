-- Add 'web_scrape' as a valid type for sources
-- This enables web scraping adapters like Google Research Blog

-- Drop the existing constraint
ALTER TABLE sources DROP CONSTRAINT sources_type_check;

-- Add the new constraint with 'web_scrape' included
ALTER TABLE sources ADD CONSTRAINT sources_type_check 
CHECK (type IN ('rss', 'atom', 'api', 'web_scrape'));

-- Comment explaining the new type
COMMENT ON COLUMN sources.type IS 'Source type: rss (RSS feeds), atom (Atom feeds), api (JSON/REST APIs), web_scrape (HTML scraping)'; 