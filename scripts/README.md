# DataGate Scripts

This directory contains various scripts for managing the DataGate application.

## Directory Structure

### `/ingestion`
Scripts for ingesting data from various sources into the database:
- `ingest-arxiv-papers.ts` - Ingests papers from arXiv
- `ingest-aws-adapter.ts` - Ingests AWS Big Data blog posts
- `ingest-dbt-feed.ts` - Ingests dbt blog feed
- `ingest-google-research.ts` - Ingests Google Research blog posts
- `ingest-huggingface-papers.ts` - Ingests papers from HuggingFace
- `ingest-microsoft-adapter.ts` - Ingests Microsoft blog posts
- `ingest-openai-adapter.ts` - Ingests OpenAI blog posts
- `ingest-pypi-adapter.ts` - Ingests PyPI package updates
- `ingest-with-embeddings.ts` - General ingestion script with embeddings support

### `/test`
Scripts for testing adapters and functionality:
- `test-arxiv-papers.ts` - Tests arXiv adapter
- `test-aws-adapter.ts` - Tests AWS adapter
- `test-google-research-scraper.ts` - Tests Google Research scraper
- `test-huggingface-papers.ts` - Tests HuggingFace adapter
- `test-hybrid-tagging.ts` - Tests hybrid tagging functionality
- `test-microsoft-adapter.ts` - Tests Microsoft adapter
- `test-openai-adapter.ts` - Tests OpenAI adapter
- `test-optimized-tagging.ts` - Tests optimized tagging performance
- `test-pypi-adapter.ts` - Tests PyPI adapter
- `test-pypi-simple.ts` - Simple PyPI test
- `test-single-pypi-package.ts` - Tests single PyPI package handling
- `test-setup.ts` - Tests database setup

### `/utils`
Utility and debugging scripts:
- `check-current-stories.ts` - Checks current stories in the database
- `debug-env.ts` - Debugs environment configuration
- `debug-ingestion-env.ts` - Debugs ingestion environment

### `/migrations`
Database migration scripts:
- `run-external-id-migration.ts` - Migrates external IDs for existing stories

## Running Scripts

All scripts can be run using `tsx`:

```bash
# Ingestion
npx tsx scripts/ingestion/ingest-arxiv-papers.ts

# Testing
npx tsx scripts/test/test-arxiv-papers.ts

# Utilities
npx tsx scripts/utils/check-current-stories.ts

# Migrations
npx tsx scripts/migrations/run-external-id-migration.ts
```

## Environment Variables

Most scripts require environment variables to be set. See `.env.example` for required variables. 