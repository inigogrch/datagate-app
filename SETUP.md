# DataGate Setup Guide

## Quick Start

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd datagate-app
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor in your Supabase dashboard
   - Run the migration script from `supabase/migrations/001_initial_schema.sql`

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the initial data ingestion:**
   ```bash
   npm run ingest
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Getting Your API Keys

### Supabase
1. Go to [supabase.com](https://supabase.com) and create a project
2. Navigate to Settings → API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### OpenAI
1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create a new key → `OPENAI_API_KEY`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run ingest` - Run dbt Labs feed ingestion
- `npm run db:setup` - Show database setup instructions

## Architecture Overview

This is Slice 1 of DataGate, implementing:
- ✅ dbt Labs RSS feed ingestion
- ✅ Vector embeddings with OpenAI
- ✅ Supabase pgvector storage
- ✅ Ranked feed display
- ✅ Feedback system (👍/👎)
- ✅ Dark mode UI with shadcn/ui

## Troubleshooting

### "No stories yet" message
Run `npm run ingest` to fetch the latest dbt Labs blog posts.

### Database connection errors
- Verify your Supabase credentials in `.env.local`
- Ensure you've run the migration script
- Check that pgvector extension is enabled

### OpenAI errors
- Verify your API key is valid
- Check you have credits in your OpenAI account

## Next Steps

After getting Slice 1 running, future slices will add:
- Multiple data sources (Snowflake, Databricks, etc.)
- User authentication
- Personalized feed ranking
- Chat with RAG capabilities
- Email digest functionality 