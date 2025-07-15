# **DataGate** — MVP PRD (v1.0)

---

## 0. tl;dr

**DataGate** is a web‑only AI agent that curates and summarises *mission‑critical data & ML news* for analytics professionals. The MVP delivers a personalised feed inside a React/Tailwind dashboard—no emails, no push alerts. Core loop: **ingest → embed → retrieve → summarise → display → feedback**.

---

## 1. Overview

Data professionals drown in a torrent of releases: new Hugging Face models, dbt versions, Snowflake features, vendor acquisitions, and compliance changes. Scanning Slack channels, newsletters, and Twitter eats hours and causes missed deprecations.

**Target users**\
• Data & ML engineers (ETL, orchestration, MLOps)\
• Analytics engineers / BI leads (dbt, Looker, Power BI)\
• Data scientists (notebook‑driven research)\
• Tech‑strategy consultants focusing on data adoption

**Problem statement**\
Current feeds mix generic tech chatter with niche data updates. Manual filtering is labour‑intensive; missing a breaking dbt change or Snowflake pricing shift can break pipelines or budgets.

**Solution (MVP)**

1. Curate 6‑8 *high‑value data feeds* (see §8).
2. Ingest hourly; embed with OpenAI **text‑embedding‑3‑small**; store in **Supabase pgvector**.
3. Rank stories against user skill tags (e.g., *dbt*, *LLM*, *Snowflake*).
4. Summarise with GPT‑4o (3‑bullet TL;DR + "Why it matters to data teams").
5. Display in dashboard; chat RAG answers ad‑hoc questions ("Any dbt‑core v1.8 breaking changes?").
6. Collect 👍/👎 feedback to fine‑tune relevance.

---

## 2. Goals

| Category      | Metric                       | Target (90 days) |
| ------------- | ---------------------------- | ---------------- |
| **Business**  | Weekly active users (WAU)    | **300**          |
|               | Day‑7 retention              | **45 %**         |
| **User**      | Avg. session time            | **≥ 4 min**      |
|               | Relevance score (👍 ÷ total) | **≥ 80 %**       |
| **Technical** | p95 feed API latency         | **< 200 ms**     |

**Non‑goals**\
• Email digest\
• Browser extension\
• Mobile native app\
• Real‑time push notifications

---

## 3. User Stories

| Role                        | Problem Context                                                                      | Desired Outcome                                                             | Value                                                         |
| --------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Analytics Engineer**      | dbt & Snowflake release notes come at random times; missing one breaks nightly jobs. | *“Give me a curated list highlighting breaking dbt and warehouse changes.”* | Prevents pipeline downtime; saves hours of fire‑drills.       |
| **Data Scientist**          | New Hugging Face models and Kaggle datasets appear daily; hard to track relevance.   | *“Summarise new models/datasets tagged with my domain (NLP, vision).”*      | Accelerates experimentation; keeps research state‑of‑the‑art. |
| **ML Engineer**             | API deprecations from Vertex AI or AWS SageMaker slip by until deploy.               | *“Alert me to platform/API changes before deploy day.”*                     | Reduces rollbacks; protects SLA.                              |
| **BI Lead**                 | Executives ask about latest data‑governance regulations.                             | *“Provide concise briefs on GDPR/CCPA/data‑privacy updates.”*               | Ensures compliance planning; boosts leadership credibility.   |
| **Data‑Focused Consultant** | Must craft client briefings on data‑tool funding rounds & M&A.                       | *“Show funding/M&A digests with business impact.”*                          | Produces billable insights faster.                            |

---

## 4. Functional Requirements

### Core (MVP)

1. **Auth & Profile**: OAuth (GitHub/Google) + select data domains/tags (dbt, Snowflake, LLM, etc.).
2. **Ingestion**: Hourly cron fetches feeds; parse Markdown/HTML.
3. **Embeddings & Store**: OpenAI → Supabase pgvector (RLS per user).
4. **Retrieval & Ranking**: SQL K‑NN + recency + domain weight.
5. **Summarisation**: GPT‑4o bullet TL;DR + impact for data teams.
6. **Dashboard Feed**: Story cards + modal details.
7. **Chat RAG**: Ask questions; streamed answers with citations.
8. **Feedback Loop**: 👍/👎 storage; adjust relevance weights.

Prioritisation & UX follow the pattern of GateGiving v0.4.

---

## 5. User Experience

*Onboarding*: pick roles (Data Sci / ML Eng / Analytics Eng / BI / Consultant) → pick tech tags (dbt, Spark, DuckDB, etc.) → see sample feed.\
*Feed*: Ranked cards with **DATA**, **ML**, **BIZ** badges.\
*Chat*: pre‑filled quick prompts ("What changed in dbt‑core this week?").

Dark‑mode, Tailwind + shadcn/ui.

---

## 6. Narrative

> **Problem** — Aisha, a data scientist, spends her mornings sifting newsletters and Slack to catch model releases. She misses a Hugging Face model fine‑tuned for her finance domain; two weeks later a competitor ships it first.
>
> **Struggle** — Manual monitoring wastes 40 min/day and still leaves blind spots. Missed updates cost competitive edge.
>
> **Resolution** — **DataGate** shows Aisha three personalised items: a domain‑specific model release, a dbt bugfix that would break her pipelines, and a funding round for a tool the team is evaluating. Each item explains *why it matters*.

Outcome: Aisha gains back focus time and keeps her models and pipelines ahead of the curve.

---

## 7. Success Metrics & Tracking

| Metric Group    | KPI                              | Tool                 | Target   | Why it matters                  |
| --------------- | -------------------------------- | -------------------- | -------- | ------------------------------- |
| **Engagement**  | WAU / MAU ratio                  | PostHog              | ≥ 55 %   | Indicates habitual use          |
|                 | Avg. session length              | PostHog              | ≥ 4 min  | Users are reading, not bouncing |
| **Quality**     | Relevance score (👍 ÷ total)     | Supabase SQL         | ≥ 80 %   | Measures curation accuracy      |
|                 | Expert audit pass‑rate           | Manual weekly sample | ≥ 90 %   | Prevents hallucination risk     |
| **Performance** | p95 feed API latency             | Vercel Analytics     | < 200 ms | Keeps UX snappy                 |
|                 | p95 chat first‑token latency     | Vercel               | < 1.2 s  | Crucial for conversational flow |
| **Retention**   | Day‑7 retention                  | PostHog cohorts      | ≥ 45 %   | Early stickiness                |
|                 | Day‑30 retention                 | PostHog cohorts      | ≥ 30 %   | Longer‑term value proof         |
| **Growth**      | Viral coefficient (shares / WAU) | PostHog events       | ≥ 0.25   | Organic word‑of‑mouth           |
| **Cost**        | Avg. token spend per WAU         | Internal dashboard   | ≤ \$0.05 | Maintains healthy gross margin  |

**Instrumentation stack**

- **PostHog** — product & cohort analytics
- **Supabase SQL** — relevance and audit logs
- **Vercel Analytics** — edge latency & cold‑start rate
- **Grafana** — cost tracking (OpenAI + Sonar)

Metrics are reviewed weekly via a red/amber/green dashboard and feed into quarterly OKRs.

---

## 8. Data Sources (V1)

| Source                                                                    | Type               | Coverage Focus                        | Rationale                                    |
| ------------------------------------------------------------------------- | ------------------ | ------------------------------------- | -------------------------------------------- |
| **dbt Labs Blog & Release Notes**                                         | Official blog      | dbt, analytics engineering            | Core tooling for pipeline definition         |
| **Snowflake Engineering & Release Notes**                                 | Official blog      | Cloud warehouse                       | Critical warehouse feature changes           |
| **Hugging Face Model Releases RSS**                                       | ML releases        | LLM/ML models                         | Keeps DS/ML users on new checkpoints         |
| **Databricks Engineering Blog**                                           | Official blog      | Lakehouse/Spark                       | Widely adopted compute engine updates        |
| **Kaggle Datasets RSS**                                                   | Dataset feed       | Public datasets                       | Fuel for experimentation                     |
| **Python Insider (CPython release)**                                      | Official blog      | CPython versions, PEPs                | Most‑used language in data stacks            |
| **PyPI Top‑Packages Atom feed** (pandas, numpy, scikit‑learn, matplotlib) | Package releases   | Popular Python libs                   | Detect breaking API changes & CVEs           |
| **PostgreSQL Release Notes RSS**                                          | Official blog      | SQL engine                            | Many data teams run Postgres / analytics DBs |
| **Microsoft 365 / Excel Blog RSS**                                        | Official blog      | Excel & Power BI                      | Ubiquitous BI/analysis tooling updates       |
| **Data Engineering Weekly**                                               | Curated newsletter | Community long‑form                   | Human‑curated engineering curation           |
| **Data Science Weekly**                                                   | Curated newsletter | Data‑science trends & research        | Popular digest for DS practitioners          |
| **insideAI News RSS**                                                     | Industry news      | Funding rounds, policy, market moves  | Daily AI/data business news                  |
| **InfoQ – Data Engineering & Observability**                              | Editorial news     | Best practices, open‑source launches  | Credible curation with domain tags           |
| **o11y.news**                                                             | Curated digest     | Observability & telemetry             | Reliability‑focused insights for data ops    |
| **EnterpriseAIWorld – Data Engineering section**                          | Industry news      | Enterprise deployments & vendor moves | Exec‑level perspective on platform shifts    |
| **Crunchbase News – Funding & M&A**                                       | Funding tracker    | Tooling market                        | Market & competitive intelligence            |
| **HBR Technology Section RSS**                                            | Strategy/business  | Executive perspective                 | Strategic insights for consultants/BI        |
| **Perplexity Sonar MCP (Phase 2)**                                        | Web search MCP     | Web‑wide                              | Backfill when no internal match              |

Feeds beyond v1 can be added via CMS‑editable table without code deploy.

---

## 9. Technical Considerations

**Updated stack pattern**

- **Framework**: Next.js 14 App Router (React Server Components).
- **Runtime**: Vercel Edge Functions & Cron Workers.
- **Vector Store**: Supabase Postgres + pgvector.
- **LLM Interface (Edge/API)**: **Vercel AI SDK** using the OpenAI provider (future‑proof for Anthropic/Mistral).
- **Embeddings (Cron)**: **OpenAI SDK** for batch `text‑embedding‑3‑small` calls during ingestion.
- **Agent Orchestration**: LangChain TS wrappers around AI SDK/OpenAI SDK calls.
- Only tag taxonomy/table names adapt to data domains.

---

## 10. UI Architecture

### Component Library

All UI elements are built with **shadcn/ui** (Tailwind‑based) components for consistency, accessibility, and rapid iteration.

### Component Map

| Custom Component    | shadcn Base Component                                           | Purpose                                                            |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| **TopNavigation**   | `<Header>` + `<Button>` + `<Avatar>`                            | Global navigation, search, role badge, settings drop‑down          |
| **TagFilterChips**  | `<Badge>` (variant="outline")                                   | Toggleable taxonomy filters (dbt, LLM, Snowflake, Funding, Policy) |
| **StoryCard**       | `<Card>`                                                        | Preview: title, source badge, relevance pill, thumbs reactions     |
| **FeedList**        | `<ScrollArea>` + `<Virtualizer>`                                | High‑perf vertical list (\~60 fps)                                 |
| **SummaryModal**    | `<Dialog>`                                                      | 3‑bullet TL;DR, “Why it matters”, citations, copy‑link             |
| **ChatWindow**      | `<Sheet>` (side panel) + `<Textarea>` + `<Button>`              | Streaming RAG chat with citation panes                             |
| **SettingsPanel**   | `<Drawer>` + form primitives (`<Label>`, `<Input>`, `<Select>`) | Manage interests, digest time (future), account                    |
| **LoadingSkeleton** | `<Skeleton>`                                                    | Shimmer placeholder during data fetch                              |
| **EmptyState**      | `<Card>` + icon                                                 | “All caught up”‑style friendly zero state                          |

### Theming & Layout

- **Tailwind CSS** with shadcn theme tokens; dark mode default.
- CSS Grid layout: 1‑column mobile, 2‑column desktop (70 % Feed / 30 % Chat).
- CSS variables enable white‑label theming for enterprise customers.

### State & Data Flow

- **TanStack Query** → React Server Components fetch `/api/feed` and cache.
- **Zustand** → local UI state (selected tags, modals).
- **Streaming** → SSE from `/api/chat` rendered via `useStreamableValue` helper.

### Accessibility & i18n

- shadcn components come WCAG 2.1 AA out of the box; all interactive elements keyboard‑navigable with aria‑labels.
- Language & direction handled via `next-intl` scaffolding (EN default; ES/DE roadmap).

---

## 11. API & Backend

| Endpoint           | Method     | Auth | Description                                 | Response (200)                                                                     |
| ------------------ | ---------- | ---- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/api/v1/feed`     | GET        | JWT  | Return ranked stories (pagination `?page=`) | `{ stories: [{id, title, url, summary, tags, relevance, published_at}], nextPage}` |
| `/api/v1/chat`     | POST (SSE) | JWT  | Streamed chat completion with RAG context   | `data: {token: "..."}`                                                             |
| `/api/v1/feedback` | POST       | JWT  | Record 👍/👎 & optional comment             | `{ status: "ok"}`                                                                  |
| `/api/v1/profile`  | GET / PUT  | JWT  | Fetch or update interests/roles             | `{ userId, roles[], tags[] }`                                                      |

**Standards & Practices**

- **JSON\:API 1.1** conventions; camelCase keys.
- **Versioning** via URL prefix (`/v1/`).
- **Auth** with Supabase JWT (expires 1 week; refresh on activity).
- **Rate Limiting** 60 req/min/user at edge; returns **429** + `Retry‑After` header.
- **Error model** RFC 9457 *problem+json* responses.

---

## 12. Performance & Scalability

| Layer             | Strategy                                                                            | Target                |
| ----------------- | ----------------------------------------------------------------------------------- | --------------------- |
| **Edge API**      | Vercel Edge Functions (Deno)                                                        | p95 < 200 ms          |
| **DB**            | Supabase pg\_bouncer pool + pgvector IVFFlat 200 lists                              | ≤ 500 k vectors       |
| **Cron ETL**      | Parallel feed fetch with `p-limit(4)`; total runtime < 45 s                         | ≤ 60 min schedule     |
| **Caching**       | Supabase KV for per‑user feed (TTL 60 min)                                          | 80 % cache hit        |
| **Static Assets** | Vercel CDN & edge caching                                                           | TTFB < 50 ms          |
| **Scale Plan**    | Migrate posture: Supabase → dedicated compute; pgvector → Pinecone if vectors > 1 M | Maintain p95 < 300 ms |

---

## 13. Agent Workflows & Requirements

| Agent               | Stack                                    | Trigger                              | Steps                                                                | Non‑Functional Notes                                    |
| ------------------- | ---------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| **IngestionAgent**  | Node Cron + OpenAI SDK (embeddings)      | Vercel Cron hourly                   | fetch→parse→dedupe→embed→upsert                                      | Idempotent hash keys; retries ×3; logs JSON to Logflare |
| **ClassifierAgent** | Python micro‑service (Phase 2)           | Post‑ingestion                       | zero‑shot classify → tag set                                         | GPU optional                                            |
| **SummariserAgent** | GPT‑4o 8k                                | Post‑retrieval                       | TL;DR bullets + Impact line                                          | Cost cap 1 ¢/story                                      |
| **RetrievalAgent**  | SQL (pgvector)                           | `/api/feed`                          | K‑NN → recency boost → novelty filter                                | 150 ms budget                                           |
| **WebSearchAgent**  | **Vercel AI SDK MCP client** + Sonar MCP | When RetrievalAgent returns < N hits | call `search_web` tool → parse JSON → embed temp vectors → summarise | p95 < 400 ms; rate‑limit Sonar budget                   |
| **ChatAgent**       | GPT‑4o via Vercel AI SDK + LangChain RAG | `/api/chat`                          | retrieve k=6 (+ Sonar if needed) → construct prompt → stream         | SSE; abort controller                                   |
| **FeedbackTrainer** | Supabase Edge Function                   | Feedback write                       | update user‑story weight table                                       | future RLHF loop                                        |

**Observability & Ops**: OpenTelemetry traces; Datadog dashboards; PagerDuty alerts at p95 latency breaches 5 m.

---

## 14. Technical Architecture

```
Browser (Next.js) ──▶ Edge (Vercel) ──▶ Supabase Postgres + pgvector
                                 │
                                 ├─▶ Supabase KV Cache
                                 ├─▶ OpenAI GPT‑4o / Embeddings
                                 └─▶ External Feeds (RSS/API) & **Sonar MCP Server** (Phase 2)
```

**LLM Interface**: Vercel AI SDK on Edge functions; OpenAI SDK in Cron (batch embeddings).

**Environments**: `dev` (ephemeral previews), `staging` (feature flags on), `prod` (read‑only migrations).\
**CI/CD**: GitHub Actions → unit tests → lint → type‑check → Vercel preview → Supabase migration.

**Security**: JWT auth, RLS, OWASP headers, Snyk scan; secrets in Vercel encrypted env vars.\
**Backup/DR**: Supabase PITR + nightly S3 dumps; RPO < 1 h, RTO < 2 h.

---

## 15. Other Requirements & Big Don’ts

| Area               | Requirement                                                                     | Rationale                  |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------- |
| **Privacy**        | GDPR/CCPA compliant; user data deletion via self‑service                        | Builds trust; EU expansion |
| **Compliance**     | SOC 2 Type I in 12 mo; Type II in 24 mo                                         | Enterprise adoption        |
| **Localization**   | i18n scaffold (EN default; ES, DE roadmap)                                      | Global TAM                 |
| **Accessibility**  | WCAG 2.1 AA audited                                                             | Inclusivity; legal risk    |
| **Security**       | Annual penetration test; bug bounty via HackerOne                               | Proactive risk management  |
| **Content Policy** | No ingestion of paywalled proprietary sources without license                   | Legal safety               |
| **Don’ts**         | No background key‑logging, no browser extension in MVP, no personal health data | Trust & scope focus        |

---

## 16. Evaluation & Analytics

| Metric Group    | KPI                        | Tool               | Target   |
| --------------- | -------------------------- | ------------------ | -------- |
| **Engagement**  | WAU/MAU ratio              | PostHog            | ≥ 55 %   |
| **Quality**     | Relevance (👍 ratio)       | Supabase SQL       | ≥ 80 %   |
| **Performance** | p95 latency feed/chat      | Vercel             | < 200 ms |
| **Retention**   | Day‑30 retention           | PostHog cohort     | ≥ 30 %   |
| **Growth**      | Viral coefficient (shares) | PostHog events     | 0.25     |
| **Cost**        | Avg. token spend per WAU   | Internal dashboard | ≤ \$0.05 |

**Methodologies**\
• Weekly product health review; traffic light dashboard.\
• Quarterly OKR scoring.\
• A/B tests on summary style & ranking weights (Optimizely).

---

## 17. Monetisation Plan & GTM

**Phase 0 – Free Beta (0‑3 mo)**\
• Invite‑only; collect NPS & relevance data.\
• Referral rewards (swag, increased feed limit).

**Phase 1 – Pro Tier (3‑9 mo)**\
• \$15/user/mo billed annually.\
• Features: Slack digest export, increased story cap, custom feed rules, CSV export.

**Phase 2 – Team Tier (9‑18 mo)**\
• \$49/user/mo, min 5 seats.\
• SSO (SAML), usage analytics dashboard, admin controls, SOC 2 report.

**Enterprise** (on request)\
• Custom ingest pipelines, on‑prem vector store, bespoke SLAs.

**Growth Loops**

1. **Share‑to‑Slack** link embeds branding → drives peer sign‑ups.
2. **“Powered‑by DataGate”** badge on exported slides.
3. Free personal plan w/ limited feed → seed pipeline for Pro upsell.

---

## 18. Roadmap Snapshot

| Quarter | Epic                     | Outcome                                   |
| ------- | ------------------------ | ----------------------------------------- |
| Q3‑25   | MVP GA                   | Feed, chat, feedback loop live; 1 000 WAU |
| Q4‑25   | Pro Tier + Slack export  | First paid conversion; \$5 k MRR          |
| Q1‑26   | Sonar Search integration | Feed breadth ×3; p95 < 300 ms             |
| Q2‑26   | Team Tier + SOC 2 Type I | Land first 50‑seat enterprise             |
| Q3‑26   | Mobile companion app     | 30 % MAU mobile engagement                |
| Q4‑26   | ML feedback re‑ranking   | Relevance 85 % → 90 %                     |

---

> This comprehensive expansion positions **DataGate** as a defensible, scalable platform poised to capture the rapidly growing analytics‑tools market and evolve into a billion‑dollar intelligence layer for data professionals.

