# DataGate - dbt Release Radar (Slice 1)

**DataGate** is an AI-powered feed aggregator that keeps data professionals updated with the latest releases and updates from the data engineering ecosystem. This is Slice 1, focused on dbt Labs content.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd datagate-app
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

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

### Environment Variables

See [SETUP.md](./SETUP.md) for detailed configuration instructions.

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
