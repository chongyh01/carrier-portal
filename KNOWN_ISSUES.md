# Known Issues & Validation Checklist

> Read this file FIRST in every session, before writing or editing code.
> When you fix a bug, add it below under "Fixed" with the root cause.
> When you find a NEW bug, add it under "Open" immediately — do not wait until end of session.

---

## STRICTLY FORBIDDEN
- Do not ask clarifying questions before starting a task. Make a reasonable assumption, state it in one line, and proceed.
- Do not mark an issue "Fixed" without re-running the validation check for it.

---

## Open Issues (fix before shipping)

| Issue | Where | Root Cause (if known) |
|---|---|---|
| Zero-value driver/truck counts displayed | Carrier detail page | `load_carriers` CSV may have read wrong columns; backfill via `fix_mc_and_fleet.py` required |
| Insurance active policies missing | Insurance history section | ActPendInsur (`ypjt-5ydn`) not imported — `load_insurance` was reading `dot_number` field which doesn't exist in that dataset. Fixed in `fmcsa_import.py` with new `load_insurance_active`; requires re-import |
| mc_number shows "MC #MC" | Carrier detail header | `carriers.mc_number = "MC"` placeholder stored when numeric suffix was missing. Code fix done (display guard); data fix via `fix_mc_and_fleet.py` + carrier re-import |
| Raw CFR violation codes shown without translation | Violations table | FMCSA Appendix A xlsx returns 403 |
| [CRITICAL] Revocation data gap | carrier_alerts table | 4.76M INVOLUNTARY_REVOCATION rows deleted during failed Jun 19 reimport. Workers crashed due to SSL timeout on Supabase (psycopg2 + Python 3.14 fast-fail). Revocation reimport relaunched Jun 20 ~19:50 SGT with staggered worker starts to avoid DLL contention. Expected completion ~20:20 SGT. |
| [CRITICAL] Insurance data gap | insurance table | Reimport killed twice (Ctrl+C at 67%, then again at 10%). Third restart launched Jun 20 ~19:45 SGT. Expected completion ~20:15 SGT. Until complete, for-hire carriers with 0 records will show DATA_GAP amber warning (not false INACTIVE). |
| `authority_type` NULL on all authority_history records | authority_history table | reimport_authority_parallel.py line 125 used `r.get("authority_type")` but Socrata stores this as `mod_col_1` (Operating Authority Type). Script fix applied Jun 20 — takes effect on next full authority reimport. |
| Chameleon query: no revocation guard + ilike without wildcards | page.tsx fetchSuspectSuccessors | Runs on EVERY carrier load (should only run for revoked carriers). ilike match is exact (no % wildcards) so address similarity is effectively disabled. Fix: add revocation guard + `%address%` wildcards. |
| `inspection_id` NULL on all violations — FK never populated | violations table | Import pipeline never populated inspection_id FK. Violations cannot be linked to their parent inspection. Requires re-run of violations import with join logic. |
| Inspection dates 1970-01-01 (epoch) for DOT 2259497 and others | inspections table | Import converted null/missing inspection dates to Unix epoch. All 18 inspections for Buckshot Transportation have 1970-01-01. UI already filters these (isValidDate guard); data fix requires re-import. |
| `first_authority_date` not populated on chameleon suspect successors | page.tsx SuspectSuccessor | fetchSuspectSuccessors never fetches authority_history for suspect DOTs. Field exists in type but is always undefined. |

## Fixed Issues (do not reintroduce)

| Issue | Root Cause | Fix | Date |
|---|---|---|---|
| "MC #MC" displayed in carrier header | `carriers.mc_number` = literal string "MC" | Added guard: display mc_number only if not equal to bare "MC" | 2026-06-18 |
| Insurance "Replaced" → false INACTIVE | `deriveInsuranceBasis` didn't distinguish "Replaced" from "Cancelled"; ActPendInsur not imported | Code returns `status: "unknown"` + FMCSA verify message; import fix pending | 2026-06-18 |
| Duplicate rows in Insurance History | Same policy_number+effective_date imported from multiple FMCSA datasets | `dedupedInsurance` IIFE in `CarrierDetailView.tsx` deduplicates by policy_number+effective_date | 2026-06-18 |
| Duplicate rows in Revocation History | `carrier_alerts` table has 2-3 identical rows per event | `revocations` IIFE deduplicates by event_date | 2026-06-18 |
| Fleet 0/0 shown without warning | No validation on 0/0 for active carriers | Amber ⚠ warning box shown when total_drivers = 0 and total_trucks = 0 | 2026-06-18 |
| Authority ACTIVE but Insurance INACTIVE — no warning | No contradiction check | Added contradiction callout in status card section | 2026-06-18 |
| Old inactive carrier note absent | Basis text didn't mention long dormancy gaps | `deriveInsuranceBasis` + `deriveAuthorityBasis` now append note when 3+ year gap before accident date | 2026-06-18 |
| Revocation History description showed raw event_type | All rows showed "Involuntary Revocation" label regardless of description field | Already correct — description field shows "Involuntary Revocation" text from UI | 2026-06-14 |

---

## Mandatory Validation Checks (run after every data import AND before showing any carrier page)

A carrier record must FAIL validation and show a visible warning if any of these are true:

1. `driver_count = 0` AND `truck_count = 0` → likely missing data, not actually zero. Show amber ⚠ warning "Fleet size shows 0 — verify with FMCSA" (already implemented).
2. `sms_score IS NULL` → display "No score available", never "0" or "0th percentile".
3. Insurance has a gap between `policy_end_date` and next `policy_start_date` → flag as "Insurance lapse: X days" instead of silently skipping.
4. Same `crash_id` (or same date + same report number) appears more than once → dedupe before display.
5. `inspection_date IS NULL` → exclude from display or flag explicitly, do not show blank.
6. Inspection has zero violations → exclude from violations list display (not from raw data storage).
7. Authority/insurance dates are logically inconsistent (e.g. active insurance during a revoked-authority period) → flag visibly. (Contradiction check for authority=ACTIVE + insurance=INACTIVE/UNKNOWN is implemented.)
8. Any raw CFR code shown must have a plain-English description next to it. If translation lookup fails, show "Code: X (description unavailable)" — never show a bare unexplained code.
9. `mc_number = "MC"` (bare placeholder) → do not display. Show nothing (already implemented via display guard).
10. Insurance most recent policy has `status = "Replaced"` and no active successor found → show amber "VERIFY WITH FMCSA" (already implemented via `status: "unknown"`).

---

## Process Rule for Claude Code

After completing ANY bug fix or data correction:
1. Add an entry to "Fixed Issues" above with the root cause.
2. Check if the fix should become a new line in "Mandatory Validation Checks" — if it's the kind of bug that could silently recur on next data import, it must.
3. Do this BEFORE reporting the task as complete.
