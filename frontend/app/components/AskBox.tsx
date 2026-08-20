"use client";

import { useState, FormEvent } from "react";
import { askQuestion } from "@/lib/api";

export default function AskBox() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await askQuestion(question.trim());
      setAnswer(result);
    } catch {
      setError("Something went wrong reaching the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-brand-700">
        Ask a health question
      </h2>
      <p className="mb-3 text-sm text-slate-600">
        Answers come only from the articles on this site — not general medical advice.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How do I prevent malaria while pregnant?"
          maxLength={500}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {answer && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-slate-800 shadow-sm">
          {answer}
        </div>
      )}
    </div>
  );
}
