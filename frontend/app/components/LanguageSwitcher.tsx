"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageContext";
import { getLanguages, Language } from "@/lib/api";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [languages, setLanguages] = useState<Language[]>([
    { code: "en", name: "English", is_default: true },
    { code: "pcm", name: "Pidgin", is_default: false },
  ]);

  useEffect(() => {
    getLanguages()
      .then(setLanguages)
      .catch(() => {
        /* fall back to the defaults above if the API isn't reachable yet */
      });
  }, []);

  return (
    <div className="inline-flex rounded-full border border-brand-200 bg-white p-1 text-sm shadow-sm">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-full px-3 py-1 font-medium transition-colors ${
            lang === l.code
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-brand-50"
          }`}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
