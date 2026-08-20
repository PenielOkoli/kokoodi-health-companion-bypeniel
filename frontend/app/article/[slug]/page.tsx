"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../components/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { getArticle, Article } from "@/lib/api";

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const { lang } = useLanguage();
  const [article, setArticle] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setArticle(null);
    setNotFound(false);
    getArticle(params.slug, lang)
      .then(setArticle)
      .catch(() => setNotFound(true));
  }, [params.slug, lang]);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
          ← All articles
        </Link>
        <LanguageSwitcher />
      </div>

      {notFound && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          That article couldn&apos;t be found.
        </p>
      )}

      {article && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {article.topic_name}
          </span>
          <h1 className="mt-1 text-2xl font-bold">{article.title}</h1>
          {!article.has_requested_translation && lang !== "en" && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No {lang === "pcm" ? "Pidgin" : lang} translation yet — showing English.
            </p>
          )}
          <div
            className="prose prose-slate mt-4 max-w-none"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
          <div className="mt-6 flex flex-wrap gap-x-4 text-xs text-slate-400">
            {article.author && <span>By {article.author}</span>}
            {article.last_updated && <span>Updated {article.last_updated}</span>}
          </div>
        </article>
      )}
    </main>
  );
}
