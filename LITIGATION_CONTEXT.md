# Carrier Check USA — Litigation Intelligence Reference

## Purpose

This document captures how truck accident lawyers investigate motor carriers using FMCSA data, and how the Carrier Check USA portal maps to that workflow. It is the product intelligence foundation for feature prioritisation, beta outreach, and positioning.

---

## How Lawyers Use FMCSA Data — The 5 Core Questions

| Lawyer's Question | FMCSA Data Needed | Portal Value |
|---|---|---|
| Was the carrier legally allowed to operate? | USDOT, MC authority, revocation history | Show authority status on crash date, not just today |
| Was the carrier already unsafe before the crash? | Safety rating, BASICs, inspections, OOS, crashes | Build 24-month pre-crash pattern |
| Did the carrier have notice of safety problems? | Prior violations, repeated defects, HOS, maintenance | Highlight repeat red flags |
| Was there insurance coverage? | MCS-90, insurer, policy, cancellation/lapse | Show coverage status and lapses at crash date |
| Who else may be liable? | Broker authority, carrier relationships, MC records | Help identify defendants |

---

## What Lawyers Investigate (Standard Workflow)

Truck accident lawyers currently pull the following from FMCSA manually, across fragmented sources:

- Company Snapshot (USDOT, MC number, operating authority, safety rating)
- SMS BASIC scores (Unsafe Driving, HOS, Driver Fitness, Vehicle Maintenance, Controlled Substances, Crash Indicator)
- Roadside inspection history and OOS rates
- Crash history (fatal, injury, tow-away)
- Insurance filings (MCS-90 public liability, MCS-82 cargo)
- Operating authority records (active, revoked, reinstated)
- Driver Qualification Files (internal — requires discovery)
- ELD/logbook data (internal — requires discovery)
- Drug & Alcohol Clearinghouse (internal — requires discovery)
- ECM/black box data (internal — requires discovery)

The portal covers all public FMCSA data. Internal records require litigation discovery and are outside scope.

---

## The Accident Date Filter — Why It Is the Core Feature

Lawyers need to reconstruct the carrier's profile on the exact crash date, not today.

Key questions that require date-specific data:
- Was operating authority active or revoked on the crash date?
- Was insurance in force on the crash date, or had it lapsed?
- How many crashes had occurred in the 24 months before the crash date?
- What was the OOS rate and violation pattern before the crash date?

No existing public tool answers these questions. FMCSA SAFER shows only current data. The accident date filter is the primary differentiator of this product.

---

## The Montgomery v. Caribe Transport Ruling (May 2026)

The US Supreme Court ruled 9-0 on 14 May 2026 that state-law negligent hiring claims against freight brokers are not preempted by federal law. This fundamentally changes the litigation landscape.

Practical consequence: plaintiff attorneys will now seek the FMCSA safety data the broker had access to on the date of dispatch. This creates direct demand for historical, date-specific carrier safety profiles — exactly what this portal provides.

Post-Montgomery, the relevant markets expand beyond plaintiff lawyers to include:
- Defense lawyers assessing broker exposure
- Freight brokers building vetting documentation
- Insurance underwriters pricing broker liability policies

---

## Portal Feature Map vs. Lawyer Needs

| Lawyer Need | Portal Feature | Status |
|---|---|---|
| Carrier identity and authority status | Carrier profile card | Live |
| Insurance active on crash date | Accident date filter — insurance | In progress |
| Authority active on crash date | Accident date filter — authority YES/NO | In progress |
| 24-month pre-crash pattern | Timeline analysis (24mo before/within/after) | In progress |
| Crash history with fatals | Crash history table | Live |
| Inspection violations (non-clean only) | Inspections table — filtered | In progress |
| SMS BASIC scores | SMS section | Live (null issue to fix) |
| Plain-English violation descriptions | CFR code translation | In progress |
| Red flag summary | Lawyer-focused report layout | Planned |
| Discovery checklist based on red flags | Future feature | Planned |

---

## Known Data Issues (Fix Before Beta)

1. **SMS null values display as 0th percentile** — lawyers will misread this as a perfect safety score. Display "Not Available" instead.
2. **State abbreviations** — replace with full state names throughout.
3. **Date format inconsistency** — standardise to DD MMM YYYY everywhere.
4. **CFR codes and FMCSA abbreviations** — translate to plain English at display layer.
5. **Clean inspections (zero violations)** — hide from inspection table. Lawyers only need non-compliant inspections.

---

## Minimum Viable Litigation Report Structure

1. **Carrier Identity** — DOT, MC, legal name, DBA, address, operating status, authority type
2. **Status on Event Date** — active/revoked/inactive, insured/uninsured, authorized/unauthorized
3. **24 Months Before Event** — crashes, inspections with violations, OOS events, BASIC-related patterns
4. **More Than 24 Months Before Event** — older revocations, repeated insurance cancellations, long-term pattern
5. **Event Date to Search Date** — post-crash revocation, insurance cancellation, authority changes, new violations
6. **Red Flag Summary** — what a lawyer should notice within 30 seconds
7. **Discovery Checklist** — based on red flags, what to demand: DQF, ELD, maintenance file, drug/alcohol records, dispatch records, insurance documents

---

## Commercial Markets

| Market | Use Case | Willingness to Pay |
|---|---|---|
| Plaintiff truck accident lawyers | Prove negligence, notice, punitive damages | Very high |
| Defense lawyers | Assess carrier exposure early | High |
| Insurance and subrogation | Coverage disputes, liability, recovery | High |
| Freight brokers and 3PLs | Carrier vetting, negligent selection defence | Medium-high |

---

## Product Positioning Statement

Carrier Check USA is not a DOT lookup tool.

It is a litigation-focused carrier investigation report that reconstructs a motor carrier's safety, authority, insurance, and compliance profile as of any specified event date — compressing a multi-hour manual FMCSA investigation into a single structured report.

---

## Key Sources

- Haug Barron Law Group — FMCSA Records and Trucking Company Liability (hblg.law)
- Sam Aguiar Injury Lawyers — Fleet Management System Data in Truck Crash Investigations (aguiarinjurylawyers.com)
- TruckSafe — Montgomery v. Caribe Transport SCOTUS Analysis (trucksafe.com)
- Foley Carrier Services — How CSA Scores Affect Trucking Insurance Rates (foleyservices.com)
- Billy Johnson Law — The Critical Role of the FMCSA in Truck Accident Lawsuits (billyjohnsonlaw.com)
- Fried Goldberg LLC — Understanding Motor Carrier Claims (practitioner litigation guide)

---

*Last updated: June 2026*
