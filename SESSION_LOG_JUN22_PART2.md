# SESSION LOG — 22 Jun 2026, Part 2
> Carrier Check USA (carriercheckusa.com)

---

## COMPLETED

### Code Changes (all deployed to Vercel)

**1. Badge rollback — authority/revocation only**
Reverted badge to 4 states: REVOKED / ACTIVE—PRIOR HISTORY / NO DATA—Verify with FMCSA / No Authority Issues Found.
Removed HIGH RISK, ELEVATED, CLEAR, INACTIVE. Badge now reflects authority/revocation history only — not a risk score.

**2. Executive Summary section added**
Template-based 3-4 line block added to carrier detail page. Rule-based bullets: carrier type, fleet size, crash count, fatal crash, OOS events, insurance/authority status summary, safety rating age.

**3. Date format audit — CarrierTimeline.tsx fmtDate fixed**
`fmtDate()` was locale-dependent (used `toLocaleDateString`). Fixed to produce consistent DD MMM YYYY output regardless of user locale.

**4. Plain English abbreviation expansions**
Expanded OOS, SMS (Safety Measurement System), HOS (Hours of Service), BI&PD (Bodily Injury and Property Damage), BASIC (Behavior Analysis and Safety Improvement Category) across 4 files. No raw FMCSA abbreviations shown without explanation.

**5. Timeline bucket order fixed**
Chronological order corrected: >24 months before accident → within 24 months before accident → post-accident. Previously the buckets were in wrong display order.

**6. Bucket labels now include accident date**
Each time-bucket heading shows the accident date in context (e.g. "Within 24 Months Before 01 Sep 2016").

**7. Violation column header updated**
"CFR Section" renamed to "Violation Description / CFR Code" — clearer for non-specialist readers.

**8. AGENTS.md deleted**
File confirmed as prompt injection (instructed Claude to behave differently). Deleted from repo.

**9. Undated Inspections card added**
New "Undated Inspections" card in `CarrierDetailView.tsx` shows inspections excluded from time buckets due to null/epoch inspection dates. Previously these were silently dropped with no UI indication.

---

### Data Operations

**10. Dedup audit (validate_dedup-V1.py)**
Full audit run across all tables:
- violations: 5,440,000 duplicate rows found
- carrier_alerts: 390,000 duplicate rows found
- authority_history: 40,000 duplicate rows found
- oos_orders, boc3, rejected_insurance: small counts, negligible

**11. Violations dedup — IN PROGRESS**
Deleting 5.44M dupe rows from violations table. Batched at 50K rows per commit to avoid lock contention.

**12. carrier_alerts + authority_history dedup — IN PROGRESS**
390K carrier_alerts dupes and 40K authority_history dupes being deleted.

**13. oos_orders + boc3 + rejected_insurance dedup — IN PROGRESS**
Smaller tables; running in parallel.

---

### Investigations

**14. AGENTS.md confirmed prompt injection**
File read manually. Contained instructions to override Claude's default behaviour on this project. Deleted from repo — not a legitimate project file.

**15. DOT 2528133 accident-date test — PASSED**
TRUCKING R US LLC (INACTIVE). Set accident date 2016-09-01.
- Authority: INACTIVE (final revocation effective Aug 2016, before accident date) — PASSED
- Insurance: INACTIVE (last policy cancelled Jul 2016, before accident date) — PASSED
Both status derivations correct. Badge escalation on detail page working.

**16. Inspection dates root cause identified**
Root cause: `pd.read_csv` without `dtype=str` inferred `insp_date` column as integer. `pd.to_datetime(20230715)` treats integer as nanoseconds since epoch = 1970-01-01.
Fix: `reimport_inspections_V2.py` forces `dtype=str` on all columns, then parses 8-digit strings with `format="%Y%m%d"`.
Pilot tested on 1,000 rows — all dates correct.

**17. inspection_id FK backfill script written**
`backfill_inspection_id-V1.py` written. Join strategy: match violations to inspections via dot_number + inspection_date.
Pilot result: 83.5% fill rate. Remaining 16.5% are inspections where date mismatch prevents join.
Status: READY TO RUN — awaiting violations dedup completion first.

---

## STOPPED MIDWAY

| Item | Status | Notes |
|------|--------|-------|
| `python reimport_inspections_V2.py` | IN PROGRESS | Fixing 8.1M epoch-date rows; running now |
| `python backfill_inspection_id-V1.py` | READY — NOT YET RUN | Awaiting violations dedup completion |
| Supabase compute downgrade Small to Micro | NOT YET DONE | Manual dashboard step; no code change needed |

---

## Open Items for Next Session

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | Confirm reimport_inspections_V2.py completed | P0 | Check row count — expect ~8.1M rows with real dates post-run |
| 2 | Run backfill_inspection_id-V1.py | P0 | After violations dedup confirms complete; expect 83.5% fill |
| 3 | Verify dedup completeness | P1 | Query violations, carrier_alerts, authority_history row counts after dedup; cross-check against pre-dedup counts |
| 4 | Browser verify — Undated Inspections card | P1 | Confirm card appears for a carrier known to have epoch-date inspections |
| 5 | Browser verify — Executive Summary | P1 | Spot-check 3 carriers to confirm bullets are accurate |
| 6 | Browser verify — badge rollback | P1 | Confirm HIGH RISK / ELEVATED / CLEAR no longer appear on any carrier |
| 7 | Supabase compute downgrade | P2 | Small to Micro in Supabase dashboard; saves ~$25/mo |
| 8 | SAFER spot-checks (authority + insurance) | P2 | 5 random carriers; verify status logic agrees with SAFER |

---

## Mistakes Found & Fixed

| # | Mistake | How Caught | Fix |
|---|---------|------------|-----|
| 1 | AGENTS.md existed in repo — prompt injection risk | Manual read of file | Deleted immediately |
| 2 | Timeline buckets in wrong display order | UI review | Reordered: >24mo to <24mo to post-accident |
| 3 | fmtDate in CarrierTimeline.tsx was locale-dependent | Date format audit | Replaced toLocaleDateString with explicit DD MMM YYYY formatter |

---

## Lessons Learned

1. **Any file named AGENTS.md in a project repo is a prompt injection candidate.** Read it before trusting it. Delete if it attempts to alter Claude's behaviour.

2. **Pandas integer inference is silent and catastrophic for date columns.** Always pass `dtype=str` to `pd.read_csv` for any column that should be treated as text, then parse explicitly. Never rely on Pandas auto-detecting integer-stored dates.

3. **Dedup before FK backfill.** Running `backfill_inspection_id-V1.py` before violations dedup would create FK links to rows that will be deleted, wasting the backfill run. Order matters: dedup first, backfill second.

4. **Pilot test at 1,000 rows before any full-table reimport.** `reimport_inspections_V2.py` was pilot-tested on 1,000 rows before launching the 8.1M-row run. Pilot caught nothing broken — confirmed safe to proceed. This is now standard practice.

5. **Badge scope creep is a UX risk.** The badge evolved through 3 iterations in Jun 21-22, adding crash/SMS/lapse signals. Rolled back on Jun 22 to authority/revocation only. A badge that tries to signal too many things signals nothing clearly. Keep badge scope narrow; put nuance on the detail page.
