# DataGate 

**DataGate** is an AI-powered feed aggregator that keeps data professionals updated with the latest releases and updates from the data professional ecosystem.
## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd datagate-app
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys:
# - OPENAI_API_KEY=your-openai-api-key (required for chat)
# - Add your Supabase credentials

# 3. Set up database
# Run the SQL from supabase/migrations/001_initial_schema.sql in Supabase

# 4. Test your setup
npm run test:setup

# 5. Fetch initial data
npm run ingest

# 6. Start the app
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your feed!

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI/ML**: OpenAI (embeddings + GPT-4o summaries)
- **State Management**: TanStack Query, Zustand
- **Deployment**: Vercel Edge Functions

### Key Features (Slice 1)
- ✅ Hourly ingestion of dbt Labs blog/releases
- ✅ AI-generated summaries (3-bullet TL;DR + impact)
- ✅ Vector embeddings for semantic search
- ✅ Relevance ranking with recency boost
- ✅ User feedback system (👍/👎)
- ✅ Dark mode UI optimized for developers
- ✅ **AI Chat Assistant** - Real-time streaming chat powered by GPT-4
  - Ask questions about frameworks, tools, and best practices
  - Get instant responses with code examples
  - Streaming responses with auto-scrolling
  - Beautiful dark mode interface

## 📁 Project Structure

```
datagate-app/
├── app/                    # Next.js app directory
│   ├── (dashboard)/       # Dashboard layout
│   ├── api/v1/           # API routes
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   └── *.tsx            # Custom components
├── lib/                 # Utilities
│   ├── agents/         # AI agents (ingestion)
│   ├── hooks/          # Custom React hooks
│   └── supabase/       # Database clients
├── scripts/            # CLI scripts
├── supabase/           # Database migrations
└── product/            # PRD documentation
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run ingest` - Fetch latest dbt Labs posts
- `npm run test:setup` - Verify your configuration
- `npm run db:setup` - Show database setup instructions

### AI Chat Setup

The AI Chat feature uses the Vercel AI SDK with OpenAI's GPT-4 model:

1. **Get an OpenAI API Key**: Sign up at [platform.openai.com](https://platform.openai.com)
2. **Add to Environment**: Set `OPENAI_API_KEY` in your `.env.local`
3. **Navigate to Chat**: Visit `/chat` or click the Chat link in the sidebar
4. **Start Chatting**: Ask questions about tech, frameworks, or development practices

The chat uses:
- **Edge Runtime**: For optimal streaming performance
- **Vercel AI SDK**: For seamless streaming and error handling
- **GPT-4**: For high-quality, up-to-date responses

### Environment Variables

Required for chat functionality:
```bash
OPENAI_API_KEY=sk-...  # Your OpenAI API key
```

See [SETUP.md](./SETUP.md) for all configuration options.

## 🗺️ Roadmap

- **Slice 1** (Current): dbt Labs feed with basic functionality
- **Slice 2**: Multiple sources (Snowflake, Databricks, etc.)
- **Slice 3**: User auth & personalization
- **Slice 4**: Chat with RAG capabilities
- **Slice 5**: Email digests & notifications

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [MVP PRD](./product/data_gate_mvp_prd.md) - Full product requirements
- [Slice 1 Spec](./product/data_gate_slice1.md) - Current implementation

## 🤝 Contributing

This is currently a private MVP. Contribution guidelines coming soon.

## 📄 License

Proprietary - All rights reserved

---

Built with ❤️ for data professionals who need to stay ahead of the curve.

## Hybrid Tagging System

DataGate uses a sophisticated hybrid tagging system that combines:

### 1. **Heuristic Tagging** (Fast & Precise)
- Keyword matching with word boundaries
- Regex pattern detection (version numbers, funding amounts, etc.)
- Domain-specific rules defined in `lib/adapters/config/tagging-rules.json`
- Sub-millisecond performance

### 2. **Semantic Tagging** (Intelligent & Context-Aware)
- OpenAI embeddings (text-embedding-3-small model)
- Cosine similarity matching against tag prototypes
- Captures semantic meaning beyond keywords
- Handles synonyms and related concepts

### Key Features:
- **No rigid categories** - Dynamic, content-based tags
- **Personalization-ready** - Tags enable user interest matching
- **Performance optimized** - Memoization, batch processing
- **Fallback handling** - Gracefully degrades to heuristic-only

### Running Ingestion

```bash
# Run enhanced ingestion with embeddings (all sources)
pnpm run ingest:enhanced

# Dry run to preview without inserting
pnpm run ingest:enhanced -- --dry-run

# Run specific source
pnpm run ingest:enhanced -- --source arxiv

# Disable semantic tagging (heuristic only)
pnpm run ingest:enhanced -- --no-semantic

# Test the hybrid tagging system
pnpm run test:hybrid
```

### Database Schema

The system stores:
- `tags[]` - Array of content-based tags
- `tagging_metadata` - Processing details and metrics
- `embedding` - Vector embedding for similarity search
- `embedding_model` - Model used (text-embedding-3-small)
- `embedding_generated_at` - Timestamp of generation
