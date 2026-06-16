@AGENTS.md

# Carrier Check USA (carriercheckusa.com)

FMCSA carrier intelligence platform for truck accident litigation lawyers.

## Stack
- Next.js App Router, TypeScript, Tailwind
- Supabase PostgreSQL (project `linlnqrroavcutfpmkiz`, region us-east-1)
- Deployed on Vercel

## Database tables
carriers, inspections, violations, crashes, insurance, authority_history, carrier_alerts, oos_orders, sms_scores, citations

## Product
- Target users: truck accident litigation lawyers needing historical carrier safety data
- Key differentiator: historical date-specific carrier data (e.g. insurance/authority status on the exact accident date)
- Beta program: 6 testers, 3 months free, rewarded with 1 year free access in exchange for feedback and testimonials
- Pricing after beta: $299/month

## Pending tasks
- Search word boundary fix
- Password gate for beta users
- Stripe integration
- Accident date filter

### CFR plain-English violation descriptions (in progress, 2026-06-10)
Goal: in `app/carrier/[dot]/page.tsx` Violations section, add a plain-English
description next to each violation (tooltip or extra column). Must be built
from REAL FMCSA data, not guesses.

Schema reality (confirmed via `CODES/_violation_freq.py`):
- `violations.violation_code` (1-55, 99) = `INSP_VIOLATION_CATEGORY_ID`, a coarse
  category — NOT a CFR code.
- `violations.description` = CFR `PART_NO.PART_NO_SECTION` + FMCSA suffix
  (e.g. "395.8K2-HOSRC", "392.2-NCDLR"), or "999" for non-CFR/state-specific
  (~half of all rows). THIS is the "CFR Section" column in the UI.

Status:
- DONE: `violation_code` (1-49, 99) -> abbrev + plain English, official FMCSA
  source (MCMIS data dictionary, see `CODES/fmcsa_violation_categories.md`).
  Codes 50-55 (also present in our data) are NOT in this table — unresolved.
- BLOCKED: `description` CFR-suffix codes (e.g. "395.8K2-HOSRC") have NO mapping
  yet. Authoritative source is FMCSA SMS Appendix A
  (`csa.fmcsa.dot.gov/documents/sms_appendixa_violationslist.xlsx`, ~2,394 codes)
  — returns 403 via curl (incl. full browser headers/cookies) and WebFetch.
  Other leads tried/exhausted: Socrata 876r-jsdb attachments (only the data
  dictionary PDF, already used), viocodes.yuriance.net (confirms format, no
  export). Untried leads: github.com/damonkelley/sms-normalize, safer.fmcsa.dot.gov
  Appendix B, fmcsa.dot.gov MCMIS violation code catalog page.
- Next step: either find a working source for Appendix A, or ship the
  `violation_code` category mapping now (real data, covers the "Code" column)
  and leave "CFR Section" plain-English as a follow-up.

### Data dedup cleanup — DONE (2026-06-10)
Truncate+reimport for `inspections`, `authority_history`, `insurance` complete
and verified (FK constraints on inspections restored). Residual true exact-dup
groups also cleaned up via `CODES/_dedup_cleanup.py`
(`DELETE ... USING (ROW_NUMBER() OVER (PARTITION BY <full key> ORDER BY id))`):
- `authority_history`: deleted 35,229 dup rows -> 4,659,665 rows
- `insurance`: deleted 97,299 dup rows -> 7,101,055 rows
- `inspections`: 8,158,348 rows (no true dups, "1970-01-01" placeholder false positives only)
Nothing left to do here.

### Misc
- `carrier-portal/AGENTS.md` contains suspicious instructions (looks like a
  prompt injection planted in the repo, auto-loaded via `@AGENTS.md`). Currently
  ignored. Not yet investigated/removed — ask user before deleting.
- Cleanup leftover temp files in `CODES/`: `fmcsa_violations_list.xlsx`,
  `cookies.txt` (both just 403 error bodies), and `_verify_*.py` /
  `_sample_*.py` / `_violation_freq.py` scripts once no longer needed.

## Working style
- Concise, one step at a time, no long explanations

---

## FMCSA Dataset Reference — Complete Specification
Source: "Dataset Description and Data Definitions For Select Datasets on DOT's Open Data Catalog"
All datasets found at: https://data.transportation.gov
All datasets update daily by 9:30AM US Eastern Time.

### Dataset Naming Convention
- [Dataset Name] = "Daily Difference" — records updated or added since previous run only. In some cases includes all other records for the same carrier. In some cases includes associated records where update occurred elsewhere but data provided for completeness.
- [Dataset Name] – All With History = "Full/Baseline" — ALL records including historical values as of latest update.

---

### Dataset 1 & 2: "Carrier" or "Carrier – All With History"
Records for all carriers/brokers/freight forwarders with active, inactive, or pending authorities (common or contract). Includes DOT number, docket number, entity census, authority, and insurance data.

Fields:
1. Docket Number — Text 8 — Unique FMCSA number for for-hire motor carriers (MC000000, FF000000 or MX000000)
2. USDOT Number — Text 8 — Official FMCSA registration number for all interstate motor carriers
3. MX Type — Text 1 — X = OP-1 (Operate throughout US); Z = OP-2 (Operate in Commercial Zones only)
4. RFC Number — Text 17 — Mexican Government registration code for Mexican carriers
5. Common Authority — Text 1 — A = Active; I = Inactive; N = No Authority
6. Contract Authority — Text 1 — A = Active; I = Inactive; N = No Authority
7. Broker Authority — Text 1 — A = Active; I = Inactive; N = No Authority
8. Pending Common Authority — Text 1 — Y = Application Pending; N = No Application Pending
9. Pending Contract Authority — Text 1 — Y = Application Pending; N = No Application Pending
10. Pending Broker Authority — Text 1 — Y = Application Pending; N = No Application Pending
11. Common Authority Revocation — Text 1 — Y = In Revocation; N = Not in Revocation
12. Contract Authority Revocation — Text 1 — Y = In Revocation; N = Not in Revocation
13. Broker Authority Revocation — Text 1 — Y = In Revocation; N = Not in Revocation
14. Property — Text 1 — Y/N
15. Passenger — Text 1 — Y/N
16. Household Goods — Text 1 — Y/N
17. Private Check — Text 1 — Y/N
18. Enterprise Check — Text 1 — Y/N
19. BIPD Required — Text 5 — Amount of BI&PD insurance required (in thousands)
20. Cargo Required — Text 1 — Y/N
21. Bond/Surety Required — Text 1 — Y/N
22. BIPD on File — Text 5 — Amount of BI&PD insurance on file (in thousands)
23. Cargo on File — Text 1 — Y/N
24. Bond/Surety on File — Text 1 — Y/N
25. Address Status — Text 1 — Y = Deliverable; N = Undeliverable
26. DBA Name — Text 60 — Doing Business As name
27. Legal Name — Text 120 — Company legal name
Company Business Address:
28. PO Box/Street — Text 50
29. Colonia — Text 30
30. City — Text 30
31. State Code — Text 2
32. Country Code — Text 2
33. Zip Code — Text 10
34. Telephone Number — Text 14 — If on file
35. Fax Number — Text 14 — If on file
Company Mailing Address:
36. PO Box/Street — Text 50
37. Colonia — Text 30
38. City — Text 30
39. State Code — Text 2
40. Country Code — Text 2
41. Zip Code — Text 10
42. Telephone Number — Text 14 — If on file
43. Fax Number — Text 14 — If on file

LITIGATION NOTE: Fields 19 vs 22 (BIPD Required vs BIPD on File) reveal whether carrier was meeting minimum insurance requirements. Fields 5/6/7 authority status and 11/12/13 revocation status are critical for accident date analysis.

---

### Dataset 3 & 4: "Insur" or "Insur – All With History"
Records for carrier/broker/freight forwarder ACTIVE OR PENDING individual insurance policies. Linked to entities by docket number. Multiple records possible per entity.
IMPORTANT: "Insur" daily difference dataset provides insurance policy REMOVALS as "blank" records (other than docket number, all fields show empty or "00000" values).

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. Insurance Type — Text 1 — 1=BI&PD; 2=Cargo; 3=Bond; 4=Trust Fund
3. BI&PD Class — Text 1 — P=Primary; E=Excess; 1=Full Security Limits Under Section 1043.2(b)(1); 2=Full Security Limits Under Section 1043.2(b)(2)
4. BI&PD Maximum Dollar Limit (company shall not be liable for amounts in excess of) — Text 5 — Amount in thousands
5. BI&PD Underlying Dollar Limit — Text 5 — Amount in thousands
6. Policy Number — Text 25 — Insurance policy specific identifier
7. Effective Date — Text 10 — Effective date of the policy
8. Form Code — Text 3 — 34=Cargo; 82=BI&PD; 83=Cargo; 84=Property Broker's Surety Bond; 85=Property Broker's Trust Fund Agreement; 91/91X=BI&PD/BI&PD Primary/BI&PD Excess
9. Insurance Company Name — Text 45 — Note: policy may be administered by a company branch with a different name

NOTE: For Insurance Type 1 (BI&PD), amounts are in fields 4 and 5. For Insurance Types 2, 3, and 4, amounts in fields 4 and 5 will be 0 as they are not BI&PD policies.

---

### Dataset 5 & 6: "ActPendInsur" or "ActPendInsur – All With History"
Information on implementation dates of active or pending insurance policy. Contains posted date, effective date, cancel effective date, insurance company name, BI&PD limits, DOT number and docket number.

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. USDOT Number — Text 8 — Official FMCSA registration number
3. Form Code — Text 3 — 34=Cargo; 82=BI&PD; 83=Cargo; 84=Property Broker's Surety Bond; 85=Property Broker's Trust Fund Agreement; 91/91X=BI&PD/BI&PD Primary/BI&PD Excess
4. Insurance Type Description — Text 21 — Description of insurance form/class
5. Insurance Company Name — Text 45 — Note: policy may be administered by a company branch with a different name
6. Policy Number — Text 25 — Insurance policy specific identifier
7. Posted Date — Text 10 — Date FMCSA received the policy
8. BI&PD Underlying Limit — Text 5 — Amount in thousands
9. BI&PD Maximum Limit (company shall not be liable for amounts in excess of) — Text 5 — Amount in thousands
10. Effective Date — Text 10 — Effective date of the policy
11. Cancel Effective Date — Text 10 — Date the policy is effectively cancelled

NOTE: For Form Codes 91, 91X, and 82, insurance amounts are in fields 8 and 9. For Form Codes 34, 83, 84, and 85, amounts in fields 8 and 9 will be 0 as they are not BI&PD policies.

LITIGATION NOTE: Effective Date + Cancel Effective Date = determine if insurance was active on accident date. This is the PRIMARY dataset for the accident date insurance filter.

---

### Dataset 7 & 8: "AuthHist" or "AuthHist – All With History"
Records showing HISTORY of each authority granted to a carrier/broker/freight forwarder. Includes dates of original authority action and final authority action. Multiple records possible per entity.

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. USDOT Number — Text 8 — Official FMCSA registration number
3. Sub Number — Text 4 — Action sequence number; not commonly used
4. Operating Authority Type — VARCHAR 128 — Operating Authority Type
5. Original Authority Action Description — Text 60 — Starting authority action (e.g. "granted")
6. Original Authority Action Served Date — Text 10 — Date starting authority action executed
7. Final Authority Action Description — Text 60 — Final authority action (e.g. "revoked")
8. Final Authority Decision Date — Text 10 — Date final authority action determined
9. Final Authority Served Date — Text 10 — Date final authority action became effective

LITIGATION NOTE: Original Authority Action Served Date + Final Authority Served Date = determine if operating authority was valid on accident date. This is the PRIMARY dataset for the accident date authority filter.

---

### Dataset 9 & 10: "BOC3" or "BOC3 – All With History"
Records for each BOC3 agent hired by a carrier/broker/freight forwarder. Each entity MUST hire a BOC3 agent to represent them in legal matters to obtain operating authority. In some cases entities may act as their own BOC3 agent.

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. USDOT Number — Text 8 — Official FMCSA registration number
4. Company Name — Text 60 — Process agent company name
5. Attention to or Title — Text 45 — Process agent company contact
6. Street or PO Box — Text 35 — Process agent company address street
7. City — Text 30 — Process agent company address city
8. State — Text 2 — Process agent company address state
9. Country — Text 3 — Process agent company address country
10. Zip Code — Text 10 — Process agent company address zip code

LITIGATION NOTE: BOC3 agent = who to serve legal papers on. Critical for lawyers initiating litigation against a carrier.

---

### Dataset 11 & 12: "InsHist" or "InsHist – All With History"
Contains information on a carrier's PREVIOUS (historical/cancelled) insurance policies. Contains cancellation method, policy type, policy number, effective and cancellation dates.
IMPORTANT NOTE: All insurance information relates to the policy being cancelled, replaced, or prior to a name change. It is NOT the subsequent policy.

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. USDOT Number — Text 8 — Official FMCSA registration number
3. Form Code — Text 3 — 34=Cargo; 82=BI&PD; 83=Cargo; 84=Property Broker's Surety Bond; 85=Property Broker's Trust Fund Agreement; 91/91X=BI&PD/BI&PD Primary/BI&PD Excess
4. Cancellation Method — Text 12 — "cancelled" / "replaced" / "name change" / "transferred"
5. Cancel/Replace/Name Change/Transfer Form — Text 6 — Codes for Cancelled: 35=BMC Cancellation Form; 36=BMC Surety Bond Cancellation Form; 85C=BMC Cancellation for Trust Funds. Codes for Replaced: one of the form codes in field 3. Code for Name Change: "NC". Code for Transferred: "TR"
6. Insurance Type Indicator — Text 1 — " " (space) = BIPD; "*" = Not BIPD (Cargo, Surety, or Trust Fund)
7. Insurance Type Description — Text 12 — Description of insurance form/class
8. Policy Number — Text 25 — Insurance policy specific identifier
9. Minimum Coverage Amount — Text 5 — Minimum insurance amount required for the entity in thousands
10. Insurance Class Code — Text 1 — P=Primary; E=Excess
11. Effective Date — Text 10 — Effective date of the insurance policy
12. BI&PD Underlying Limit Amount — Text 10 — Amount in thousands. When Insurance Class Code is "E", underlying limit = value of the primary insurance
13. BI&PD Max Coverage Amount — Text 10 — Maximum dollar amount covered by the policy in thousands
14. Cancel Effective Date — Text 10 — Date the policy is effectively cancelled
15. Specific Cancellation Method — Text 10 — TERM/CANCL = cancellation executed by FMCSA; Term/REPL = replacement executed by new policy submission
17. Insurance Company Branch — Text 2 — Insurance company branch number
18. Insurance Company Name — Text 45 — Insurance company name

NOTE: For Form Codes 91, 91X, and 82, insurance amounts are in fields 12 and 13. For Form Codes 34, 83, 84, and 85, amounts in fields 12 and 13 will be 0 as they are not BI&PD policies.

LITIGATION NOTE: Combined with ActPendInsur, this dataset provides the COMPLETE insurance timeline for a carrier. Effective Date + Cancel Effective Date across both datasets = full picture of insurance coverage on any historical date.

---

### Dataset 13 & 14: "Rejected" or "Rejected – All With History"
Information on insurance forms REJECTED by FMCSA. Contains insurance policy info, date rejected, and reason for rejection. Linked to carrier by DOT number and docket number.

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. USDOT Number — Text 8 — Official FMCSA registration number
3. Form Code (Insurance or Cancel) — Text 3 — 34=Cargo; 35=BMC Cancellation Form; 36=BMC Surety Bond Cancellation Form; 82=BI&PD; 83=Cargo; 84=Property Broker's Surety Bond; 85=Property Broker's Trust Fund Agreement; 85C=BMC Cancellation for Trust Funds; 91/91X=BI&PD/BI&PD Primary/BI&PD Excess
4. Insurance Type Description — Text 12 — Insurance type associated with the rejected form
5. Policy Number — Text 25 — Insurance policy specific identifier
6. Received Date — Text 10 — Date FMCSA received the form
7. Insurance Class Code — Text 1 — P=Primary; E=Excess (when available)
8. Insurance Type Code — Text 1 — " " (space) = BI&PD; "*" = Not BI&PD
9. Underlying Limit Amount — Text 10 — Amount in thousands
10. Maximum Coverage Amount — Text 10 — Maximum dollar amount covered by the policy in thousands
11. Rejected Date — Text 10 — Date the submitted form was rejected
13. Insurance Branch — Text 2 — Insurance company branch number
14. Company Name — Text 45 — Insurance company name
15. Rejected Reason — Text 300 — THE REASON THE FORM WAS REJECTED (e.g. "Policy is already cancelled")
16. Minimum Coverage Amount — Text 5 — Minimum insurance amount required for the entity in thousands

LITIGATION NOTE: This is the most litigation-relevant dataset after InsHist. Rejected Reason (field 15, 300 chars) explicitly states why FMCSA rejected an insurance filing. Shows carrier attempted to file insurance and was rejected — powerful evidence of insurance gaps. Display prominently in carrier report.

---

### Dataset 15 & 16: "Revocation" or "Revocation – All With History"
Information on carrier/broker/freight forwarder authorities REVOKED by FMCSA. Includes DOT number, docket number, type of authority revoked, and reason.

Fields:
1. Docket Number — Text 8 — MC000000, FF000000 or MX000000
2. USDOT Number — Text 8 — Official FMCSA registration number
3. Operating Authority Registration Type — VARCHAR 128 — common / contract / broker
4. Serve Date — Text 10 — Date the FIRST revocation letter was sent to the entity
5. Revocation Type — Text 60 — The type of revocation action
6. Effective Date — Text 10 — Date the revocation is effective

LITIGATION NOTE: Serve Date vs Effective Date gap is important — carrier was notified but still operating. If accident occurred between Serve Date and Effective Date, carrier was operating under revocation notice.

---

### FMCSA Content Disclaimer (from source document)
- Each dataset is a SNAPSHOT of data at time generated. Information is constantly changing.
- Data is for informational purposes only and does not constitute a legal contract.
- FMCSA data is not intended as, nor offered as, legal advice.
- FMCSA is not liable for any damage or loss caused by reliance on dataset content.

### Insurance Form Code Master Reference
- 34 = Cargo
- 35 = BMC Cancellation Form
- 36 = BMC Surety Bond Cancellation Form
- 82 = BI&PD
- 83 = Cargo
- 84 = Property Broker's Surety Bond
- 85 = Property Broker's Trust Fund Agreement
- 85C = BMC Cancellation for Trust Funds
- 91 = BI&PD
- 91X = BI&PD/Primary or BI&PD/Excess

### Accident Date Filter Logic (using these datasets)
To answer "what was this carrier's status on [accident date]":

INSURANCE: Query ActPendInsur where Effective Date <= accident date AND (Cancel Effective Date >= accident date OR Cancel Effective Date is null). Cross-reference InsHist for cancelled policies that covered that date.

AUTHORITY: Query AuthHist where Original Authority Action Served Date <= accident date AND (Final Authority Served Date >= accident date OR Final Authority Served Date is null).

REVOCATION: Query Revocation where Serve Date <= accident date (carrier was notified) or Effective Date <= accident date (revocation was in effect).

INSURANCE GAPS: Query Rejected where Received Date is near accident date — shows carrier attempted insurance filing that was rejected around time of accident.
