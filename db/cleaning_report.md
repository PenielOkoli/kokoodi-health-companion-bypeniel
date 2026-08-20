# Data cleaning report (auto-generated)

- 24 raw rows in health-content.csv.
- 2 dropped as drafts/unpublished (ids [7, 23]) — not shown in the public app.
- Merged 4 near-duplicate rows into 3 canonical articles. Clusters found: [4, 5] -> kept id 4; [8, 9, 24] -> kept id 8; [14, 15] -> kept id 14. Note: ids 8/9/24 (handwashing) is a *triple* duplicate, not just a pair.
- 18 articles remain after de-duplication.
- Titles normalized to sentence case (source mixed Title Case, ALL CAPS, and lowercase-first inconsistently for the same style of content).
- Row(s) [20] had a blank last_updated date; stored as NULL, frontend simply omits the 'last updated' line rather than faking a date.
- 10 of 24 source articles have a Pidgin translation (10/18 of the final published+deduped set). The rest fall back to English in the UI.
