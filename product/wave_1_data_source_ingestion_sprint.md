### GitHub Issue — “Wave 1 Data‑Source Ingestion Sprint”

**Title**\
`feat(ingestion): add Wave 1 adapters (AWS Big Data, OpenAI, Excel/Power BI, PyPI, Google AI, HF Models, arXiv, MIT Tech Review, NeurIPS, TLDR, TechCrunch, HBR Tech, insideAI)`

---

#### Background

We’ve finalised the 3‑row content taxonomy and the canonical `ParsedItem` DTO. The next milestone is to light up the first batch of external feeds so the dashboard isn’t limited to dbt blog content.

---

#### Scope (13 adapters)

| Row                    | Source                                       | Endpoint type    | Adapter stub                          | Fetch cadence |
| ---------------------- | -------------------------------------------- | ---------------- | ------------------------------------- | ------------- |
| **Tools & Frameworks** | AWS Big Data Blog                            | RSS              | `rssAdapter('awsBigData')`            | 60 min        |
|                        | OpenAI Official Blog                         | RSS              | `rssAdapter('openai')`                | 60 min        |
|                        | Microsoft Excel & Power BI Blog              | RSS              | `rssAdapter('m365Excel')`             | 120 min       |
|                        | PyPI Top‑Package releases (pandas, numpy, …) | per‑package Atom | `pypiAdapter()`                       | 180 min       |
| **Research Updates**   | Google AI Research Blog                      | Web Scrape       | `rssAdapter('googleAI')`              | 60 min        |
|                        | Hugging Face Model Releases                  | JSON API         | `huggingfaceAdapter()`                | 30 min        |
|                        | arXiv (cs.AI, cs.LG, cs.CL, stat.ML)         | RSS              | `arxivAdapter(['cs.AI', …])`          | 1440 min      |
|                        | MIT Technology Review – *The Download*       | RSS              | `rssAdapter('mitTR')`                 | 720 min       |
|                        | NeurIPS Proceedings (OpenReview)             | RSS/JSON         | `neuripsAdapter()`                    | 1440 min      |
| **Industry News**      | TLDR.tech                                    | RSS (Substack)   | `rssAdapter('tldr')`                  | 720 min       |
|                        | TechCrunch                                   | RSS              | *exists* (`rssAdapter('techcrunch')`) | 30 min        |
|                        | HBR Technology                               | RSS              | `rssAdapter('hbrTech')`               | 1440 min      |
|                        | insideAI News                                | RSS              | `rssAdapter('insideAI')`              | 60 min        |

---

#### Definition of Done

- **Source rows** inserted into `sources` table with accurate `fetch_freq_min`.
- **13 new adapter modules** exporting `fetchAndParse(): ParsedItem[]`.
- **Unit tests** (Jest) for each adapter using fixture payloads (happy path + 1 edge‑case).
- **dbt schema tests** green (no NULL `stories.published_at`, vector present, etc.).
- **Grafana dashboard** panels auto‑generated for each adapter (last success, error %).
- **p95 ETL latency** for Wave 1 feeds < 10 min.
- **Supabase row count** checked post‑backfill (< 8 k rows, staying within 100 k cap).

---

#### Tech Notes

- RSS adapters reuse `rssParser.ts` util (xml2js → DTO).
- `pypiAdapter()` loops through `TOP_PACKAGES` env var array; de‑dupes by `externalId = '${pkg}@${version}'`.
- arXiv: build category‑parametrised URL, strip LaTeX from `<summary>`.
- NeurIPS: consume OpenReview JSON, map `published_at` → `first_decision_date`.
- **All adapters** strip zero‑width chars & convert HTML→Markdown via `turndown`.
- Batch embed with `text‑embedding‑3‑small`; hash‑gate unchanged bodies.

---

#### Impact

Populates each UI row with ≈400–800 fresh stories, unlocking end‑to‑end UX tests and the relevance‑feedback loop before GA.

---

#### Reviewer Checklist

- Coding style & lint pass (`pnpm lint`).
- Unit tests cover failure modes (404, malformed XML).
- Manual run `pnpm run ingest --source=openai` ingests ≥ 1 item, visible in dashboard.
- Grafana alert thresholds set (error % > 5 %, latency > 5 min).

---

#### Dependencies

- \#42 “Supabase vector index tuning” (merged)
- \#55 “Grafana datasource for Logflare logs” (in review)

---

### 2 · Implementation Plan (👋 Cursor‑first workflow)

| Phase                      | Cursor instruction                                                                                                           | CLI / Code tasks                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **0 Prep**                 | “Generate a `wave1‑ingestion` branch from `main`.”                                                                           | `git checkout -b wave1-ingestion`                   |
| **1 Source Inserts**       | “Create a SQL migration inserting 13 rows into `sources` with (name, type, endpoint\_url, fetch\_freq\_min, row\_category).” | `supabase migrate new add_wave1_sources` → edit SQL |
| **2 Adapter Stubs**        | “Scaffold TypeScript modules in `packages/adapters/` for each feed, exporting `fetchAndParse()`.”                            | Cursor auto‑creates 13 files                        |
| **3 Parsing Logic**        | “Implement `rssAdapter` generic wrapper; call with feed‑specific slug.”                                                      | Add slug→sourceId util                              |
| **4 PyPI Adapter**         | “Loop over `PYPI_TOP_PACKAGES` env var → fetch `https://pypi.org/p/<pkg>/json` → map releases.”                              | Cache last‑seen version in KV                       |
| **5 HF / arXiv / NeurIPS** | “Use `axios` to hit APIs; map JSON→DTO; sanitize abstracts.”                                                                 | Add `removeLatex.ts` helper                         |
| **6 Tests**                | “Generate Jest skeletons per adapter with fixture XML/JSON in `tests/fixtures/`.”                                            | Add edge‑case fixture                               |
| **7 Cron Wire‑up**         | “Update `ingestCron.ts` switch‑case with new slugs.”                                                                         | Keep concurrency ≤ 4                                |
| **8 Observability**        | “Extend `metrics.ts` to emit `adapter_latency_ms` & `adapter_error`.”                                                        | Grafana regex panels                                |
| **9 Dry Run**              | “Run `pnpm ts-node src/cli/ingest --source=all --dry-run` and show summary.”                                                 | Validate DTO & row diff                             |
| **10 Backfill**            | “Disable `DRY_RUN`, execute ingestion once, check feed UI.”                                                                  | Ensure vector count < 100 k                         |
| **11 PR & Review**         | “Open PR titled **feat: Wave 1 adapters**; auto‑generate changelog section.”                                                 | Assign reviewers                                    |
| **12 Rollout**             | “Merge → GitHub Actions deploy → Vercel staging → promote to prod after 24 h green metrics.”                                 | Monitor alerts                                      |

> **Cursor tip:** prefix each instruction with `@cursor` so Cursor queues the task automatically:
>
> ```ts
> // @cursor TASK: Implement rssAdapter('openai')
> ```

With this issue and plan in place, Wave 1 ingestion can be delivered in a single sprint, bringing real multi‑source content to beta testers.

