# Slice 1 — **Single-Source Feed Vertical (“dbt Release Radar”)**

## Overview
This first slice delivers an end-to-end “walking skeleton” that covers the entire DataGate loop for a single, high-value content source (dbt Labs blog & release notes).  
It exercises ingestion, vector storage, retrieval, summarisation, UI, and feedback while keeping surface area small.

| **Layer** | **Scope for this slice** | **Why start here?** |
|-----------|--------------------------|---------------------|
| **Ingestion** | Hourly fetch of **dbt Labs** blog & release notes (RSS / HTML) | dbt updates break data pipelines—pain-killer content. |
| **Embeddings + Store** | OpenAI **`text-embedding-3-small`** → Supabase **pgvector** (single table, public RLS) | Validates vector setup, latency, and cost on tiny volume. |
| **Retrieval + Ranking** | Simple **k-NN** on latest 200 items, boosted by recency | Tests relevance scoring before tag-based complexity. |
| **Summarisation** | GPT-4o prompt → *“3-bullet TL;DR”* + *“Why it matters”* | Checks summary quality on domain-specific jargon. |
| **Dashboard Feed** | Next.js page with **`<StoryCard>`** components (dark-mode) | Confirms RSC ↔ client hooks, Tailwind, shadcn UI. |
| **Feedback** | 👍 / 👎 buttons storing `user_id`, `story_id`, `score` | Seeds relevance dataset for slice 2 ranking. |

*Auth can be mocked with a single anonymous `user_id`; full OAuth comes in slice 2.*

---

## Deliverables Checklist
- [ ] **Cron script / Edge Function** – fetch → parse → upsert dbt posts  
- [ ] **Supabase schema** – `stories`, `embeddings`, `feedback` tables  
- [ ] **Vector index** + SQL **view** for ranked feed  
- [ ] **API route** – `GET /api/feed?limit=20`  
- [ ] **Front-end** – `FeedPage`, `StoryCard`, skeleton `Sidebar` / `TopNav`  
- [ ] **Telemetry hooks** – log p95 latency & token spend  
- [ ] **Smoke tests** – ingest job, API response, card render
