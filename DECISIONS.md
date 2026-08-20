# Decision Document — Health Information Companion

## 1. How I interpreted the brief

The brief is deliberately open about *what* to build beyond the core six requirements, so I
scoped it as: a small, reliable public site over a clean content API, plus one AI feature that
is genuinely trustworthy rather than flashy. I did not build an admin UI (explicitly optional),
multi-language support beyond English/Pidgin (explicitly future work — Igbo/Yoruba/Hausa), or
user accounts/auth (not asked for). The brief itself warns against gold-plating a 6-10 hour
weekend project, and I took that at face value: the two things that are actually being marked —
a data model that survives new languages without a rewrite, and sound judgment about messy
data — got the time; visual polish and extra features did not.

## 2. How I handled the supplied data

`health-content.csv` had five distinct problems, all handled in `scripts/clean_data.py` (not
by hand — the script is re-runnable if the charity sends an updated export):

- **Inconsistent topic casing/spelling** ("Malaria" / "malaria " / "MALARIA PREVENTION" /
  "Nutriton") → mapped to 8 canonical topics via an explicit lookup table.
- **Inconsistent status values** ("published" / "Published" / "TRUE" / "yes") → normalized to a
  boolean; only published rows ship to the public app (2 drafts, ids 7 and 23, are excluded —
  one of them had a blank title anyway, which stopped being a problem once it was filtered).
- **Dates in four formats** (ISO, `DD/MM/YYYY`, `"Jan 2025"`, `"2nd April 2025"`) → parsed to a
  single `date` column; one row (id 20) had no date at all, stored as `NULL` rather than
  invented, and the frontend just omits the "updated" line for it.
- **HTML embedded in body text** → sanitized to a small safe allow-list (`p`, `strong`, `em`,
  `br`), everything else stripped, so the frontend can render it directly without a raw-HTML risk.
- **Duplicate/near-duplicate entries** → found three clusters by inspection, not just the "a
  few" the brief hints at:
  - ids 4/5 ("Antenatal visits" / "Antenatal care")
  - ids 8/9/24 ("Wash your hands" / "Handwashing" / "washing hands") — a **triple**, not a pair
  - ids 14/15 ("Vaccines for children" / "Immunization schedule")

  For each cluster I kept the most complete row as canonical and recorded the merged-away ids
  in a `source_row_ids` array column on the article, so the merge is traceable rather than
  silently lossy. Pidgin translations attached to a merged-away id were re-pointed to the
  surviving canonical article.
- **Inconsistent title casing** (ALL CAPS and lowercase-first mixed with normal sentence case)
  → normalized to sentence case for a consistent public-facing look.

Result: 24 raw rows → 18 clean published articles. The full machine-generated report is in
`db/cleaning_report.md`, regenerated every time the script runs.

## 3. How content and translations are stored, and how to add a language later

Three tables, deliberately normalized so **growth is always an INSERT, never an ALTER**:

- `topics` — one row per topic.
- `articles` — the language-independent facts about a piece of content (topic, status, author,
  date, and `source_row_ids` for traceability). No title or body lives here.
- `article_translations` — one row per `(article_id, language_code)` pair. This is where
  title/summary/body actually live.

To add Igbo, Yoruba, or Hausa: insert a row into `languages`, then insert
`article_translations` rows for whichever articles have been translated. No schema change, no
code change — the API's fallback query (see below) already handles partial coverage for any
number of languages. To add a new article: insert into `articles` plus at least one
`article_translations` row. An admin UI could be bolted directly onto this schema later without
any rework, which was the actual point of designing it this way.

Language fallback is enforced in one SQL query in the backend, not scattered across the
frontend:

```sql
coalesce(tr_lang.title, tr_en.title) as title
-- (same pattern for summary/body)
```

Request Pidgin, and if a translation row exists you get it; if it doesn't, you silently get
English. The API also returns `has_requested_translation` so the frontend can show a small
"not yet translated" notice without the fallback ever breaking the page.

## 4. Architecture

- **Frontend** — Next.js (App Router, TypeScript, Tailwind). Client-side language state
  (persisted to `localStorage`) drives which language every fetch requests.
- **Backend** — FastAPI. Sole owner of `DATABASE_URL` and `GROQ_API_KEY`; the browser never
  sees either. Five endpoints: topics, languages, article list (with optional topic filter),
  single article, and the ask-a-question endpoint.
- **Content store** — Supabase Postgres. Chosen over Airtable/Sheets because the
  language-fallback logic is genuinely simpler and more robust as one SQL query than as
  client-side merge logic against a spreadsheet API, and it's still something a non-technical
  editor could eventually get a simple admin UI in front of.
- **AI** — Groq (Llama 3.3 70B). The whole published corpus (18 articles, ~2KB of text) is
  passed as context on every request rather than built as a retrieval/vector-search pipeline —
  at this scale a vector DB would be pure overhead with no accuracy benefit, and skipping it
  bought time for correctness elsewhere. That tradeoff stops making sense once the charity has
  hundreds of articles, which is called out below as a "next week" item.
- **Deploy** — Vercel (frontend), Railway or Render (backend), Supabase (Postgres).

Main trade-off: everything is a synchronous, un-cached request per page load. Fine at this
content scale (18 articles); the first thing to add under real traffic would be caching on the
article-list endpoint.

## 5. How I used AI to build this

I built this with Claude (Anthropic), pairing on the schema design, the cleaning script, both
services, and this document. Two concrete things it got wrong that I had to catch and fix:

- The first cut of `requirements.txt` pinned `groq==0.11.0`, which turned out to be
  incompatible with the current `httpx` release — the app crashed on startup with
  `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`. Caught by
  actually loading the app in a clean virtualenv rather than trusting the pin; fixed by bumping
  to `groq==1.6.0`.
- The first version of `seed.sql` used psql's `\gset` meta-command to capture an inserted
  article's id for the following translation inserts. That only works via the `psql` CLI — it
  silently does nothing useful in Supabase's browser SQL editor, which is how most people would
  actually run this file. Rewrote it as portable `WITH ... INSERT ... RETURNING` CTEs, which
  run as plain SQL anywhere.

Neither would have been obvious without actually running the code end-to-end (I loaded the
schema and seed into a real local Postgres and hit every endpoint with a test client before
trusting any of it) rather than reading it and assuming it worked.

## 6. What I'd do next with another week

- Retrieval instead of full-context for the AI feature, once the article count grows past what
  comfortably fits in one prompt.
- A minimal admin view for the content team (the schema already supports it — this was
  deliberately deferred, not designed around).
- Igbo/Yoruba/Hausa translation rows, and a per-language completeness dashboard so the charity
  can see translation coverage at a glance.
- Basic analytics on which articles/questions come up most, to guide what the charity writes
  next.
- Automated tests for the cleaning script and API (currently verified manually against a real
  Postgres instance, not committed as a test suite).
