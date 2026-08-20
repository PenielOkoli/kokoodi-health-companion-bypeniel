"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./components/LanguageContext";
import LanguageSwitcher from "./components/LanguageSwitcher";
import AskBox from "./components/AskBox";
import { getArticles, getTopics, Article, Topic } from "@/lib/api";

export default function HomePage() {
  const { lang } = useLanguage();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    getTopics().then(setTopics).catch(() => setErrored(true));
  }, []);

  useEffect(() => {
    setLoading(true);
    getArticles(lang, activeTopic)
      .then((data) => {
        setArticles(data);
        setErrored(false);
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false));
  }, [lang, activeTopic]);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-700">
            Health Information Companion
          </h1>
          <LanguageSwitcher />
        </div>
        <p className="text-slate-600">
          Plain-language health guidance you can trust — malaria, maternal
          health, nutrition, first aid and more.
        </p>
      </header>

      <AskBox />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTopic(undefined)}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            !activeTopic
              ? "bg-brand-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-brand-50"
          }`}
        >
          All topics
        </button>
        {topics.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActiveTopic(t.slug)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              activeTopic === t.slug
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-brand-50"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {errored && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t reach the content service. Check that the backend is
          running and NEXT_PUBLIC_API_URL is set correctly.
        </p>
      )}

      {loading && !errored && (
        <p className="text-sm text-slate-500">Loading articles…</p>
      )}

      <div className="grid gap-3">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/article/${a.slug}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {a.topic_name}
              </span>
              {!a.has_requested_translation && lang !== "en" && (
                <span className="text-xs text-slate-400">
                  Showing English (no translation yet)
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold">{a.title}</h2>
            {a.summary && (
              <p className="mt-1 text-sm text-slate-600">{a.summary}</p>
            )}
          </Link>
        ))}
        {!loading && !errored && articles.length === 0 && (
          <p className="text-sm text-slate-500">No articles in this topic yet.</p>
        )}
      </div>
    </main>
  );
}
