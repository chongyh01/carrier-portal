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
| Missing inspection dates | Inspection table | Inspections with null inspection_date excluded from all time-bucket views (inRange returns false for null); data issue not yet diagnosed |
| `inspection_id` NULL on violations | FK never populated — violations not linked to parent inspections | Not yet diagnosed; violations show without inspection link |

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
| `isLikelyPrivateCarrier()` too broad — triggered NOT_REQUIRED for "APPLYING FOR MC" carriers and any carrier with null MC# | `CarrierDetailView.tsx` | Logic didn't distinguish applying-for-MC from true private carriers. Fixed: NOT_REQUIRED only returned for explicit PRIVATE PROPERTY or PRIVATE PASSENGER cargo_type with no MC# AND not applying for MC | 2026-06-20 |
| Boundary date bug — cancel/revocation date equal to accident date treated as ACTIVE instead of INACTIVE | `deriveInsuranceBasis` + `deriveAuthorityBasis` | Strict `< accidentDate` comparison excluded same-day cancellations/revocations. Fixed: changed to `<= accidentDate` in both functions | 2026-06-20 |
| Active insurance policies missing entirely | `reimport_insurance_parallel.py` | ActPendInsur imported: ~478K active policies across 5 workers. Script now uses `load_insurance_active` with docket→DOT mapping | 2026-06-20 |
| Driver/truck counts wrong (0 for active carriers) | `fix_mc_and_fleet.py` | Ran 2026-06-19, 1,122,316 carriers updated with correct driver/truck counts | 2026-06-19 |
| mc_number still "MC" in database | `fix_mc_and_fleet.py` | Same run above fixed mc_number storage with correct zero-padded values | 2026-06-19 |
| Raw CFR violation codes without plain-English description | `CarrierDetailView.tsx` + `fetch_cfr_codes.py` | cfr_descriptions.json generated from Socrata `876r-jsdb` dataset (2,365 codes); imported as `CFR_FULL` in component. 3-level fallback: exact → prefix → numeric | 2026-06-20 |
| `boc3` table missing entirely | `import_boc3_rejected.py` | Table created and imported 54,944 rows; UI section "Serve legal papers on:" added to CarrierDetailView | 2026-06-20 |
| Status badge showing "CLEAR" for carriers with revocation history | `CarrierDetailView.tsx` | Badge only checked crash count + SMS alerts, never authority_history or carrier_alerts. Fixed: badge now checks revocations. REVOKED (red) / ACTIVE-PRIOR HISTORY (amber) / CLEAR (green). ~1M carriers corrected | 2026-06-20 |
| DISCONTINUED REVOCATION triggering false INACTIVE | `deriveAuthorityBasis` | DISCONTINUED = revocation was reversed; skip these when determining active revocations | 2026-06-20 |
| Chameleon query ran on all carriers | `page.tsx` | Added `if revocations.length > 0` guard; query now only runs when carrier has confirmed revocation | 2026-06-20 |
| Chameleon connection_type always "Same address" | `page.tsx` | Split into two separate queries (address + phone); BOC3 cross-reference added as 3rd query | 2026-06-20 |
| `first_authority_date` missing on suspect successors | `page.tsx` | fetchSuspectSuccessors now populates first_authority_date from authority_history | 2026-06-20 |
| DATA_GAP warning missing for for-hire carriers with 0 records | `CarrierDetailView.tsx` | Added amber warning when MC number exists but 0 authority or insurance records found | 2026-06-20 |
| Status badge ignored revocation/crash/SMS — 3-iteration overhaul | `CarrierDetailView.tsx` + `app/page.tsx` | Badge now: REVOKED (INACTIVE+revocations) / HIGH RISK (fatal crash or 3+ SMS or both lapsed) / ELEVATED (any crash or SMS or one lapsed) / ACTIVE-PRIOR HISTORY / CLEAR / INACTIVE. Accident-date lapse check on detail page only | 2026-06-21 |
| `import_boc3_rejected.py` DROP TABLE wiped data on every re-run | `import_boc3_rejected.py` | Changed to CREATE IF NOT EXISTS + TRUNCATE RESTART IDENTITY — preserves structure and indexes | 2026-06-22 |
| `rejected_insurance.class_code` used wrong column `mod_col_3` | `fmcsa_import.py` + `import_boc3_rejected.py` | Both scripts already use `ins_class_code or mod_col_3` fallback — already fixed in code; data reimport not required | 2026-06-22 |
| CFR code key format mismatch (398.8D1-MW vs 398.8D1-mw) | `cfr_descriptions.json` + `CarrierDetailView.tsx` | Removed lowercase duplicate from both JSON files; added `.toUpperCase()` fallback in `cfrDescription()` | 2026-06-22 |

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

**Pipeline run status (FULLY COMPLETE as of 2026-06-20 SGT):**
```
python fix_mc_and_fleet.py              # DONE 2026-06-19 — 1,122,316 carriers updated
python reimport_sms.py                  # DONE 2026-06-19 — 8,727 rows inserted
python import_boc3_rejected.py          # DONE 2026-06-20 ~19:53 SGT — 54,944 BOC3 + 12,481 rejected_insurance
python reimport_authority_parallel.py   # DONE 2026-06-20 ~08:39 SGT — 4,694,895 rows (all 5 workers); dedup removed 195,845 dupes
python reimport_insurance_parallel.py   # DONE 2026-06-20 ~20:28 SGT — InsHist + ActPendInsur, all 5 workers; 0 dupes found, unique index created
python reimport_revocation_parallel.py  # DONE 2026-06-20 ~20:02 SGT — 1,459,980 rows (all 5 workers); 0 dupes found
python dedup_carrier_alerts.py          # DONE 2026-06-20 — 0 dupes found, 1,360,690 INVOLUNTARY_REVOCATION rows clean
python fetch_cfr_codes.py               # DONE 2026-06-20 — cfr_descriptions.json generated (2,365 codes) and integrated into CarrierDetailView.tsx
```

**Current DB row counts (verified 2026-06-20):**
- carriers: ~4.4M
- authority_history: 4,694,895 (after dedup)
- insurance: ~7.65M
- carrier_alerts: 1,360,690 INVOLUNTARY_REVOCATION + 780,668 OOS_ORDER
- boc3: 54,944
- rejected_insurance: 12,481
- sms_scores: 8,727
- crashes: 7,143,666 (after dedup)

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

## 9. P5 — Chameleon Carrier Detection (Post-Beta, High Differentiator)

No competitor (Carrier411, RMIS, SAFER) surfaces this. A chameleon carrier shuts down after revocation and re-registers under a new DOT/MC to escape its safety record. Detecting this is uniquely valuable to lawyers.

### Detection Signals (ranked by reliability)
1. **Same physical address + new registration within 24 months of revocation** — most common pattern
2. **Same phone number across DOTs** — very reliable, low false-positive rate
3. **Same BOC3 process agent** — strong signal; same agent = often same underlying operation (data now imported)
4. **Similar carrier name** — fuzzy match, higher false-positive rate; use as supporting signal only
5. **Same insurance company + overlapping geography** — supporting signal only

### Query Design (run only when carrier has a confirmed revocation)

```sql
-- Find potential successor carriers sharing address, phone, or BOC3 agent
-- registered AFTER the revocation effective date
SELECT DISTINCT
  c2.dot_number,
  c2.legal_name,
  c2.mc_number,
  c2.status,
  ah2.effective_date AS first_authority_date,
  CASE
    WHEN LOWER(TRIM(c2.address)) = LOWER(TRIM(c1.address)) THEN 'Same address'
    WHEN c2.phone = c1.phone                               THEN 'Same phone number'
    ELSE 'Same BOC3 process agent'
  END AS connection_type
FROM carriers c1
JOIN carriers c2
  ON c2.dot_number != c1.dot_number
  AND (
    LOWER(TRIM(c2.address)) = LOWER(TRIM(c1.address))
    OR (c1.phone IS NOT NULL AND LENGTH(c1.phone) > 7 AND c2.phone = c1.phone)
    OR EXISTS (
        SELECT 1 FROM boc3 b1
        JOIN boc3 b2 ON b2.company_name = b1.company_name
        WHERE b1.dot_number = c1.dot_number AND b2.dot_number = c2.dot_number
    )
  )
JOIN authority_history ah2
  ON ah2.dot_number = c2.dot_number
  AND ah2.effective_date > $revocation_effective_date  -- registered after revocation
  AND ah2.status ILIKE '%grant%'
WHERE c1.dot_number = $dot_number
ORDER BY ah2.effective_date
LIMIT 10
```

### Implementation Plan
1. Add `indexes`: `carriers(address)`, `carriers(phone)`, `boc3(company_name, dot_number)` — required for performance on 4.4M rows
2. New fetch function `fetchSuspectSuccessors(dot, revocationDate)` in `page.tsx` — only called when revocation detected
3. New UI section in `CarrierDetailView.tsx`: "Possible Successor Entities" — amber warning card listing matches with connection type
4. Each result links to the other carrier's report page
5. Add disclaimer: "These are investigative leads, not confirmed conclusions. Independent verification required."

### Prerequisite
- Reimport revocation + authority history with clean dedup first (21,311 dup groups in authority_history must be resolved)
- Add DB indexes before running the cross-carrier query in production (4.4M row table scan without index = timeout)

---

## 10. Other Backlog (lower priority)
- **Badge + SAFER verification** — DONE 2026-06-22 via DB query + Socrata. See findings below.
- **P5 Chameleon prerequisites**: All met (reimports done, indexes created). Can implement P5 after beta launch.

### Badge Spec (CURRENT — as of 2026-06-22, commit f1138be)
Badge reflects **authority/revocation history only**. Not a risk score. No crash/SMS signals.

| Badge | Condition | Color |
|-------|-----------|-------|
| REVOKED | INACTIVE census + any confirmed INVOLUNTARY_REVOCATION (non-DISCONTINUED) | Red |
| ACTIVE — PRIOR HISTORY | ACTIVE census + revocation history | Amber |
| NO DATA — Verify with FMCSA | For-hire carrier (has MC#) + zero authority records in DB | Gray |
| No Authority Issues Found | ACTIVE + no revocations + authority records present | Neutral gray (detail page only) |
| *(no badge)* | Same as above, on search results page | — |

**Removed states** (2026-06-22): HIGH RISK, ELEVATED, CLEAR, INACTIVE. Do not re-add without explicit instruction.

**For accident-date badge testing:** DOT 2528133 (TRUCKING R US LLC, INACTIVE). Auth+insurance both lapsed by Aug 2016. Set accident date 2016-09-01.

- Supabase compute downgrade Small → Micro/Nano (already initiated).
- Stripe integration (deprioritized; pricing: solo ~$199/mo, small firm ~$399/mo, large firm ~$799/mon).
