# Carrier Check USA — Master Instructions for Claude Code
> Single source of truth. Read this file IN FULL before starting any task in any session.

---

## SESSION START PROTOCOL (STRICTLY FORBIDDEN to skip)
1. Read this entire file before writing or editing any code.
2. Treat "Standing Behavior Rules" below as binding for the whole session.
3. After completing ANY bug fix or data correction: update the "Bug Tracker" table below (move it to Fixed, note the root cause) and check whether it should become a new line in "Mandatory Validation Checks." Do this BEFORE reporting the task complete.
4. Do not stop to ask clarifying questions before starting a task — make a reasonable assumption, state it in one line, and proceed.

---

## 1. Standing Behavior Rules (always apply)
- One step at a time, concise responses, no long explanations.
- Execute tasks end-to-end rather than just proposing what to do.
- Before any risky multi-file change: create a git backup branch first (e.g. `backup-before-ui-improvements`).
- Subagents: good for independent investigation tasks. Do NOT use for sequential code edits — keep those in a single agent flow.
- Store all FMCSA data exactly as provided in the database. Do NOT filter/clean at the data layer — handle all presentation logic in the UI ("display layering over data filtering").
- Versioned file naming for Python scripts: `-V1.py`, `-V2.py`, etc. — never overwrite, always increment.
- Do not mark a bug "Fixed" without re-running the relevant validation check.

---

## 2. Bug Tracker

### Open
| Issue | Where | Root Cause (if known) |
|---|---|---|
| Active insurance policies missing entirely | Insurance history + status card | ActPendInsur (ypjt-5ydn) was never imported — `load_insurance` reads `dot_number` which that dataset doesn't have. Fixed in `fmcsa_import.py` with new `load_insurance_active`; **data fix requires running `fix_mc_and_fleet.py` then `reimport_insurance.py`** |
| Driver/truck counts wrong (0 for active carriers) | Carrier detail page | `carriers` table has 0/0 — bad initial import. **Fix: run `fix_mc_and_fleet.py`** |
| mc_number still "MC" in database | carriers table | Import pipeline stored prefix without numeric suffix. **Fix: run `fix_mc_and_fleet.py`** (code display guard already done) |
| Raw CFR violation codes shown without translation | Violations table | FMCSA Appendix A xlsx returns 403 — source not yet found |
| Missing inspection dates | Inspection table | Inspections with null inspection_date excluded from all time-bucket views (inRange returns false for null); data issue not yet diagnosed |
| Raw CFR violation codes without plain-English description | Violations table | `cfrDescription()` now shows "description unavailable" label for unrecognised codes. Full fix: run `fetch_cfr_codes.py` (CODES/) → generates `cfr_descriptions.json` from `876r-jsdb` dataset → integrate JSON into `CFR_DESCRIPTIONS` lookup in CarrierDetailView.tsx |
| `boc3` table missing entirely | Table never created or imported | BOC3 = process agent to serve legal papers on. Verified: table does not exist in Supabase. Need to: CREATE TABLE boc3 + import from FMCSA BOC3 dataset. High value for lawyers. |
| `rejected_insurance` table missing entirely | Table never created or imported | Rejected insurance = FMCSA-rejected filings with explicit rejection reason (300-char field). Verified: table does not exist. Need to: CREATE TABLE rejected_insurance + import from Rejected dataset (13&14). Very high litigation value — shows carrier attempted insurance and was rejected. |
| `carrier-portal/AGENTS.md` flagged as potential prompt injection | Repo root | Needs manual review before deletion — do not delete blindly |
| reimport_insurance.py tuple-unpacking bug | Line 282: unpacked 3 values from 4-element DATASETS tuple | Fixed: `for name, dataset_id, default_total, _key in DATASETS` | 2026-06-19 |
| SMS scores all null (0 rows) | FK constraint violation aborted all pages; single-transaction upsert with no pre-filter | `reimport_sms.py`: TRUNCATE + plain batch INSERT with row-by-row FK fallback. 8,727 rows inserted successfully. | 2026-06-19 |
| SMS import missing crash_ind_pct / hazmat_pct | Socrata dataset m3ry-qcip does not include crash indicator or hazmat percentiles | Removed from SCORE_MAP. Only 5 BASIC categories available in this dataset. | 2026-06-19 |
| FMCSA disclaimer missing from report | Never added | Added to bottom of CarrierDetailView.tsx: "Data sourced from FMCSA public records. This report is for informational purposes only and does not constitute legal advice." | 2026-06-19 |

### Fixed
| Issue | Root Cause | Fix | Date |
|---|---|---|---|
| Word-boundary search bug ("cola" matched "COLARADO") | No word-boundary regex | Added word-boundary filtering in search | — |
| Search returning silent empty results | Column name mismatch vs schema.sql | Corrected column names | — |
| "MC #MC" displayed in carrier header | `carriers.mc_number` = literal "MC" placeholder | Display guard: skip mc_number if value equals bare "MC" (`CarrierDetailView.tsx` line ~878) | 2026-06-18 |
| Insurance "Replaced" status → false INACTIVE assertion | `deriveInsuranceBasis` didn't distinguish "Replaced" from "Cancelled" | Returns `status: "unknown"` + amber "VERIFY WITH FMCSA" card instead of asserting INACTIVE | 2026-06-18 |
| Active insurance policies asserted INACTIVE when no active record found | ActPendInsur not imported; only InsHist in DB | Code: checks for any directly-active policy first. Data fix pending (re-import) | 2026-06-18 |
| Same insurance policy showing duplicate rows | Same policy_number+effective_date from multiple FMCSA datasets | `dedupedInsurance` IIFE in `CarrierDetailView.tsx` deduplicates by policy_number+effective_date, keeps later cancel date | 2026-06-18 |
| Duplicate rows in Revocation History (2-3× per event) | `carrier_alerts` has duplicate rows per INVOLUNTARY_REVOCATION event | `revocations` IIFE deduplicates by event_date | 2026-06-18 |
| Fleet 0/0 shown with no warning | No validation | Amber ⚠ warning box shown when total_drivers = 0 and total_trucks = 0 | 2026-06-18 |
| Authority ACTIVE + Insurance INACTIVE with no warning | No contradiction check | Amber contradiction callout added below status cards | 2026-06-18 |
| Old inactive carrier — no note about long dormancy gap | Basis text didn't mention gap | `deriveInsuranceBasis` + `deriveAuthorityBasis` append note when 3+ year gap before accident date | 2026-06-18 |
| `load_insurance_active` missing — ActPendInsur not loaded | `fmcsa_import.py` used same `load_insurance` for both InsHist and ActPendInsur; ActPendInsur has `prefix_docket_number` not `dot_number` | New `load_insurance_active` function builds docket→DOT mapping from carriers table; `reimport_insurance.py` updated to match | 2026-06-18 |
| mc_number zero-padding mismatch | `load_carriers` built "MC74" but ActPendInsur stores "MC000074" | `load_carriers` now zero-pads: `number.zfill(6)` | 2026-06-18 |
| Insurance lapses not flagged | No gap-detection logic | Added `insuranceLapses` + `accidentInLapse` computed in main component; red warning card shown when accident date falls within a BI&PD coverage gap | 2026-06-19 |
| Null SMS scores render as "0th percentile" | Null treated as 0 | ScoreRow already shows "Not Available" for null/0. Added "No SMS scores published by FMCSA..." message when sms prop is null entirely | 2026-06-19 |
| Duplicate crash history rows | Dedup only by report_number; crashes with null report_number not deduped | Fallback key = crash_date\|state\|fatal\|injury\|towaway when report_number is null | 2026-06-19 |
| Insurance/authority bucket filter missed pre-existing policies | inRange(effective_date) only matched policies that STARTED in the bucket | Fixed: shows any policy active at any point during the bucket (eff <= bucketEnd AND cancel >= bucketStart or null) | 2026-06-19 |
| Raw codes (e.g. "91X") appearing unexplained | INSURANCE_FORM_CODES lookup missing some codes | All known FMCSA form codes already in INSURANCE_FORM_CODES (34, 82, 83, 84, 85, 85C, 91, 91X). insuranceTypeLabel() falls back to raw code only for unknown codes | 2026-06-19 |
| Stale 1990-era safety ratings showing as current | No age warning | Amber ⚠ warning shown for ratings > 10 years old (already implemented in prior session) | 2026-06-19 |
| Revocation History section frequently empty | No data in carrier_alerts | Section already hidden when empty (`bucketRevocations.length > 0` gate) | 2026-06-19 |
| Accident date filter may not be live | Deploy timing concern | Verified in code: useState + onChange + TimeBucketSection props all correctly wired | 2026-06-19 |

---

## 3. Mandatory Validation Checks (run after every data import AND before showing any carrier page)
A carrier record must FAIL validation and show a visible warning if any of these are true:
1. `driver_count = 0` AND `truck_count = 0` → amber ⚠ warning "Fleet size shows 0 — verify with FMCSA." (Implemented.)
2. `sms_score IS NULL` → show "No score available," never "0" or "0th percentile."
3. Gap between `policy_end_date` and next `policy_start_date` → flag "Insurance lapse: X days," never skip silently.
4. Same `crash_id` (or same date + report number) appears more than once → dedupe before display.
5. `inspection_date IS NULL` → exclude from display or flag explicitly, never show blank.
6. Inspection has zero violations → exclude from violations list display (keep in raw data).
7. Authority/insurance dates logically inconsistent → flag visibly. (Authority=ACTIVE + Insurance=INACTIVE/UNKNOWN contradiction check implemented.)
8. Any raw CFR code shown must have a plain-English description beside it. If lookup fails: "Code: X (description unavailable)" — never a bare code.
9. Same insurance policy number or authority record appears with conflicting/overlapping effective dates → dedupe, do not display as separate valid entries. (Component-level dedup done; import-level dedup pending.)
10. Insurance most recent policy has `status = "Replaced"` and no active successor found → amber "VERIFY WITH FMCSA." (Implemented.)
11. `mc_number = "MC"` bare placeholder → do not display; show nothing. (Display guard implemented; data fix pending.)

---

## 4. Import Pipeline — Run Order & Key Facts
- Main script: `CODES/fmcsa_import.py`
- Insurance reimport: `CODES/reimport_insurance.py`
- Carrier field backfill: `CODES/fix_mc_and_fleet.py`

**Pipeline run status (as of 2026-06-19):**
```
python fix_mc_and_fleet.py       # DONE 2026-06-19 — 1,122,316 carriers updated
python reimport_insurance.py     # RUNNING 2026-06-19 — ~150 pages, ETA ~50min
python reimport_sms.py           # DONE 2026-06-19 — 8,727 rows inserted
python fetch_cfr_codes.py        # NOT YET RUN — run manually, then integrate JSON into UI
```

**To run CFR codes fetch (one-time, ~2 min):**
```
cd CODES
python fetch_cfr_codes.py        # generates cfr_descriptions.json
# Then tell Claude to integrate it into CarrierDetailView.tsx CFR_DESCRIPTIONS
```

**ActPendInsur specifics:**
- Dataset: `ypjt-5ydn`
- Uses `prefix_docket_number` (e.g. "MC771154") — no `dot_number` field
- `load_insurance_active` in `fmcsa_import.py` handles this via a carriers-table lookup
- Requires `carriers.mc_number` to be correctly zero-padded first (run `fix_mc_and_fleet.py`)

---

## 5. Information Design Rules
Display pre-interpreted summaries, not raw fields:
- `OOS: 5` → `5 Out-of-Service events — OOS Rate: 27.8% (above national average)`
- `Insurance History` → `Current policy active · 2 prior cancellations · Longest gap: 43 days`
- `Authority History` → `Active today · Revoked twice · Most recent revocation: 14 Mar 2022`

Frame data as answers to lawyer questions, not database fields:
- `Violation Count: 43` → "Has this carrier shown a pattern of safety violations?" → "Yes. 43 violations across 18 inspections. 5 OOS events. Repeated brake violations in 2023 and 2025."

All abbreviations (OOS, BASIC, MCS-150, SMS, etc.) need a tooltip/hover plain-English explanation. No raw FMCSA codes shown anywhere without explanation.

## 6. Formatting Standards
- All dates: DD MMM YYYY, everywhere, no exceptions.
- State abbreviations expanded to full names everywhere.
- Every report must show: *"Data sourced from FMCSA public records. This report is for informational purposes only and does not constitute legal advice."*

## 7. Reference Materials (treat as authoritative, don't re-derive)
- `LITIGATION_CONTEXT.md` — lawyer workflow mapping, feature status, market positioning.
- "Understanding Motor Carrier Claims" by Fried Goldberg — cross-check report structure/framing against this.
- FMCSA dataset field-level documentation exists in `CODES/CLAUDE.md` and `carrier-portal/CLAUDE.md` (16 datasets) — reference, don't redo.

## 8. Commercial Context (for prioritization judgment calls)
- Montgomery v. Caribe Transport (May 2026 SCOTUS ruling) drives demand for historical date-specific carrier profiles — accident-date filter is top priority.
- No competitor (Carrier411, Highway/RMIS, LexisNexis, FMCSA SAFER) offers historical date-specific snapshots — this is the moat. Don't spend effort matching current-snapshot-only features; prioritize anything strengthening the historical/date-specific angle.

---

## 9. Other Backlog (lower priority)
- Authority history dedup: 21,311 dup groups (import-level fix needed).
- Insurance dedup: 63,621 dup groups (import-level fix needed; component-level dedup is a stopgap).
- Supabase compute downgrade Small → Micro/Nano (already initiated).
- Stripe integration (deprioritized; pricing: solo ~$199/mo, small firm ~$399/mo, large firm ~$799/mo).
