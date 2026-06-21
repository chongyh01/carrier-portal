# Carrier Check USA — Consolidated Claude Code Instructions Log
> Compiled from chat history 27 May – 18 Jun 2026.

---

## 1. Standing Behavior Rules (always apply)
- Proceed without stopping to ask clarifying questions mid-task. Use wording "STRICTLY FORBIDDEN" to ask questions — softer phrasing did not work.
- One step at a time, concise responses, no long explanations (user preference).
- Execute tasks end-to-end rather than just proposing what to do.
- Before any risky multi-file change: create a git backup branch first (e.g. `backup-before-ui-improvements`).
- Subagents: good for independent investigation tasks. Do NOT use subagents for sequential code edits — keep those in a single agent flow.
- Store all FMCSA data exactly as provided in the database. Do NOT filter/clean at the data layer — handle all presentation logic in the UI ("display layering over data filtering").
- Versioned file naming for Python scripts: `-V1.py`, `-V2.py`, etc. — never overwrite, always increment.

---

## 2. Data Accuracy Rules
- Every data section on the carrier detail page must show: **Source label** + **Last Updated date**.
- Null SMS scores must display "No score available" — never "0" or "0th percentile" (lawyers will misread 0 as a perfect safety score).
- Zero-value driver/truck counts likely mean missing data — display amber ⚠ warning, not "0". (Implemented.)
- Insurance gaps between policy end date and next policy start date must be flagged explicitly: "Insurance lapse: X days."
- Duplicate crash/authority/insurance rows must be deduped before display.
- Clean inspections with zero violations should be excluded from the displayed inspection list.
- Missing inspection dates: exclude from display or flag explicitly.
- Authority/insurance date inconsistencies must be flagged visibly. (Contradiction check implemented.)
- Raw CFR violation codes must never display without plain-English description.
- Revocation History section frequently empty — consider hiding when empty.

## 3. Information Design Rules
Display pre-interpreted summaries, not raw numbers/fields:
- `OOS: 5` → `5 Out-of-Service events — OOS Rate: 27.8% (above national average)`
- `Insurance History` → `Current policy active · 2 prior cancellations · Longest gap: 43 days`
- `Authority History` → `Active today · Revoked twice · Most recent revocation: 14 Mar 2022`

Frame all data as answers to lawyer questions, not database fields.

All abbreviations (OOS, BASIC, MCS-150, SMS, etc.) need a tooltip/hover plain-English explanation.

## 4. Formatting Standards
- All dates: DD MMM YYYY format, everywhere, no exceptions.
- State abbreviations expanded to full names everywhere on the carrier detail page.
- Disclaimer required on every report: *"Data sourced from FMCSA public records. This report is for informational purposes only and does not constitute legal advice."*

## 5. Validation Checker
See `KNOWN_ISSUES.md` — Mandatory Validation Checks section.

## 6. Import Pipeline — Key Facts (as of 18 Jun 2026)
- Main script: `CODES/fmcsa_import.py`
- Insurance reimport: `CODES/reimport_insurance.py`
- Carrier field backfill: `CODES/fix_mc_and_fleet.py` (NEW — run this first before ActPendInsur import)
- **Run order when fixing insurance data:**
  1. `python fix_mc_and_fleet.py` — fixes mc_number and fleet sizes
  2. `python reimport_insurance.py` — re-imports InsHist + ActPendInsur (uses mc_number for docket→DOT lookup)
- ActPendInsur (ypjt-5ydn) uses `prefix_docket_number` not `dot_number` — `load_insurance_active` handles this
- Zero-padded mc_number format: "MC771154", "MC000074" (6-digit suffix) — matches ActPendInsur format

## 7. Feature/Build History (context)
- Accident date filter — built across `types.ts`, `page.tsx`, `CarrierDetailView.tsx`.
- 24-month timeline analysis — triggered by accident date filter.
- Word-boundary search bug — fixed.
- CFR code plain-English mapping — blocked (FMCSA Appendix A xlsx returns 403).
- SMS scores — all null, needs fresh re-import.
- `imported_at` / last-updated columns — added to all major tables.

## 8. Reference Materials (authoritative)
- `LITIGATION_CONTEXT.md` — lawyer workflow mapping, feature status, market positioning.
- `KNOWN_ISSUES.md` — active bug tracking.
- `CLAUDE.md` — stack, DB schema, task list.
- `CODES/CLAUDE.md` — import pipeline reference + FMCSA dataset field specs.

## 9. Commercial Context
- Montgomery v. Caribe Transport (May 2026 Supreme Court ruling) → demand for historical date-specific carrier profiles.
- No competitor offers historical date-specific snapshots — this is the product moat.
- Prioritize anything that strengthens the accident-date / historical-snapshot angle.
