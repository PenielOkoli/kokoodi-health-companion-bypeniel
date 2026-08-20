const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Topic = { slug: string; name: string };

export type Article = {
  id: number;
  slug: string;
  topic_slug: string;
  topic_name: string;
  title: string;
  summary: string | null;
  body: string;
  author: string | null;
  last_updated: string | null;
  has_requested_translation: boolean;
};

export type Language = { code: string; name: string; is_default: boolean };

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export const getTopics = () => apiFetch<Topic[]>("/api/topics");
export const getLanguages = () => apiFetch<Language[]>("/api/languages");
export const getArticles = (lang: string, topic?: string) =>
  apiFetch<Article[]>(`/api/articles?lang=${lang}${topic ? `&topic=${topic}` : ""}`);
export const getArticle = (slug: string, lang: string) =>
  apiFetch<Article>(`/api/articles/${slug}?lang=${lang}`);

export async function askQuestion(question: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Ask failed: ${res.status}`);
  const data = await res.json();
  return data.answer;
}
