"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { getTopics, getArticles, getLanguages, Topic, Article, Language } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Mode = "new" | "translation";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const [mode, setMode] = useState<Mode>("new");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [topicSlug, setTopicSlug] = useState("");
  const [articleId, setArticleId] = useState<number | "">("");
  const [languageCode, setLanguageCode] = useState("en");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");

  const [status, setStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    getTopics().then(setTopics).catch(() => {});
    getArticles("en").then(setArticles).catch(() => {});
    getLanguages().then(setLanguages).catch(() => {});
  }, [unlocked]);

  function resetForm() {
    setTitle("");
    setSummary("");
    setBody("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      if (mode === "new") {
        const res = await fetch(`${API_URL}/api/admin/articles`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
          body: JSON.stringify({
            topic_slug: topicSlug,
            language_code: languageCode,
            title,
            summary: summary || null,
            body,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || "Failed to create article");
        const data = await res.json();
        setStatus({ type: "ok", message: `Created article "${title}" (slug: ${data.slug}).` });
      } else {
        if (!articleId) throw new Error("Pick an article first");
        const res = await fetch(`${API_URL}/api/admin/articles/${articleId}/translations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
          body: JSON.stringify({ language_code: languageCode, title, summary: summary || null, body }),
        });
        if (!res.ok) throw new Error((await res.json()).detail || "Failed to add translation");
        setStatus({ type: "ok", message: `Added ${languageCode} translation.` });
      }
      resetForm();
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!unlocked) {
    return (
      <main className="flex flex-col gap-4">
        <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to site
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-3 text-xl font-bold">Admin</h1>
          <p className="mb-3 text-sm text-slate-600">Enter the admin key to continue.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setUnlocked(true);
            }}
            className="flex gap-2"
          >
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Unlock
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            The key isn&apos;t verified until you submit a form — a wrong key just means the API will reject the request.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to site
        </Link>
        <span className="text-xs text-slate-400">Admin</span>
      </div>

      <div className="inline-flex w-fit rounded-full border border-brand-200 bg-white p-1 text-sm shadow-sm">
        <button
          onClick={() => setMode("new")}
          className={`rounded-full px-3 py-1 font-medium ${mode === "new" ? "bg-brand-600 text-white" : "text-slate-600"}`}
        >
          New article
        </button>
        <button
          onClick={() => setMode("translation")}
          className={`rounded-full px-3 py-1 font-medium ${mode === "translation" ? "bg-brand-600 text-white" : "text-slate-600"}`}
        >
          Add translation
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {mode === "new" ? (
          <label className="flex flex-col gap-1 text-sm">
            Topic
            <select
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select a topic…</option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Article
            <select
              value={articleId}
              onChange={(e) => setArticleId(Number(e.target.value))}
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select an article…</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.topic_name})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Language
          <select
            value={languageCode}
            onChange={(e) => setLanguageCode(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {languages.length > 0
              ? languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))
              : ["en", "pcm", "ig", "yo", "ha"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
          </select>
          <span className="text-xs text-slate-400">
            Not in the list? Type any language code (e.g. &quot;ig&quot;, &quot;yo&quot;, &quot;ha&quot;) — new
            languages don&apos;t need a code change, just a row.
          </span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Summary (optional)
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : mode === "new" ? "Create article" : "Add translation"}
        </button>

        {status && (
          <p className={`text-sm ${status.type === "ok" ? "text-brand-700" : "text-red-600"}`}>
            {status.message}
          </p>
        )}
      </form>
    </main>
  );
}