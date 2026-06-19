# Litigation Data Reference — Carrier Check USA
> Every data point in this platform and its specific evidentiary value to truck accident lawyers.
> Updated: 2026-06-19

---

## Core Principle
A truck accident lawyer needs to answer six questions:
1. Was the carrier **authorized** to operate on the accident date?
2. Was the carrier **insured** on the accident date?
3. What was the carrier's **safety record** before the accident?
4. Was the **driver qualified** and compliant?
5. Was the **vehicle properly maintained**?
6. **Who can be sued** and where do you serve them?

Every dataset below maps to one or more of these questions.

---

## 1. CARRIER IDENTITY & STATUS
**Source:** FMCSA Carrier Census (`az4n-8mr2`)
**Table:** `carriers`

| Field | Litigation Value |
|-------|-----------------|
| `dot_number` | Primary federal identifier — used in all FMCSA filings, accident reports, and litigation |
| `mc_number` | Links to for-hire operating authority — required for interstate commerce |
| `legal_name` + `dba_name` | Correct party to name in the complaint. DBA name may differ from legal entity |
| `address` + `city` + `state` | Venue determination; confirms jurisdiction; used for chameleon carrier detection |
| `phone` | Contact for service; cross-reference for chameleon detection |
| `status` (ACTIVE/INACTIVE) | Current operational status — inactive carrier may still be liable for past accidents |
| `total_drivers` + `total_trucks` | Fleet size establishes scale of operation and scope of supervision duty |
| `cargo_type` | Determines what regulations apply (hazmat, household goods, passenger, property) |
| `safety_rating` | SATISFACTORY / CONDITIONAL / UNSATISFACTORY — "Unsatisfactory" is powerful evidence of systemic failure |
| `safety_rating_date` | Age of rating matters — a 1990 rating offers no current comfort |

**Key litigation use:** Establish the correct defendant, confirm they were a motor carrier subject to FMCSA jurisdiction, and flag whether they were even legally permitted to operate.

---

## 2. OPERATING AUTHORITY HISTORY
**Source:** FMCSA AuthHist (`9mw4-x3tu`)
**Table:** `authority_history`

| Field | Litigation Value |
|-------|-----------------|
| `status` (GRANTED / INVOLUNTARY REVOCATION / etc.) | Establishes whether authority was ever granted and its current/historical state |
| `authority_type` (Common / Contract / Broker) | Common authority = for-hire transport of general public's goods. Contract = specific shippers only |
| `effective_date` | Date authority was **granted** — start of the coverage window |
| `revocation_date` | Date authority **ended** — if accident falls after this, carrier was operating illegally |
| `reason` | Reason for revocation — "Failure to maintain insurance" is powerful evidence |

**Key accident date question:** "On [accident date], was this carrier's operating authority active?"
- If `effective_date` ≤ accident date AND (`revocation_date` > accident date OR null) → **ACTIVE**
- If revocation_date < accident date and no reinstatement → **OPERATING ILLEGALLY** — enormously increases liability exposure
- Multiple revoke/reinstate cycles → pattern of non-compliance

**Serve Date vs Effective Date on revocations:** The carrier was **notified** of revocation on Serve Date but it didn't take effect until Effective Date. If accident falls between these two dates → carrier operated under active revocation notice. Demonstrates conscious disregard.

---

## 3. REVOCATION HISTORY (DEDICATED DATASET)
**Source:** FMCSA Revocation (`sa6p-acbp`)
**Table:** `carrier_alerts` (event_type = INVOLUNTARY_REVOCATION)

| Field | Litigation Value |
|-------|-----------------|
| `event_date` | Date revocation action was taken |
| `description` | Specific type of revocation (insurance, safety, etc.) |

**Key use:** Independent cross-check against authority_history. FMCSA issues dedicated revocation records separate from authority grants. Multiple entries = serial violator.

---

## 4. INSURANCE — ACTIVE POLICIES
**Source:** FMCSA ActPendInsur (`ypjt-5ydn`)
**Table:** `insurance` (status = "Active")

| Field | Litigation Value |
|-------|-----------------|
| `policy_type` (form code) | 82/91/91X = BI&PD (bodily injury & property damage) — the required liability coverage |
| `insurer_name` | Who the insurer is — direct action state? File claim directly |
| `policy_number` | Identifies the specific policy for discovery |
| `effective_date` | Coverage start date |
| `cancellation_date` (null = still active) | If null, policy is currently in force |

**Key accident date question:** Was there an active BI&PD policy on the accident date?
- `effective_date` ≤ accident date AND (`cancellation_date` ≥ accident date OR null) → **INSURED**
- No policy found → carrier was operating **uninsured** — triggers direct FMCSA liability exposure

**BIPD minimum limits:** FMCSA requires $750K minimum for general freight, $5M for hazmat. Check if policy limit meets minimum. Field `BIPD Required` vs `BIPD on File` — if on file < required → underinsured.

---

## 5. INSURANCE — HISTORICAL POLICIES
**Source:** FMCSA InsHist (`6sqe-dvqs`)
**Table:** `insurance` (status = "Cancelled" / "Replaced" / "Name Change")

| Field | Litigation Value |
|-------|-----------------|
| `status` | "Cancelled" = coverage terminated. "Replaced" = successor policy exists. "Name Change" = same coverage, company renamed |
| `effective_date` + `cancellation_date` | Exact coverage window — gap between consecutive policies = **insurance lapse** |
| `insurer_name` | Historical insurer — may still be liable for accidents within the policy period |

**Gap detection:** If Policy A's `cancellation_date` < Policy B's `effective_date` → there is an **insurance lapse**. An accident during this gap means the carrier was operating without insurance. Our platform now flags this with a red warning card.

**"Replaced" status note:** A policy showing "Replaced" means a successor policy was filed, but the successor isn't always in our records. If we can't find the active successor, we flag it as "VERIFY WITH FMCSA" — do not treat as uninsured without confirming directly.

---

## 6. REJECTED INSURANCE FILINGS ⭐ HIGH LITIGATION VALUE
**Source:** FMCSA Rejected (`96tg-4mhf`)
**Table:** `rejected_insurance`

| Field | Litigation Value |
|-------|-----------------|
| `received_date` | When the carrier submitted the insurance form |
| `rejected_date` | When FMCSA rejected it |
| `company_name` | Which insurer submitted it |
| `policy_number` | Identifies the rejected policy |
| `rejected_reason` | **300-character plain-text explanation** — e.g., "Policy is already cancelled", "Carrier name is different from System", "Duplicate filing" |

**Why this is powerful:** A rejected insurance filing proves:
1. The carrier **knew** they needed insurance
2. The carrier **attempted** to obtain coverage
3. The attempt **failed** — FMCSA explicitly refused it
4. If rejection date is near the accident date → carrier was operating knowing their insurance was rejected

**No competitor surfaces this data.** Carrier411, RMIS, and SAFER do not show rejected filings with rejection reasons.

---

## 7. OUT-OF-SERVICE ORDERS
**Source:** FMCSA OOS Orders (`p2mt-9ige`)
**Table:** `oos_orders`

| Field | Litigation Value |
|-------|-----------------|
| `order_date` | When FMCSA ordered the carrier out of service |
| `reason` | Why — safety violations, insurance, authority |
| `status` (ACTIVE / REINSTATED) | Is the OOS order still in effect? |
| `reinstatement_date` | When the carrier was allowed back — if accident after order_date but before reinstatement → operating **under OOS order** |
| `effective_date` | When the OOS order took effect |

**Key use:** If the carrier was under an OOS order on the accident date, they were operating **in direct defiance of a federal order**. Establishes willful disregard. Strong punitive damages argument.

---

## 8. INSPECTION HISTORY
**Source:** FMCSA (via citations dataset)
**Table:** `inspections`

| Field | Litigation Value |
|-------|-----------------|
| `inspection_date` | When the inspection occurred relative to accident date |
| `level` | Level 1 = Full Driver+Vehicle (most thorough). Level 3 = Driver only. Level 5 = Vehicle only |
| `total_violations` | Number of violations found — high count = pattern evidence |
| `oos_vehicles` | Vehicles put out of service at this inspection — immediate safety risk found |
| `oos_drivers` | Drivers put out of service — disqualification events |
| `state` | Where the inspection occurred |

**The 24-month window:** Inspections within 24 months before the accident are the most relevant for establishing the carrier's safety culture at the time of the accident. Our platform separates these into dedicated time buckets.

**OOS rate calculation:** (OOS events / total inspections) vs national average. Above average = above-average safety risk.

---

## 9. VIOLATIONS
**Source:** FMCSA (via citations dataset)
**Table:** `violations`

| Field | Litigation Value |
|-------|-----------------|
| `violation_code` (1–49) | BASIC category — e.g., Code 15 = Brakes Out of Adjustment, Code 9 = Drugs, Code 10 = Alcohol |
| `description` (CFR code) | Specific regulation violated — e.g., "393.48-BRAKES" = "Brakes must be operative" |
| `oos_indicator` (Y/N) | If Y, this violation was serious enough to take the vehicle/driver out of service immediately |
| `unit_type` | VEHICLE vs DRIVER violation |
| `basic_category` | FMCSA BASIC (Behavior Analysis and Safety Improvement Category) grouping |

**High-value violation codes for accident lawyers:**
- **Codes 15–16**: Brake violations — most common cause of truck accidents
- **Code 9**: Drugs — controlled substances
- **Code 10**: Alcohol
- **Codes 3–7**: Hours of Service — fatigued driving
- **Code 8**: Disqualified driver (operating CDL after disqualification)
- **Code 1**: Medical certificate violations (driver medically unfit)

**Pattern evidence:** Repeated brake violations across multiple inspections = systemic maintenance failure, not isolated incident. Our platform groups violations by CFR code to surface patterns.

**OOS violations:** A violation that triggered an OOS order proves the problem was severe enough for an immediate federal shutdown. Far more powerful than a non-OOS citation.

---

## 10. CRASH HISTORY
**Source:** FMCSA crashes database
**Table:** `crashes`

| Field | Litigation Value |
|-------|-----------------|
| `crash_date` | When it occurred relative to the subject accident |
| `state` | Jurisdiction of prior crash |
| `fatal` | Number of fatalities |
| `injury` | Number of injuries |
| `towaway` | Tow-away events (vehicle disabled) |
| `report_number` | Links to police report for discovery |

**Key uses:**
- Prior fatal or injury crashes = the carrier knew their operation was dangerous
- Multiple crashes in 24 months = pattern of unsafe operation
- Crash in same state = prior notice to same regulator that ignored the carrier

**SMS Crash Indicator BASIC:** If crash_indicator percentile ≥ 75, FMCSA has already flagged this carrier as having an above-average crash rate. This is published data the carrier cannot dispute.

---

## 11. SMS SAFETY SCORES (BASIC PERCENTILES)
**Source:** FMCSA SMS Output (`m3ry-qcip`)
**Table:** `sms_scores`

The 5 BASIC categories available in the dataset:

| BASIC | What It Measures | Alert Threshold |
|-------|-----------------|-----------------|
| Unsafe Driving | Speeding, reckless driving, lane violations | ≥ 75th percentile |
| Hours of Service | Log falsification, exceeding drive limits | ≥ 75th percentile |
| Driver Fitness | Medical certs, CDL requirements | ≥ 75th percentile |
| Controlled Substances/Alcohol | Drug and alcohol violations | ≥ 75th percentile |
| Vehicle Maintenance | Equipment defects, brake failures | ≥ 75th percentile |

**Litigation value:** FMCSA publishes these percentile rankings. A score ≥ 75 in any BASIC means FMCSA has identified this carrier as among the most dangerous 25% in that category. This is an official government finding the carrier cannot challenge as subjective. Multiple alerts = systemic safety failure across multiple dimensions.

**Note:** Crash Indicator and Hazardous Materials BASICs are not available in the Socrata open dataset — these require the full FMCSA SMS portal.

---

## 12. BOC-3 PROCESS AGENT ⭐ CRITICAL FOR LITIGATION
**Source:** FMCSA BOC3 (`6snj-ed7q`)
**Table:** `boc3`

| Field | Litigation Value |
|-------|-----------------|
| `company_name` | Legal name of the designated process agent |
| `address` + `city` + `state` | Where to serve legal papers |
| `attention_to` | Specific contact at the agent |

**Why it matters:** Every for-hire carrier that wants FMCSA operating authority must designate a BOC-3 agent authorized to accept court papers in every US state. This agent is the correct party to serve — not the carrier's registered agent, not their home state secretary of state.

Serving the wrong party is a common mistake. Serving the BOC-3 agent is the correct FMCSA-compliant method for initiating litigation against an interstate motor carrier.

**Cross-carrier signal:** If two carriers share the same BOC-3 agent AND the same address → strong chameleon carrier indicator. Same law firm or registered agent serving two "different" companies = same underlying operation.

---

## 13. CHAMELEON CARRIER DETECTION ⭐ UNIQUE DIFFERENTIATOR
**Detection signals in our data:**

| Signal | What to Look For | Data Source |
|--------|-----------------|-------------|
| Same address, new DOT post-revocation | Carrier A revoked → Carrier B appears at same address within 24 months | `carriers` + `authority_history` |
| Same phone number | Same contact number across different DOT numbers | `carriers.phone` |
| Same BOC-3 agent | Same process agent firm for two carriers | `boc3` |
| Similar name | "ABC Transport LLC" → "ABC Trucking Inc" | `carriers.legal_name` (fuzzy) |

**Why it matters:** A revoked carrier that reconstitutes under a new DOT number inherits none of its predecessor's liability. Finding the link between the two entities allows the lawyer to:
1. Pierce the corporate veil (if the same individuals control both)
2. Argue successor liability
3. Establish that the "new" carrier had constructive knowledge of the predecessor's violations

**Currently implemented:** Address and phone cross-reference on each carrier page. BOC-3 agent cross-reference is the next step.

---

## 14. ACCIDENT DATE FILTER — CROSS-DATASET TIMELINE
**This is our core differentiator.** No competitor provides historical, date-specific carrier snapshots.

On any accident date, the report answers:

| Question | Data Used |
|----------|-----------|
| Was authority active? | `authority_history.effective_date` ≤ date ≤ `authority_history.revocation_date` |
| Was insurance active? | `insurance.effective_date` ≤ date ≤ `insurance.cancellation_date` |
| Was there an OOS order in effect? | `oos_orders.order_date` ≤ date, `reinstatement_date` > date |
| Were there inspections in prior 24 months? | `inspections.inspection_date` within [date−730 days, date] |
| Were there prior crashes? | `crashes.crash_date` within [date−730 days, date] |
| Was authority under revocation notice? | `authority_history` revocation Serve Date ≤ date < Effective Date |
| Were there rejected insurance filings near the date? | `rejected_insurance.received_date` near date |

---

## 15. DATASETS WE HAVE BUT NOT YET SHOWING
The following data is in the DB but not yet displayed in the UI:

| Dataset | Table | What It Contains | UI Status |
|---------|-------|-----------------|-----------|
| BOC-3 agents | `boc3` | 53,158 process agents | ✅ Added 2026-06-19 |
| Rejected insurance | `rejected_insurance` | 12,481 rejected filings with reasons | ✅ Added 2026-06-19 |

---

## 16. DATASETS NOT YET IMPORTED (HIGH VALUE, BUILD NEXT)

| Dataset | FMCSA Name | Litigation Value |
|---------|-----------|-----------------|
| Carrier officer/owner names | Not in open API | Direct liability, piercing corporate veil |
| MCS-150 filing history | Not in open API | Carrier misrepresentation of fleet size/operations |
| Drug & Alcohol Clearinghouse | Separate system | Driver-specific drug test history |
| Shipper/broker liability | Not in open API | Negligent hiring of unsafe carrier |

---

## 17. EVIDENCE FRAMING FOR LAWYERS
For each finding, frame as an answer to a lawyer's question:

**"Was this carrier a safe operator?"**
→ "No. In the 24 months before the accident: 18 inspections, 43 violations, 5 OOS vehicle events, 2 crashes (1 fatal). SMS Vehicle Maintenance score: 84th percentile — FMCSA alert threshold exceeded."

**"Did the carrier have authority to operate?"**
→ "Authority was revoked on [date] for failure to maintain insurance. The accident occurred [X] days after the revocation effective date. The carrier was operating without federal authority."

**"Was the carrier insured?"**
→ "Most recent BI&PD policy was cancelled on [date]. No active successor policy found. FMCSA records show a rejected insurance filing on [date] — [rejection reason]. The carrier appears to have been operating uninsured."

**"Can we pierce the corporate veil?"**
→ "A carrier named [Name] registered at the same address [X] months after this carrier's revocation. Both carriers share the same BOC-3 process agent [Agent Name]. This pattern is consistent with chameleon carrier activity."

**"Who do we serve?"**
→ "BOC-3 process agent: [Company Name], [Address]. This is the FMCSA-designated agent for accepting legal papers in all US states."

---

## DISCLAIMER (Required on every report)
*Data sourced from FMCSA public records. This report is for informational purposes only and does not constitute legal advice. All findings should be independently verified against FMCSA SAFER and primary source documents before reliance in litigation.*
