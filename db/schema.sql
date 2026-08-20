-- Kokoodi Health Information Companion — schema
-- Design goal: adding a new language (Igbo, Yoruba, Hausa) or a new article
-- is an INSERT, never an ALTER. Content lives in article_translations,
-- keyed by (article_id, language_code) — language is data, not a column.

create table if not exists languages (
    code        text primary key,       -- 'en', 'pcm', later 'ig', 'yo', 'ha'
    name        text not null,          -- 'English', 'Nigerian Pidgin'
    is_default  boolean not null default false
);

create table if not exists topics (
    id      serial primary key,
    slug    text unique not null,       -- 'malaria', 'maternal-health'
    name    text not null               -- 'Malaria', 'Maternal Health'
);

create table if not exists articles (
    id              serial primary key,
    topic_id        integer not null references topics(id),
    slug            text unique not null,
    status          text not null default 'published', -- 'published' | 'draft'
    author          text,
    last_updated    date,                -- nullable: source data had blanks
    source_row_ids  integer[],           -- traceability back to the raw CSV rows this was merged from
    created_at      timestamptz not null default now()
);

-- One row per (article, language). This is the extensibility point:
-- new language for an existing article = new row here, nothing else changes.
create table if not exists article_translations (
    id              serial primary key,
    article_id      integer not null references articles(id) on delete cascade,
    language_code   text not null references languages(code),
    title           text not null,
    summary         text,
    body            text not null,       -- sanitized HTML (p, strong, em, br only)
    unique (article_id, language_code)
);

create index if not exists idx_translations_lookup
    on article_translations (article_id, language_code);

create index if not exists idx_articles_topic
    on articles (topic_id) where status = 'published';
