# Health Information Companion

A small full-stack app that turns a Nigerian health-education charity's messy content export
into a clean, bilingual (English / Nigerian Pidgin) public site, with an AI "ask a health
question" feature grounded only in the published articles.

Built for the Kokoodi Software Engineering Internship technical assessment. See
[`DECISIONS.md`](./DECISIONS.md) for the write-up of how and why.

## Stack

- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind) — `/frontend`
- **Backend**: FastAPI (Python) — `/backend`
- **Database**: Postgres (built for Supabase) — `/db`
- **AI**: Groq (Llama 3.3 70B) for the ask-a-question feature

## Project layout

```
db/            schema.sql, the generated seed.sql, and the cleaning report
scripts/       clean_data.py — turns the raw CSVs into seed.sql
backend/       FastAPI app
frontend/      Next.js app
DECISIONS.md   the decision document
```

## 1. Set up the database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `db/schema.sql`, then `db/seed.sql` (in that order).
3. Grab your connection string from **Project Settings → Database → Connection string → URI**
   (the "Session pooler" variant works well for this). You'll need it as `DATABASE_URL`.

If the charity's content changes, re-run `python3 scripts/clean_data.py` from inside `scripts/`
to regenerate `db/seed.sql`, then re-run it in the SQL editor.

## 2. Run the backend locally

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL and GROQ_API_KEY (console.groq.com/keys)
export $(cat .env | xargs)
uvicorn main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API docs.

## 3. Run the frontend locally

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Visit `http://localhost:3000`.

## 4. Deploy

**Backend → Railway or Render**
- New project from this GitHub repo, root directory `backend`.
- It will pick up `Procfile` and `requirements.txt` automatically.
- Set env vars: `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL` (optional), and once you know your
  Vercel URL, `FRONTEND_ORIGIN` (so CORS isn't wide open in production).

**Frontend → Vercel**
- New project from this GitHub repo, root directory `frontend`.
- Set env var `NEXT_PUBLIC_API_URL` to your deployed backend URL.
- Deploy.

**Then**: go back to Railway/Render and set `FRONTEND_ORIGIN` to your actual Vercel URL, and
redeploy the backend so CORS is locked to your real frontend rather than `*`.

## 5. Push to GitHub

```bash
cd kokoodi-health-companion
git init
git add .
git commit -m "Health Information Companion — Kokoodi assessment"
git branch -M main
git remote add origin https://github.com/PenielOkoli/<your-repo-name>.git
git push -u origin main
```
