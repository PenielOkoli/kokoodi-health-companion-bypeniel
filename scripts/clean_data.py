"""
Cleans health-content.csv + pidgin-translations.csv into db/seed.sql,
and writes db/cleaning_report.md documenting every decision made —
this report is the source for the Decision Document's "how you handled
the supplied data" section.

Run: python3 clean_data.py
"""
import csv
import re
from datetime import datetime
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).parent
OUT_DIR = HERE.parent / "db"

# ---------------------------------------------------------------------------
# 1. Topic normalization — every raw variant seen in the CSV, mapped to one
#    canonical (slug, name) pair. New topics later just need a new entry here
#    (or, in the app proper, a row in `topics`) — no schema change.
# ---------------------------------------------------------------------------
TOPIC_MAP = {
    "malaria": ("malaria", "Malaria"),
    "malaria prevention": ("malaria", "Malaria"),
    "maternal health": ("maternal-health", "Maternal Health"),
    "nutrition": ("nutrition", "Nutrition"),
    "nutriton": ("nutrition", "Nutrition"),  # typo in source
    "hygiene": ("hygiene", "Hygiene"),
    "clean water": ("clean-water", "Clean Water"),
    "first aid": ("first-aid", "First Aid"),
    "immunisation": ("immunisation", "Immunisation"),
    "family planning": ("family-planning", "Family Planning"),
}

STATUS_PUBLISHED = {"published", "true", "yes"}
STATUS_DRAFT = {"draft"}

# Clusters of near-duplicate rows (by source id) found by inspection.
# For each cluster we keep the most complete/informative row as canonical
# and record the rest in source_row_ids for traceability.
DUPLICATE_CLUSTERS = [
    {4, 5},      # Antenatal visits / Antenatal care
    {8, 9, 24},  # Wash your hands / Handwashing / washing hands (triple, not just a pair)
    {14, 15},    # Vaccines for children / Immunization schedule
]
# which id to keep as canonical per cluster (the more complete row)
CANONICAL_PICK = {4: 4, 8: 8, 14: 14}


def slugify(text: str) -> str:
    text = re.sub(r"&amp;", "and", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text


def sanitize_html(raw: str) -> str:
    """Keep only a small safe allowlist of tags; strip everything else."""
    if not raw:
        return raw
    raw = raw.replace("&amp;", "&")
    allowed = {"p", "strong", "em", "br"}

    def strip_tag(m):
        tag = m.group(1).lower().lstrip("/")
        return m.group(0) if tag in allowed else ""

    return re.sub(r"</?([a-zA-Z0-9]+)[^>]*>", strip_tag, raw)


def parse_date(raw: str):
    """Source data has 4+ date formats. Returns ISO date string or None."""
    if not raw or not raw.strip():
        return None
    raw = raw.strip()
    formats = ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    # "Jan 2025" -> first of month
    m = re.match(r"^([A-Za-z]{3,9})\s+(\d{4})$", raw)
    if m:
        try:
            return datetime.strptime(f"1 {m.group(1)} {m.group(2)}", "%d %b %Y").date().isoformat()
        except ValueError:
            try:
                return datetime.strptime(f"1 {m.group(1)} {m.group(2)}", "%d %B %Y").date().isoformat()
            except ValueError:
                pass
    # "2nd April 2025" -> strip ordinal suffix
    m = re.match(r"^(\d{1,2})(st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})$", raw)
    if m:
        try:
            return datetime.strptime(f"{m.group(1)} {m.group(3)} {m.group(4)}", "%d %B %Y").date().isoformat()
        except ValueError:
            pass
    return None


def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def main():
    report_lines = []
    rows = []
    with open(HERE / "health-content.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            row = {k: (v.strip() if v else v) for k, v in row.items()}
            row["id"] = int(row["id"])
            rows.append(row)

    # --- normalize each row ---
    dropped_drafts = []
    kept = []
    for row in rows:
        status_raw = (row["status"] or "").strip().lower()
        is_published = status_raw in STATUS_PUBLISHED
        if not is_published:
            dropped_drafts.append(row["id"])
            continue  # only published content ships to the public app

        topic_key = (row["topic"] or "").strip().lower()
        if topic_key not in TOPIC_MAP:
            raise ValueError(f"Unmapped topic: {row['topic']!r} on row {row['id']}")
        topic_slug, topic_name = TOPIC_MAP[topic_key]

        row["_topic_slug"] = topic_slug
        row["_topic_name"] = topic_name
        row["_date"] = parse_date(row["last_updated"])
        row["_body"] = sanitize_html(row["body"])
        title_clean = sanitize_html(row["title"]).replace("&amp;", "&")
        row["_title"] = title_clean[:1].upper() + title_clean[1:].lower() if title_clean else title_clean
        kept.append(row)

    report_lines.append(f"- {len(rows)} raw rows in health-content.csv.")
    report_lines.append(
        f"- {len(dropped_drafts)} dropped as drafts/unpublished (ids {sorted(dropped_drafts)}) — "
        f"not shown in the public app."
    )

    # --- merge duplicate clusters ---
    dropped_ids = set()
    merge_map = {}  # source id -> canonical id
    for cluster in DUPLICATE_CLUSTERS:
        present = cluster & {r["id"] for r in kept}
        if not present:
            continue
        canonical = CANONICAL_PICK.get(min(present), min(present))
        if canonical not in present:
            canonical = min(present)
        for rid in present:
            merge_map[rid] = canonical
            if rid != canonical:
                dropped_ids.add(rid)

    final_rows = [r for r in kept if r["id"] not in dropped_ids]
    for r in final_rows:
        r["_source_ids"] = sorted(
            [rid for rid, canon in merge_map.items() if canon == r["id"]]
        ) or [r["id"]]

    report_lines.append(
        f"- Merged {len(dropped_ids)} near-duplicate rows into {len(merge_map) - len(dropped_ids)} "
        f"canonical articles. Clusters found: "
        + "; ".join(
            f"{sorted(c)} -> kept id {CANONICAL_PICK.get(min(c), min(c))}"
            for c in DUPLICATE_CLUSTERS
        )
        + ". Note: ids 8/9/24 (handwashing) is a *triple* duplicate, not just a pair."
    )
    report_lines.append(f"- {len(final_rows)} articles remain after de-duplication.")
    report_lines.append(
        "- Titles normalized to sentence case (source mixed Title Case, ALL CAPS, and "
        "lowercase-first inconsistently for the same style of content)."
    )

    # blank last_updated
    no_date = [r["id"] for r in final_rows if r["_date"] is None]
    if no_date:
        report_lines.append(
            f"- Row(s) {no_date} had a blank last_updated date; stored as NULL, "
            f"frontend simply omits the 'last updated' line rather than faking a date."
        )

    # --- pidgin translations, keyed by original article_id ---
    pcm_by_id = {}
    with open(HERE / "pidgin-translations.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pcm_by_id[int(row["article_id"])] = row

    covered, remapped_from_dropped = [], []
    for old_id, pcm in list(pcm_by_id.items()):
        canon = merge_map.get(old_id, old_id)
        if canon != old_id:
            remapped_from_dropped.append((old_id, canon))

    report_lines.append(
        f"- {len(pcm_by_id)} of {len(rows)} source articles have a Pidgin translation "
        f"({len(pcm_by_id)}/{len(final_rows)} of the final published+deduped set). "
        f"The rest fall back to English in the UI."
    )
    if remapped_from_dropped:
        report_lines.append(
            f"- Pidgin translations attached to a row that got merged away were re-pointed "
            f"to the surviving canonical article: {remapped_from_dropped}."
        )

    # --- emit SQL ---
    topics_seen = {}
    for r in final_rows:
        topics_seen[r["_topic_slug"]] = r["_topic_name"]

    sql = []
    sql.append("-- Auto-generated by scripts/clean_data.py. Do not hand-edit; re-run the script instead.\n")
    sql.append("insert into languages (code, name, is_default) values")
    sql.append("  ('en', 'English', true),")
    sql.append("  ('pcm', 'Nigerian Pidgin', false)")
    sql.append("on conflict (code) do nothing;\n")

    sql.append("insert into topics (slug, name) values")
    topic_vals = ",\n".join(f"  ({esc(slug)}, {esc(name)})" for slug, name in topics_seen.items())
    sql.append(topic_vals)
    sql.append("on conflict (slug) do nothing;\n")

    for r in final_rows:
        source_ids_sql = "ARRAY[" + ",".join(str(i) for i in r["_source_ids"]) + "]"
        pcm = pcm_by_id.get(next((old for old, c in merge_map.items() if c == r['id']), r['id'])) or pcm_by_id.get(r['id'])

        # Portable single-statement pattern (WITH ... INSERT ... RETURNING id, then
        # a second INSERT selecting from it) — runs as plain SQL in the Supabase
        # SQL editor or any Postgres client, no psql-specific meta-commands.
        stmt = [
            "with new_article as (",
            "  insert into articles (topic_id, slug, status, author, last_updated, source_row_ids)",
            f"  select id, {esc(slugify(r['_title']) + '-' + str(r['id']))}, 'published',",
            f"    {esc(r['author'] or None)}, {esc(r['_date'])}, {source_ids_sql}",
            f"  from topics where slug = {esc(r['_topic_slug'])}",
            "  returning id",
            ")",
            "insert into article_translations (article_id, language_code, title, summary, body)",
            f"select id, 'en', {esc(r['_title'])}, {esc(r['summary'] or None)}, {esc(r['_body'])} from new_article",
        ]
        if pcm:
            stmt.append("union all")
            stmt.append(f"select id, 'pcm', {esc(pcm['title'])}, NULL, {esc(pcm['body'])} from new_article")
        stmt[-1] += ";\n"
        sql.append("\n".join(stmt))

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "seed.sql").write_text("\n".join(sql), encoding="utf-8")
    (OUT_DIR / "cleaning_report.md").write_text(
        "# Data cleaning report (auto-generated)\n\n" + "\n".join(report_lines) + "\n",
        encoding="utf-8",
    )
    print("\n".join(report_lines))
    print(f"\nWrote {OUT_DIR/'seed.sql'} and {OUT_DIR/'cleaning_report.md'}")


if __name__ == "__main__":
    main()
