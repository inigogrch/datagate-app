# DataGate MVP Spec: Onboarding-to-Personalized-Feed Slice

## Core Flows

### 1. Onboarding (No Auth)
- **Goal:** Gather minimal, high-signal data to power instant feed personalization.
- **Flow:**
  1. **Welcome Screen:** Brief one-liner ("Get mission-critical data & ML news curated for you—fast.")
  2. **Role Selection:** Pre-set roles (Data Scientist, ML Engineer, Analytics Engineer, BI Lead, Consultant, Other).
  3. **Professional Priorities:** Checkboxes for key focus areas (e.g., Stay current on tool releases, Avoid breaking changes, Track new ML models, Compliance/governance, Business impact).
  4. **Tech Tags / Interests:**  
     - Chips for most relevant tags (dbt, Snowflake, LLMs, Spark, DuckDB, Funding/M&A, Python, etc.)
     - **“Add your own”**: free-text input for niche tools or domains
  5. **Mission-Critical Projects (Optional):** Short text input (“What are you working on? Any burning questions?”)
  6. **Submit Button:** Calls the retrieval agent to generate a personalized feed.

### 2. Personalized Feed Display
- **Goal:** Show the most relevant, up-to-date news/stories ranked for the user, instantly after onboarding.
- **Flow:**
  1. **Loading Skeleton** while agent runs (target <200ms p95 latency).
  2. **Feed List:** Card-based, scrollable, visually organized by recency and relevance (with badges for DATA, ML, BIZ).
  3. **Story Card:** Title, summary bullets (GPT-4o TL;DR), “Why it matters,” source, relevance tags, time, thumbs feedback.
  4. **Modal/Detail on click:** Full summary, source, related stories.
  5. **Feedback:** Thumbs up/down per story, with optional quick comment for why (feeds learning loop).
  6. **“Refine Feed”/Settings** entry: lets users edit tags, role, and preferences at any time.

---

## Required Components

### UI/UX Components
- `OnboardingWizard`: Handles all steps above; uses shadcn/ui `<Card>`, `<Select>`, `<Input>`, `<Badge>`, `<Button>`, etc.
- `TagFilterChips`: For selecting tech interests; supports both pre-set and custom tags.
- `FeedList`: Virtualized, responsive feed.
- `StoryCard`: Card-style with TL;DR, tags, source, feedback UI.
- `SummaryModal`: Detail view on story click.
- `SettingsPanel` (optional in MVP): Simple drawer/modal to update user profile.
- `LoadingSkeleton`: Visual placeholder during agent fetch.

### API/Data Components
- `/api/feed`: Accepts user’s role, priorities, tags, custom input as payload (no auth—store anonymously/session/local storage or temp ID).
- RetrievalAgent (server function):  
  - Fetches and ranks stories from Supabase/pgvector by (a) semantic similarity (embeddings) to tags/interests, (b) recency, (c) domain/role weight.
  - Boosts stories matching both explicit tags and inferred topics from free-text input (mission-critical projects).
  - Returns top-N ranked stories with summaries.
- Optional: `/api/feedback` for storing relevance signals.

---

## Data Handling and Flow

1. **User Input Capture:**  
   - Store onboarding choices in browser local/session storage for persistence (no login).
   - POST onboarding data to `/api/feed` (could also use GET with query params for MVP).

2. **Retrieval Agent Workflow:**  
   - **Step 1:** Take tags, role, and free text; convert to search query and embedding vector(s).
   - **Step 2:** Query Supabase/pgvector:  
     - **K-NN Search**: Find nearest stories to each user tag (and inferred tags from free text).
     - **Recency Boost**: Re-rank to prefer newer stories.
     - **Domain/Role Match**: Further boost stories matching role/context (e.g., “dbt” for Analytics Engineer).
     - **Novelty Filter**: Remove stories user has seen (if tracked via session/local).
   - **Step 3:** For each story, fetch summary (precomputed or on-demand with GPT-4o); return in response.

3. **Feed Rendering:**  
   - UI receives feed JSON, renders as card list.
   - Each card includes:
     - Title, summary bullets, source, badges, feedback UI.
     - Click to expand for “Why it matters,” full content, and related links.

---

## Agent Logic (Retrieval & Ranking)
- **Input:** `{ role, priorities, tags[], freeText }`
- **Logic:**
  1. Embed user-selected tags + parse freeText for additional keywords/entities.
  2. Compose a weighted query for vector search.
  3. Retrieve top-K matches, boost by:
     - Story recency (publish date, time decay).
     - Role/story-domain overlap.
     - Explicit tag matches > semantic similarity matches > inferred context.
  4. Apply post-filtering for novelty (if possible in MVP).
  5. For each, attach or compute summary (cached if possible).
  6. Return sorted array of stories for front-end rendering.

---

## Explicit Assumptions

- No login/auth in MVP; user preferences stored client-side (session/local storage or temp UUID).
- Supabase pgvector + OpenAI embeddings power all semantic retrieval.
- Precomputed summaries for most stories; fallback to on-demand if cache miss.
- Tag and role taxonomy are fixed for MVP but allow custom input for future expansion.
- No real-time notifications or email digests—dashboard only.
- System should respond <200ms p95 for feed API call.
- All shadcn/ui and Tailwind for rapid, accessible UI development.

---

## Usability and Performance Notes

- Minimal input: User is never overwhelmed—3–5 choices max per onboarding step.
- Clear defaults: Most users can onboard in <30s with pre-set roles/tags.
- Optimistic loading: Feed shell displays instantly, stories fill in as agent completes fetch.
- Session persistence: If user leaves and returns, preferences are remembered.
- Feedback loop: Every story can be rated, but feedback is optional and never blocks reading.
- Accessibility: All form controls keyboard- and screen reader-accessible (shadcn/ui handles this out of the box).

---

## Summary Table: Slice Components

| Flow Step         | Component(s)           | Data/API             | Notes                                 |
|-------------------|-----------------------|----------------------|---------------------------------------|
| Onboarding        | OnboardingWizard, TagFilterChips, Input fields | Local/session storage; `/api/feed` | Minimal, multi-step or single-card   |
| Retrieval         | RetrievalAgent (backend/edge) | Supabase vector search + summary | <200ms p95 latency, recency boost   |
| Feed Display      | FeedList, StoryCard, LoadingSkeleton | Feed JSON          | Card-based, infinite scroll, badges  |
| Feedback          | StoryCard, FeedbackButton | `/api/feedback` (optional) | Drives future re-ranking             |
| Settings/Refine   | SettingsPanel (optional MVP) | Local/session       | Allows user to re-run agent          |

---

## End-to-End Flow (Sequence Diagram)

1. User lands → onboarding wizard
2. User submits role/priorities/tags/free-text
3. POST/GET to `/api/feed` (w/ onboarding data)
4. Retrieval agent runs (vector search + ranking)
5. Feed data returned to UI; loading skeleton animates
6. Cards render; user can read, rate, and/or refine

---

This blueprint ensures a smooth, performance-optimized onboarding-to-feed flow, directly addresses the target user pain points (information overload, time waste), and leverages the core technical stack chosen. It’s MVP-ready, with clean separation between onboarding, retrieval, and presentation—and sets the stage for deeper personalization, feedback loops, and user engagement as you scale.

