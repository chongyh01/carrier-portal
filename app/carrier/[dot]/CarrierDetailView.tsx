"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import cfrJson from "./cfr_descriptions.json";
import KeyFindings from "./KeyFindings";
import CarrierTimeline from "./CarrierTimeline";
import type {
  Carrier,
  SmsScores,
  Crash,
  Inspection,
  Violation,
  Insurance,
  AuthorityRecord,
  CarrierAlert,
  OosOrder,
  Boc3Agent,
  RejectedInsurance,
  SuspectSuccessor,
} from "./types";

const ALERT_THRESHOLD = 75;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d?: string | null): string {
  if (!d || d.startsWith("1970-01-01")) return "—";
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function dateOnly(d?: string | null): string | null {
  if (!d || d.startsWith("1970-01-01")) return null;
  return d.slice(0, 10);
}

function mostRecent(dates: (string | undefined | null)[]): string | undefined {
  return dates.filter((d): d is string => !!d).sort().pop();
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};
function stateName(code?: string | null): string {
  if (!code) return "—";
  return STATE_NAMES[code.toUpperCase()] ?? code;
}

const INSPECTION_LEVELS: Record<number, string> = {
  1: "Full (Driver + Vehicle)",
  2: "Walk-Around (Driver + Vehicle)",
  3: "Driver Only",
  4: "Special",
  5: "Vehicle Only",
  6: "Enhanced NAS",
  7: "Cargo / Large Vehicle",
};

const VIOLATION_CATEGORY: Record<number, string> = {
  1: "Medical Certificate", 2: "False Log Book", 3: "Log Book / Hours of Service",
  4: "10/15 Hours", 5: "15/20 Hours", 6: "60/70/80 Hours",
  7: "All Other Hours of Service", 8: "Disqualified Driver", 9: "Drugs",
  10: "Alcohol", 11: "Seat Belt", 12: "Traffic Enforcement", 13: "Radar Detector",
  14: "All Other Driver Violations", 15: "Brakes — Out of Adjustment",
  16: "Brakes — All Other", 17: "Coupling Devices", 18: "Fuel Systems",
  19: "Frames", 20: "Lighting", 21: "Steering Mechanism", 22: "Suspension",
  23: "Tires", 24: "Wheels / Studs / Clamps", 25: "Load Securement",
  26: "Windshield", 27: "Exhaust Discharge", 28: "Emergency Equipment",
  29: "Periodic Inspection", 30: "All Other Vehicle Defects",
  31: "Hazmat — Shipping Papers", 32: "Hazmat — Improper Placarding",
  33: "Hazmat — Improperly Marked Shipment", 34: "Hazmat — Improper Blocking & Bracing",
  35: "Hazmat — No Cargo Tank Retest", 36: "Hazmat — No Remote Shutoff",
  37: "Hazmat — Non-Specification Container", 38: "Hazmat — Emergency Response",
  39: "Hazmat — All Other", 40: "Failure to Obey Traffic Control Device",
  41: "Following Too Close", 42: "Improper Lane Change", 43: "Improper Passing",
  44: "Reckless Driving", 45: "Speeding", 46: "Improper Turns",
  47: "Size and Weight", 48: "Failure to Yield Right of Way",
  49: "State/Local Hours of Service", 99: "Unknown",
};

const CFR_DESCRIPTIONS: Record<string, string> = {
  "390.5": "Definitions", "390.11": "General application",
  "390.15": "Assistance in investigations", "390.17": "State and local laws",
  "390.19": "Motor carrier identification report", "390.21": "CMV marking requirements",
  "390.35": "Falsification of records",
  "391.11": "General driver qualifications", "391.15": "Driver disqualification",
  "391.21": "Application for employment", "391.23": "Investigation and inquiries",
  "391.25": "Annual review of driving record", "391.27": "Record of violations",
  "391.31": "Road test", "391.41": "Physical qualifications for drivers",
  "391.43": "Medical examination certificate", "391.45": "Medical examination required",
  "391.51": "Driver qualification files",
  "392.2": "Operating rules compliance", "392.3": "Ill or fatigued operator",
  "392.4": "Drugs and substances", "392.5": "Alcohol prohibition",
  "392.7": "Equipment inspection and use", "392.8": "Emergency equipment use",
  "392.9": "Cargo inspection", "392.10": "Railroad grade crossing — slow down",
  "392.12": "Railroad grade crossing — stop required",
  "392.14": "Hazardous driving conditions", "392.16": "Seat belt use required",
  "392.22": "Stopped CMV — warning signals", "392.60": "Unauthorized passengers",
  "392.80": "No texting while driving", "392.82": "No hand-held mobile phone",
  "393.5": "Lighting definitions", "393.9": "Inoperative required lamps",
  "393.11": "Required lamps and reflectors", "393.13": "Retroreflective sheeting",
  "393.17": "Lamps/reflectors — combination vehicles", "393.19": "Turn signaling system",
  "393.22": "Combination lighting devices", "393.24": "Headlighting system",
  "393.25": "Other lamp requirements", "393.26": "Reflector requirements",
  "393.28": "Wiring systems", "393.29": "Protected wiring", "393.30": "Battery installation",
  "393.40": "Required brake systems", "393.41": "Parking brake system",
  "393.42": "Brakes required on all wheels", "393.43": "Breakaway and emergency braking",
  "393.44": "Front brake line protection", "393.45": "Brake tubing and hose",
  "393.47": "Brake actuators, slack adjusters, linings",
  "393.48": "Brakes must be operative", "393.49": "Control valve requirements",
  "393.50": "Reservoir requirements", "393.51": "Warning devices",
  "393.52": "Brake performance standards", "393.53": "Automatic brake adjusters",
  "393.55": "Antilock brake systems (ABS)",
  "393.60": "Glazing in openings", "393.65": "Fuel systems",
  "393.67": "Liquid fuel tanks", "393.75": "Tire requirements",
  "393.76": "Sleeper berths", "393.77": "Heater requirements",
  "393.78": "Windshield wipers", "393.79": "Defrosting devices",
  "393.80": "Rear-vision mirrors", "393.82": "Speedometers",
  "393.83": "Exhaust systems", "393.84": "Floors",
  "393.86": "Rear impact guards", "393.87": "Warning flags for projecting loads",
  "393.93": "Seat belts and anchorages", "393.95": "Emergency equipment",
  "393.100": "Cargo securement — general", "393.102": "Cargo securement systems",
  "393.104": "Cargo securement devices", "393.106": "Front end structures",
  "393.110": "Cargo — minimum requirements",
  "395.1": "Scope of hours-of-service rules", "395.3": "Max driving time — property",
  "395.5": "Max driving time — passengers", "395.7": "Max duty time — passengers",
  "395.8": "Driver's record of duty status", "395.10": "Submission of duty record",
  "395.11": "Supporting documents", "395.13": "Driver declared out of service",
  "395.15": "Automatic on-board recording device",
  "395.20": "Electronic logging device (ELD) required",
  "395.22": "Motor carrier ELD responsibilities",
  "395.24": "Driver ELD responsibilities", "395.26": "ELD record of duty status",
  "396.3": "Inspection, repair, and maintenance",
  "396.5": "Lubrication", "396.7": "Unsafe operations forbidden",
  "396.9": "Inspector qualifications", "396.11": "Driver vehicle inspection report",
  "396.12": "Procedures for correcting defects", "396.13": "Driver pre-trip inspection",
  "396.17": "Periodic vehicle inspections", "396.19": "Inspector qualifications",
  "396.21": "Periodic inspection recordkeeping",
  "396.23": "Equivalent to periodic inspection",
  "396.25": "Intermodal equipment inspection",
};
const CFR_FULL = cfrJson as Record<string, string>;

function cfrDescription(raw?: string | null): string | null {
  if (!raw || raw === "999") return null;
  const t = raw.trim();
  // 1. Exact match
  if (CFR_FULL[t]) return CFR_FULL[t];
  // 1b. Uppercase suffix fallback (handles lowercase codes from DB e.g. "398.8D1-mw" → "398.8D1-MW")
  const upper = t.toUpperCase();
  if (CFR_FULL[upper]) return CFR_FULL[upper];
  // 2. Prefix match (e.g. "393.48-BRAKES" → try "393.48")
  const m = t.match(/^(\d+\.\d+[A-Za-z0-9]*)/);
  if (m) {
    const prefix = CFR_FULL[m[1]] ?? CFR_FULL[m[1].toUpperCase()];
    if (prefix) return prefix;
  }
  // 3. Numeric-only prefix fallback (hardcoded common codes)
  const numM = t.match(/^(\d+\.\d+)/);
  return numM ? (CFR_DESCRIPTIONS[numM[1]] ?? null) : null;
}

const INSURANCE_FORM_CODES: Record<string, string> = {
  "34": "Cargo Insurance", "82": "Public Liability Insurance (BI&PD)",
  "83": "Cargo Insurance", "84": "Property Broker's Surety Bond",
  "85": "Property Broker's Trust Fund", "85C": "BMC Trust Fund Cancellation",
  "91": "Public Liability Insurance", "91X": "Public Liability Insurance",
};
function insuranceTypeLabel(code?: string | null): string {
  if (!code) return "—";
  return INSURANCE_FORM_CODES[code.trim().toUpperCase()] ?? code;
}

function isInsuranceActiveOn(ins: Insurance, accidentDate: string): boolean {
  const eff = dateOnly(ins.effective_date);
  const cancel = dateOnly(ins.cancellation_date);
  if (!eff || eff > accidentDate) return false;
  if (cancel && cancel < accidentDate) return false;
  return true;
}

function isAuthorityActiveOn(a: AuthorityRecord, accidentDate: string): boolean {
  // INVOL REV and REJECTED records are not active grant periods
  const s = (a.status ?? "").toUpperCase();
  if (s.includes("REVOC") || s === "REJECTED") return false;
  const eff = dateOnly(a.effective_date);
  const rev = dateOnly(a.revocation_date);
  if (!eff || eff > accidentDate) return false;
  if (rev && rev < accidentDate) return false;
  return true;
}

function isNonCompliant(i: Inspection): boolean {
  return (i.total_violations ?? 0) > 0 || (i.oos_vehicles ?? 0) > 0 || (i.oos_drivers ?? 0) > 0;
}

function ScoreRow({ label, value, alert }: { label: string; value?: number | null; alert?: boolean | null }) {
  const hasScore = value !== null && value !== undefined && value > 0;
  const isAlert = hasScore && (alert ?? value! >= ALERT_THRESHOLD);
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>{label}</span>
        {hasScore ? (
          <span style={{ fontSize: "12px", fontWeight: 700, color: isAlert ? "#ef4444" : "#374151", fontFamily: "'DM Mono', monospace" }}>
            {value}th {isAlert && "⚠"}
          </span>
        ) : (
          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontStyle: "italic" }}>Not Available</span>
        )}
      </div>
      <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
        {hasScore && (
          <div style={{ height: "100%", width: `${value}%`, background: isAlert ? "#ef4444" : value! >= 50 ? "#f97316" : "#22c55e", borderRadius: "3px" }} />
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ minWidth: "160px", fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "14px", color: "#0f172a" }}>{value}</span>
    </div>
  );
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span style={{
      display: "inline-block", padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 700,
      fontFamily: "'DM Mono', monospace",
      background: value ? "#f0fdf4" : "#fef2f2",
      color: value ? "#22c55e" : "#ef4444",
    }}>
      {value ? "YES" : "NO"}
    </span>
  );
}

function SectionHeader({ title, source, lastUpdated, right }: { title: string; source: string; lastUpdated?: string | null; right?: ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>{title}</h2>
        {right}
      </div>
      <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "4px" }}>
        Source: {source}{lastUpdated ? ` · Last Updated: ${fmtDate(lastUpdated)}` : ""}
      </p>
    </div>
  );
}

// suppress unused warning — SectionHeader kept for potential future use within buckets
void SectionHeader;
void mostRecent;
void YesNoBadge;

// ─── inRange ────────────────────────────────────────────────
function inRange(dateStr: string | null | undefined, start: string | null, end: string | null): boolean {
  if (!dateStr || dateStr.startsWith("1970-01-01")) return false;
  const d = dateStr.slice(0, 10);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

// ─── Sub-section header ──────────────────────────────────────
function SubHeader({ title }: { title: string }) {
  return (
    <h3 style={{
      fontSize: "14px", fontWeight: 600, color: "#0f172a",
      borderBottom: "1px solid #f1f5f9", paddingBottom: "8px",
      marginTop: "24px", marginBottom: "12px",
    }}>
      {title}
    </h3>
  );
}

// ─── TimeBucketSection ───────────────────────────────────────
type TimeBucketProps = {
  label: string;
  sub: string;
  highlight?: boolean;
  bucketStart: string | null;
  bucketEnd: string | null;
  crashes: Crash[];
  violations: Violation[];
  insurance: Insurance[];
  oosOrders: OosOrder[];
  revocations: CarrierAlert[];
  authorityHistory: AuthorityRecord[];
  inspections: Inspection[];
  carrier: Carrier;
  sms: SmsScores | null;
};

function TimeBucketSection({
  label, sub, highlight = false,
  bucketStart, bucketEnd,
  crashes, violations, insurance, oosOrders, revocations, authorityHistory, inspections,
  carrier, sms,
}: TimeBucketProps) {
  const s = bucketStart;
  const e = bucketEnd;

  const bucketCrashes      = crashes.filter(c   => inRange(c.crash_date,      s, e));
  const bucketViolations   = violations.filter(v  => inRange((v as Violation & { inspection_date?: string }).inspection_date, s, e));
  // Insurance: include any policy active at any point during the bucket (not just ones that started in it)
  const bucketInsurance    = insurance.filter(ins => {
    const eff = dateOnly(ins.effective_date);
    const cancel = dateOnly(ins.cancellation_date);
    if (!eff) return false;
    if (e && eff > e) return false;          // started after bucket end
    if (s && cancel && cancel < s) return false; // ended before bucket start
    return true;
  });
  const bucketOos          = oosOrders.filter(o   => inRange(o.order_date,      s, e));
  const bucketRevocations  = revocations.filter(r  => inRange(r.event_date,     s, e));
  // Authority: include any grant active at any point during the bucket
  const bucketAuthority    = authorityHistory.filter(a => {
    const eff = dateOnly(a.effective_date);
    const rev = dateOnly(a.revocation_date);
    if (!eff) return false;
    if (e && eff > e) return false;          // granted after bucket end
    if (s && rev && rev < s) return false;   // revoked before bucket start
    return true;
  });
  const bucketInspections  = inspections.filter(i  => inRange(i.inspection_date, s, e)).filter(isNonCompliant);

  const ratingDate     = carrier.safety_rating_date || carrier.review_date;
  const ratingInBucket = inRange(ratingDate, s, e);
  const smsInBucket    = sms ? inRange(sms.score_date, s, e) : false;

  const isEmpty =
    bucketCrashes.length === 0 && bucketViolations.length === 0 &&
    bucketInsurance.length === 0 && bucketOos.length === 0 &&
    bucketRevocations.length === 0 && bucketAuthority.length === 0 &&
    bucketInspections.length === 0 && !ratingInBucket && !smsInBucket;

  const TH = ({ cols }: { cols: string[] }) => (
    <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
      {cols.map(h => (
        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
      ))}
    </tr>
  );

  return (
    <div style={{
      background: "white", borderRadius: "12px",
      border: highlight ? "1px solid #fde68a" : "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "24px", overflow: "hidden",
    }}>
      <div style={{
        background: highlight ? "#fffbeb" : "#f8fafc",
        borderBottom: highlight ? "1px solid #fde68a" : "1px solid #e2e8f0",
        padding: "20px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{label}</h2>
          <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>{sub}</span>
        </div>
      </div>

      <div style={{ padding: "4px 28px 28px" }}>
        {isEmpty ? (
          <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "20px" }}>
            No records in this period.
          </p>
        ) : (
          <>
            {/* Crash History */}
            {bucketCrashes.length > 0 && (() => {
              const crashFatal   = bucketCrashes.reduce((sum, c) => sum + (c.fatal    ?? 0), 0);
              const crashInjury  = bucketCrashes.reduce((sum, c) => sum + (c.injury   ?? 0), 0);
              const crashTowaway = bucketCrashes.reduce((sum, c) => sum + (c.towaway  ?? 0), 0);
              const crashStates  = [...new Set(bucketCrashes.map(c => c.state).filter((s): s is string => !!s))];
              const n            = bucketCrashes.length;
              const stateNote    = crashStates.length === 1
                ? `All crashes in ${stateName(crashStates[0])}`
                : crashStates.length > 1
                  ? `Crashes across ${crashStates.length} states`
                  : null;
              return (
                <>
                  <SubHeader title="Crash History" />
                  {/* Crash Summary Card */}
                  <div style={{ background: crashFatal > 0 ? "#fef2f2" : "#f8fafc", border: `1px solid ${crashFatal > 0 ? "#fecaca" : "#e2e8f0"}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
                    <p style={{ fontSize: "13px", color: "#374151", fontFamily: "'DM Mono', monospace", marginBottom: crashFatal > 0 || n >= 3 || stateNote ? "4px" : "0" }}>
                      {n} crash{n !== 1 ? "es" : ""} · {crashFatal} fatal · {crashInjury} injury · {crashTowaway} towaway
                    </p>
                    {(crashFatal > 0 || n >= 3 || stateNote) && (
                      <p style={{ fontSize: "12px", color: "#64748b", fontFamily: "'DM Mono', monospace" }}>
                        {crashFatal > 0 && <span style={{ color: "#dc2626", fontWeight: 700, marginRight: "12px" }}>⚠ Fatal crash recorded in this period</span>}
                        {n >= 3 && <span style={{ marginRight: "12px" }}>Pattern: {n} crashes in {label} — above single-incident threshold</span>}
                        {stateNote && <span>{stateNote}</span>}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                    <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 16px" }}>
                      <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "3px" }}>TOTAL</p>
                      <p style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>{bucketCrashes.length}</p>
                    </div>
                    {crashFatal > 0 && (
                      <div style={{ background: "#fef2f2", borderRadius: "8px", padding: "10px 16px" }}>
                        <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "3px" }}>FATAL</p>
                        <p style={{ fontSize: "22px", fontWeight: 700, color: "#ef4444" }}>{crashFatal}</p>
                      </div>
                    )}
                    {crashInjury > 0 && (
                      <div style={{ background: "#fff7ed", borderRadius: "8px", padding: "10px 16px" }}>
                        <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "3px" }}>INJURY</p>
                        <p style={{ fontSize: "22px", fontWeight: 700, color: "#f97316" }}>{crashInjury}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead><TH cols={["Date", "State", "Fatal", "Injury", "Towaway", "Report #"]} /></thead>
                      <tbody>
                        {bucketCrashes.map((c, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: (c.fatal ?? 0) > 0 ? "#fef2f2" : "transparent" }}>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(c.crash_date)}</td>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{stateName(c.state)}</td>
                            <td style={{ padding: "8px 12px", color: (c.fatal ?? 0) > 0 ? "#ef4444" : "#374151", fontWeight: (c.fatal ?? 0) > 0 ? 700 : 400 }}>{c.fatal}</td>
                            <td style={{ padding: "8px 12px", color: (c.injury ?? 0) > 0 ? "#f97316" : "#374151" }}>{c.injury}</td>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{c.towaway}</td>
                            <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{c.report_number ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}

            {/* Violations */}
            {bucketViolations.length > 0 && (
              <>
                <SubHeader title="Violations" />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><TH cols={["Date", "Category", "Violation Description / CFR Code", "Unit", "Out of Service (OOS)"]} /></thead>
                    <tbody>
                      {bucketViolations.map((v, i) => {
                        const vx = v as Violation & { inspection_date?: string };
                        const isOos = v.oos_indicator === "Y";
                        const catCode = v.violation_code ? parseInt(v.violation_code) : null;
                        const catName = catCode !== null && !isNaN(catCode) ? (VIOLATION_CATEGORY[catCode] ?? `Code ${catCode}`) : null;
                        const cfrPlain = cfrDescription(v.description);
                        const hasDate = vx.inspection_date && !vx.inspection_date.startsWith("1970-01-01");
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: isOos ? "#fef2f2" : "transparent" }}>
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: hasDate ? "#374151" : "#94a3b8", fontStyle: hasDate ? "normal" : "italic" }}>
                              {hasDate ? fmtDate(vx.inspection_date) : "Date unavailable"}
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              {catName
                                ? <span style={{ color: "#374151" }}>{catName}</span>
                                : <span style={{ color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{v.violation_code ?? "—"}</span>
                              }
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              {cfrPlain ? (
                                <div>
                                  <span style={{ color: "#374151", display: "block", fontWeight: 600 }}>{cfrPlain}</span>
                                  <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "10px" }}>{v.description}</span>
                                </div>
                              ) : v.description ? (
                                <div>
                                  <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "10px", fontStyle: "italic" }}>description unavailable</span>
                                  <span style={{ color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px", display: "block" }}>{v.description}</span>
                                </div>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{v.unit_type ?? "—"}</td>
                            <td style={{ padding: "8px 12px", color: isOos ? "#ef4444" : "#22c55e", fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{isOos ? "YES" : "NO"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Insurance History */}
            {bucketInsurance.length > 0 && (
              <>
                <SubHeader title="Insurance History" />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><TH cols={["Type", "Insurer", "Policy #", "Effective", "Cancelled", "Status"]} /></thead>
                    <tbody>
                      {bucketInsurance.map((ins, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ color: "#374151", display: "block" }}>{insuranceTypeLabel(ins.policy_type)}</span>
                            {ins.policy_type && INSURANCE_FORM_CODES[ins.policy_type.trim().toUpperCase()] && (
                              <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "10px" }}>{ins.policy_type}</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>{ins.insurer_name ?? "—"}</td>
                          <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.policy_number ?? "—"}</td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(ins.effective_date)}</td>
                          <td style={{ padding: "8px 12px", color: ins.cancellation_date ? "#ef4444" : "#94a3b8" }}>{fmtDate(ins.cancellation_date)}</td>
                          <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.status ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* OOS Orders & Reinstatements */}
            {bucketOos.length > 0 && (
              <>
                <SubHeader title="Out-of-Service (OOS) Orders & Reinstatements" />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><TH cols={["Order Date", "Reason", "Status", "Reinstated"]} /></thead>
                    <tbody>
                      {bucketOos.map((o, i) => {
                        const isActive    = o.status === "ACTIVE";
                        const isReinstated = o.status === "REINSTATED" || !!o.reinstatement_date;
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: isActive ? "#fef2f2" : "transparent" }}>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(o.order_date)}</td>
                            <td style={{ padding: "8px 12px", color: "#374151", maxWidth: "280px" }}>{o.reason ?? "—"}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, fontFamily: "'DM Mono', monospace", background: isActive ? "#fef2f2" : isReinstated ? "#f0fdf4" : "#f8fafc", color: isActive ? "#ef4444" : isReinstated ? "#22c55e" : "#64748b" }}>
                                {o.status ?? "—"}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", color: "#22c55e" }}>{fmtDate(o.reinstatement_date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Revocation History */}
            {bucketRevocations.length > 0 && (
              <>
                <SubHeader title="Revocation History" />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><TH cols={["Date", "Description"]} /></thead>
                    <tbody>
                      {bucketRevocations.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: "#fef2f2" }}>
                          <td style={{ padding: "8px 12px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(a.event_date)}</td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>Involuntary Revocation</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Authority History */}
            {bucketAuthority.length > 0 && (
              <>
                <SubHeader title="Authority History" />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><TH cols={["Type", "Status", "Effective", "Revoked", "Reason"]} /></thead>
                    <tbody>
                      {bucketAuthority.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{a.authority_type ?? "—"}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {a.status ? (
                              <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, fontFamily: "'DM Mono', monospace", background: a.status.toLowerCase().includes("active") ? "#f0fdf4" : "#f8fafc", color: a.status.toLowerCase().includes("active") ? "#22c55e" : "#64748b" }}>
                                {a.status}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(a.effective_date)}</td>
                          <td style={{ padding: "8px 12px", color: a.revocation_date ? "#ef4444" : "#94a3b8" }}>{fmtDate(a.revocation_date)}</td>
                          <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "12px" }}>{a.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Inspection History */}
            {bucketInspections.length > 0 && (
              <>
                <SubHeader title="Inspection History" />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead><TH cols={["Date", "State", "Level", "Violations", "Out of Service Vehicles", "Out of Service Drivers"]} /></thead>
                    <tbody>
                      {bucketInspections.map((insp, i) => {
                        const hasOos    = (insp.oos_vehicles ?? 0) > 0 || (insp.oos_drivers ?? 0) > 0;
                        const hasDate   = insp.inspection_date && !insp.inspection_date.startsWith("1970-01-01");
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: hasOos ? "#fff7ed" : "transparent" }}>
                            <td style={{ padding: "8px 12px", color: hasDate ? "#374151" : "#94a3b8", fontStyle: hasDate ? "normal" : "italic" }}>
                              {hasDate ? fmtDate(insp.inspection_date) : "Date unavailable"}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{stateName(insp.state)}</td>
                            <td style={{ padding: "8px 12px", color: "#374151", fontSize: "11px" }}>
                              {insp.level != null ? (INSPECTION_LEVELS[parseInt(insp.level)] ?? `Level ${insp.level}`) : "—"}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#374151" }}>{insp.total_violations ?? "—"}</td>
                            <td style={{ padding: "8px 12px", color: (insp.oos_vehicles ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_vehicles ?? 0) > 0 ? 700 : 400 }}>{insp.oos_vehicles ?? "—"}</td>
                            <td style={{ padding: "8px 12px", color: (insp.oos_drivers ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_drivers ?? 0) > 0 ? 700 : 400 }}>{insp.oos_drivers ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Safety Rating */}
            {ratingInBucket && (
              <>
                <SubHeader title="Safety Rating" />
                {carrier.safety_rating && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", minWidth: "160px", textTransform: "uppercase" }}>Rating</span>
                    <span style={{
                      display: "inline-block", padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 700, fontFamily: "'DM Mono', monospace",
                      background: carrier.safety_rating.toLowerCase() === "satisfactory" ? "#f0fdf4" : carrier.safety_rating.toLowerCase() === "conditional" ? "#fff7ed" : carrier.safety_rating.toLowerCase() === "unsatisfactory" ? "#fef2f2" : "#f8fafc",
                      color:      carrier.safety_rating.toLowerCase() === "satisfactory" ? "#22c55e" : carrier.safety_rating.toLowerCase() === "conditional" ? "#f97316" : carrier.safety_rating.toLowerCase() === "unsatisfactory" ? "#ef4444" : "#64748b",
                    }}>
                      {carrier.safety_rating.toUpperCase()}
                    </span>
                    {dateOnly(carrier.safety_rating_date) && (
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                        as of {fmtDate(carrier.safety_rating_date)}
                      </span>
                    )}
                  </div>
                )}
                <InfoRow label="Review Type" value={carrier.review_type} />
                <InfoRow label="Review Date" value={carrier.review_date ? fmtDate(carrier.review_date) : undefined} />
                {(() => {
                  const rd = carrier.safety_rating_date || carrier.review_date;
                  if (!rd) return null;
                  const yearsOld = new Date().getUTCFullYear() - parseInt(rd.slice(0, 4));
                  if (yearsOld <= 10) return null;
                  return (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginTop: "12px" }}>
                      <p style={{ fontSize: "12px", color: "#92400e", fontFamily: "'DM Mono', monospace" }}>
                        ⚠ Note: No more recent safety review located. This rating is {yearsOld} years old and may not reflect current safety status.
                      </p>
                    </div>
                  );
                })()}
              </>
            )}

            {/* SMS Safety Scores */}
            {smsInBucket && sms ? (
              <>
                <SubHeader title="Safety Measurement System (SMS) Scores" />
                {sms.score_date && (
                  <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>
                    Safety Measurement System (SMS) Period: {fmtDate(sms.score_date)}
                  </p>
                )}
                <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px", letterSpacing: "1px" }}>PERCENTILE RANKING (≥75 = ALERT)</p>
                <ScoreRow label="UNSAFE DRIVING"                             value={sms.unsafe_driving}               alert={sms.unsafe_driving_alert} />
                <ScoreRow label="CRASH INDICATOR"                            value={sms.crash_indicator}              alert={sms.crash_indicator_alert} />
                <ScoreRow label="DRIVER FITNESS"                             value={sms.driver_fitness}               alert={sms.driver_fitness_alert} />
                <ScoreRow label="VEHICLE MAINTENANCE"                        value={sms.vehicle_maintenance}          alert={sms.vehicle_maintenance_alert} />
                <ScoreRow label="CONTROLLED SUBSTANCES"                      value={sms.controlled_substances_alcohol} alert={sms.controlled_substances_alcohol_alert} />
                <ScoreRow label="HOURS OF SERVICE (HOS) COMPLIANCE"         value={sms.hours_of_service_compliance}  alert={sms.hours_of_service_compliance_alert} />
                <ScoreRow label="HAZARDOUS MATERIALS"                        value={sms.hazardous_materials}          alert={sms.hazardous_materials_alert} />
              </>
            ) : !sms ? (
              <>
                <SubHeader title="Safety Measurement System (SMS) Scores" />
                <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontStyle: "italic" }}>
                  No Safety Measurement System (SMS) scores published by the Federal Motor Carrier Safety Administration (FMCSA) for this carrier. Possible reasons include insufficient inspection volume or inactive carrier status.
                </p>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Carrier type helpers ─────────────────────────────────────
// Private property/passenger carriers are exempt from FMCSA operating
// authority (MC number) and mandatory FMCSA insurance filings.
function isLikelyPrivateCarrier(carrier: Carrier): boolean {
  const ct = (carrier.cargo_type ?? "").toUpperCase();
  const hasNoMc = !carrier.mc_number || carrier.mc_number === "MC";
  const isPrivate = ct.includes("PRIVATE PROPERTY") || ct.includes("PRIVATE PASSENGER");
  const isApplyingForMc = ct.includes("APPLYING FOR MC");
  return isPrivate && hasNoMc && !isApplyingForMc;
}

// ─── Derive insurance/authority status with auditable basis ──
// status: 'active' | 'inactive' | 'not_required'
function deriveInsuranceBasis(
  insurance: Insurance[],
  accidentDate: string,
  carrier: Carrier,
): { status: "active" | "inactive" | "not_required" | "unknown"; basis: string } {
  if (insurance.length === 0) {
    if (isLikelyPrivateCarrier(carrier))
      return {
        status: "not_required",
        basis: "No FMCSA insurance filings located. Private property carriers are generally not required to maintain FMCSA insurance filings.",
      };
    return { status: "inactive", basis: "No FMCSA insurance filings found for this carrier." };
  }

  // First: look for any policy directly active on the accident date
  const activeAtDate = insurance.find(ins => isInsuranceActiveOn(ins, accidentDate));
  if (activeAtDate) {
    const policyRef = activeAtDate.policy_number ? `Policy ${activeAtDate.policy_number}` : "Policy on file";
    const insurer = activeAtDate.insurer_name ?? "insurer on file";
    const cancel = dateOnly(activeAtDate.cancellation_date);
    const cancelClause = cancel ? "" : ", no cancellation before accident date";
    return {
      status: "active",
      basis: `${policyRef} with ${insurer} effective ${fmtDate(activeAtDate.effective_date)}${cancelClause}.`,
    };
  }

  // No directly active policy — find the most recent pre-accident policy
  const candidates = insurance
    .filter(ins => {
      const eff = dateOnly(ins.effective_date);
      return eff !== null && eff <= accidentDate;
    })
    .sort((a, b) => {
      const effA = dateOnly(a.effective_date) ?? "";
      const effB = dateOnly(b.effective_date) ?? "";
      if (effB !== effA) return effB.localeCompare(effA);
      const canA = dateOnly(a.cancellation_date) ?? "";
      const canB = dateOnly(b.cancellation_date) ?? "";
      if (canB !== canA) return canB.localeCompare(canA);
      return (b.imported_at ?? "").localeCompare(a.imported_at ?? "");
    });

  if (candidates.length === 0)
    return {
      status: "inactive",
      basis: `No insurance filing found with effective date on or before ${fmtDate(accidentDate)}.`,
    };

  const rec = candidates[0];
  const cancel = dateOnly(rec.cancellation_date);
  const policyRef = rec.policy_number ? `Policy ${rec.policy_number}` : "Policy on file";

  // "Replaced" means a successor policy exists — we just can't locate it in available records
  if ((rec.status ?? "").toLowerCase() === "replaced" && cancel && cancel <= accidentDate) {
    return {
      status: "unknown",
      basis: `${policyRef} was replaced as of ${fmtDate(rec.cancellation_date)}. Replacement policy not located in available records — verify current insurance status directly with FMCSA.`,
    };
  }

  if (cancel && cancel <= accidentDate) {
    const yearsGap = parseInt(accidentDate.slice(0, 4)) - parseInt(cancel.slice(0, 4));
    const longGap = yearsGap >= 3 ? ` Note: insurance lapsed ${yearsGap}+ years before accident date.` : "";
    return {
      status: "inactive",
      basis: `${policyRef} cancelled on ${fmtDate(rec.cancellation_date)}. No active filing found as of ${fmtDate(accidentDate)}.${longGap}`,
    };
  }

  const insurer = rec.insurer_name ?? "insurer on file";
  const cancelClause = cancel ? "" : ", no cancellation before accident date";
  return {
    status: "active",
    basis: `${policyRef} with ${insurer} effective ${fmtDate(rec.effective_date)}${cancelClause}.`,
  };
}

function deriveAuthorityBasis(
  authorityHistory: AuthorityRecord[],
  accidentDate: string,
  carrier: Carrier,
): { status: "active" | "inactive" | "not_required"; basis: string } {
  if (authorityHistory.length === 0) {
    if (isLikelyPrivateCarrier(carrier))
      return {
        status: "not_required",
        basis: "No operating authority records located. Private property carriers are generally not required to obtain FMCSA operating authority.",
      };
    return { status: "inactive", basis: "No operating authority records found for this carrier." };
  }

  // Check for an active involuntary revocation window at the accident date.
  // INVOL REV rows: effective_date = when revocation started,
  // revocation_date = when it was discontinued (reinstated).
  // If eff <= accidentDate AND (rev is null OR rev > accidentDate) → active revocation.
  // Skip "DISCONTINUED REVOCATION" records — these mean the revocation was reversed and
  // the carrier's authority was NOT actually lapsed.
  const activeInvolRev = authorityHistory.find(a => {
    if (!(a.status ?? "").toUpperCase().includes("INVOLUNTARY")) return false;
    if ((a.reason ?? "").toUpperCase().includes("DISCONTINUED")) return false;
    const eff = dateOnly(a.effective_date);
    const rev = dateOnly(a.revocation_date);
    if (!eff || eff > accidentDate) return false;
    return !rev || rev > accidentDate;
  });

  if (activeInvolRev) {
    return {
      status: "inactive",
      basis: `Involuntary revocation in effect from ${fmtDate(activeInvolRev.effective_date)}. No reinstatement found before ${fmtDate(accidentDate)}.`,
    };
  }

  // No active INVOL REV — look for a valid GRANTED or REINSTATED record.
  const candidates = authorityHistory
    .filter(a => {
      const s = (a.status ?? "").toUpperCase();
      if (!s.includes("GRANTED") && !s.includes("REINSTATED")) return false;
      const eff = dateOnly(a.effective_date);
      return eff !== null && eff <= accidentDate;
    })
    .sort((a, b) => {
      const da = dateOnly(a.effective_date) ?? "";
      const db = dateOnly(b.effective_date) ?? "";
      return db.localeCompare(da);
    });

  if (candidates.length === 0)
    return {
      status: "inactive",
      basis: `No operating authority found with effective date on or before ${fmtDate(accidentDate)}.`,
    };

  const rec = candidates[0];
  const rev = dateOnly(rec.revocation_date);
  const authType = rec.authority_type ? `${rec.authority_type} authority` : "Authority";

  if (rev && rev <= accidentDate) {
    const yearsGap = parseInt(accidentDate.slice(0, 4)) - parseInt(rev.slice(0, 4));
    const longGap = yearsGap >= 3 ? ` Note: authority lapsed ${yearsGap}+ years before accident date.` : "";
    return {
      status: "inactive",
      basis: `${authType} effective ${fmtDate(rec.effective_date)}, revoked ${fmtDate(rec.revocation_date)}. No reinstatement found before ${fmtDate(accidentDate)}.${longGap}`,
    };
  }

  const revClause = rev ? "" : ", no revocation before accident date";
  return {
    status: "active",
    basis: `${authType} effective ${fmtDate(rec.effective_date)}${revClause}.`,
  };
}

// ─── Props ───────────────────────────────────────────────────
type Props = {
  carrier: Carrier;
  sms: SmsScores | null;
  crashes: Crash[];
  inspections: Inspection[];
  violations: Violation[];
  insurance: Insurance[];
  authorityHistory: AuthorityRecord[];
  alerts: CarrierAlert[];
  oosOrders: OosOrder[];
  boc3: Boc3Agent[];
  rejectedInsurance: RejectedInsurance[];
  suspectSuccessors: SuspectSuccessor[];
};

// ─── Main component ──────────────────────────────────────────
export default function CarrierDetailView({ carrier, sms, crashes, inspections, violations, insurance, authorityHistory, alerts, oosOrders, boc3, rejectedInsurance, suspectSuccessors }: Props) {
  const [accidentDate, setAccidentDate] = useState("");

  // Clean crashes once: drop 1970-01-01 placeholders, dedup by report_number (or date+state+stats fallback), remove zero-value
  const cleanedCrashes = (() => {
    const seen = new Set<string>();
    const deduped: Crash[] = [];
    for (const c of crashes) {
      if (!c.crash_date || c.crash_date.startsWith("1970-01-01")) continue;
      const key = c.report_number ?? `${c.crash_date}|${c.state ?? ""}|${c.fatal}|${c.injury}|${c.towaway}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(c);
    }
    return deduped.filter(c => (c.fatal ?? 0) > 0 || (c.injury ?? 0) > 0 || (c.towaway ?? 0) > 0);
  })();

  // Dedup insurance: same policy_number+effective_date can appear multiple times from
  // separate FMCSA datasets (InsHist "Replaced" row + InsHist "Cancelled" row for same policy).
  // Keep the row with the later cancellation_date (most informative about coverage end).
  const dedupedInsurance = (() => {
    const map = new Map<string, Insurance>();
    for (const ins of insurance) {
      const key = `${ins.policy_number ?? ""}|${dateOnly(ins.effective_date) ?? ""}`;
      const existing = map.get(key);
      if (!existing) { map.set(key, ins); continue; }
      const existCancel = dateOnly(existing.cancellation_date) ?? "";
      const newCancel   = dateOnly(ins.cancellation_date) ?? "";
      if (newCancel > existCancel) map.set(key, ins);
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = dateOnly(a.effective_date) ?? "";
      const db = dateOnly(b.effective_date) ?? "";
      return db.localeCompare(da);
    });
  })();

  // Dedup revocations by event_date — carrier_alerts can have 2-3 identical rows per event
  const revocations = (() => {
    const seen = new Set<string>();
    return alerts.filter(a => {
      if (a.event_type !== "INVOLUNTARY_REVOCATION") return false;
      const key = a.event_date ?? "null";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const authorityDataGap = !!carrier.mc_number && carrier.mc_number !== "MC" && authorityHistory.length === 0;
  const insuranceDataGap = !!carrier.mc_number && carrier.mc_number !== "MC" && dedupedInsurance.length === 0;

  const insuranceDerived  = accidentDate ? deriveInsuranceBasis(dedupedInsurance, accidentDate, carrier)  : null;
  const authorityDerived  = accidentDate ? deriveAuthorityBasis(authorityHistory, accidentDate, carrier) : null;
  const insuranceActiveAtDate = insuranceDerived?.status === "active";
  const authorityActiveAtDate = authorityDerived?.status === "active";

  // Detect BI&PD insurance lapses (gaps between consecutive policies)
  const bipd = dedupedInsurance
    .filter(ins => ["82", "91", "91X"].includes((ins.policy_type ?? "").trim().toUpperCase()))
    .filter(ins => ins.effective_date)
    .sort((a, b) => (a.effective_date ?? "").localeCompare(b.effective_date ?? ""));
  const insuranceLapses: Array<{ gapDays: number; from: string; to: string }> = [];
  for (let i = 0; i < bipd.length - 1; i++) {
    const from = dateOnly(bipd[i].cancellation_date);
    const to   = dateOnly(bipd[i + 1].effective_date);
    if (!from || !to || from >= to) continue;
    const gapDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
    if (gapDays > 0) insuranceLapses.push({ gapDays, from, to });
  }
  const accidentInLapse = accidentDate
    ? insuranceLapses.find(l => accidentDate >= l.from && accidentDate < l.to) ?? null
    : null;

  // Authority/revocation badge — factual authority history only.
  // No crash/SMS/risk scoring. Shows: REVOKED, ACTIVE—PRIOR HISTORY, NO DATA, or nothing.
  const realRevocationsInAuthHist = authorityHistory.filter(a =>
    (a.status ?? "").toUpperCase().includes("INVOLUNTARY") &&
    !(a.reason ?? "").toUpperCase().includes("DISCONTINUED")
  );
  const hasAnyRealRevocation = revocations.length > 0 || realRevocationsInAuthHist.length > 0;
  const isCarrierInactive = (carrier.status ?? "").toUpperCase() === "INACTIVE";
  const isCarrierActive   = (carrier.status ?? "").toUpperCase() === "ACTIVE";
  const hasAuthorityData  = authorityHistory.length > 0 || revocations.length > 0;
  const isForHire = !!(carrier.mc_number && carrier.mc_number.trim().toUpperCase() !== "MC");
  const risk: { label: string; color: string; bg: string } | null =
    isCarrierInactive && hasAnyRealRevocation ? { label: "REVOKED",                        color: "#dc2626", bg: "#fef2f2" }
    : isCarrierActive && hasAnyRealRevocation ? { label: "ACTIVE — PRIOR HISTORY",         color: "#d97706", bg: "#fffbeb" }
    : !hasAuthorityData && isForHire          ? { label: "NO DATA — Verify with FMCSA",    color: "#64748b", bg: "#f8fafc" }
    : null;

  // Bucket boundaries
  let cutoff24     = "";
  let cutoff24Minus1 = "";
  let today        = "";
  if (accidentDate) {
    const accDt    = new Date(accidentDate + "T00:00:00Z");
    const cutoffDt = new Date(accDt);
    cutoffDt.setUTCMonth(cutoffDt.getUTCMonth() - 24);
    cutoff24 = cutoffDt.toISOString().slice(0, 10);
    const c24Dt = new Date(cutoff24 + "T00:00:00Z");
    c24Dt.setUTCDate(c24Dt.getUTCDate() - 1);
    cutoff24Minus1 = c24Dt.toISOString().slice(0, 10);
    today = new Date().toISOString().slice(0, 10);
  }

  // ── Executive Summary (3–4 template lines, no risk judgments) ────────
  const summaryLines: string[] = [];

  // Line 1 — Authority + insurance status
  if (accidentDate && authorityDerived && insuranceDerived) {
    const authStr =
      authorityDerived.status === "active"         ? "operating authority was ACTIVE"
      : authorityDerived.status === "not_required" ? "operating authority was NOT REQUIRED"
      : "operating authority was INACTIVE";
    const insStr =
      insuranceDerived.status === "active"         ? "Bodily Injury & Property Damage (BI&PD) insurance was on file"
      : insuranceDerived.status === "not_required" ? "insurance filing not required"
      : insuranceDerived.status === "unknown"      ? "insurance status unverified from available records"
      : "no active BI&PD (Bodily Injury & Property Damage) insurance was on file";
    summaryLines.push(`As of ${fmtDate(accidentDate)}: ${authStr}; ${insStr}.`);
  } else {
    const isPrivate = isLikelyPrivateCarrier(carrier);
    if (isPrivate) {
      summaryLines.push("Private property carrier — FMCSA authority and insurance filing requirements may not apply.");
    } else if (!hasAuthorityData) {
      summaryLines.push("No FMCSA operating authority records found in imported data. Verify current status directly with FMCSA.");
    } else {
      const authStatus = isCarrierActive ? "active" : "inactive";
      const activeIns = dedupedInsurance.find(i =>
        (i.policy_type === "91" || i.policy_type === "91X" || i.policy_type === "82") && !i.cancellation_date
      );
      const insStr = activeIns
        ? `Bodily Injury & Property Damage (BI&PD) insurance on file (${activeIns.insurer_name ?? "insurer on record"})`
        : "no active BI&PD (Bodily Injury & Property Damage) insurance policy found in imported records";
      summaryLines.push(`${carrier.legal_name} holds ${authStatus} FMCSA operating authority. ${insStr}.`);
    }
  }

  // Line 2 — Crash history for the relevant window
  const totalFatalAll = cleanedCrashes.reduce((s, c) => s + (c.fatal ?? 0), 0);
  if (accidentDate && cutoff24) {
    const crashes24 = cleanedCrashes.filter(c => c.crash_date && c.crash_date >= cutoff24 && c.crash_date <= accidentDate);
    const fatal24   = crashes24.filter(c => (c.fatal ?? 0) > 0).length;
    if (crashes24.length > 0) {
      summaryLines.push(`${crashes24.length} crash${crashes24.length !== 1 ? "es" : ""} in the 24 months prior to ${fmtDate(accidentDate)}${fatal24 > 0 ? `, including ${fatal24} fatal` : ""}.`);
    } else {
      summaryLines.push(`No crashes recorded in the 24 months prior to ${fmtDate(accidentDate)}.`);
    }
  } else {
    if (cleanedCrashes.length > 0) {
      summaryLines.push(`${cleanedCrashes.length} crash${cleanedCrashes.length !== 1 ? "es" : ""} in FMCSA records${totalFatalAll > 0 ? `, including ${totalFatalAll} fatal` : ""}.`);
    } else {
      summaryLines.push("No crashes recorded in FMCSA history.");
    }
  }

  // Line 3 — Revocation history
  if (hasAnyRealRevocation) {
    const n = revocations.length || realRevocationsInAuthHist.length;
    if (isCarrierInactive) {
      summaryLines.push(`Authority currently revoked. ${n} revocation event${n !== 1 ? "s" : ""} in FMCSA records.`);
    } else {
      summaryLines.push(`${n} prior revocation${n !== 1 ? "s" : ""} in FMCSA records; authority subsequently reinstated.`);
    }
  } else if (hasAuthorityData) {
    summaryLines.push("No authority revocations in FMCSA records.");
  }

  // Line 4 — Pattern (only when notable; omit if nothing stands out)
  const revTotal = revocations.length || realRevocationsInAuthHist.length;
  if (isCarrierActive && revTotal >= 3) {
    summaryLines.push(`${revTotal} authority revocations on record, each followed by reinstatement — verify current compliance directly with FMCSA.`);
  } else if (totalFatalAll > 1) {
    summaryLines.push("Multiple fatal crashes in FMCSA history.");
  } else if (cleanedCrashes.length === 0 && !hasAnyRealRevocation && hasAuthorityData) {
    summaryLines.push("No crashes or authority issues found in available FMCSA data.");
  }

  const sharedProps = {
    crashes: cleanedCrashes, violations, insurance: dedupedInsurance,
    oosOrders, revocations, authorityHistory, inspections,
    carrier, sms,
  };

  // Inspections with no date at all — excluded by inRange() so they'd otherwise vanish
  const undatedInspections = inspections.filter(
    i => !i.inspection_date || i.inspection_date.startsWith("1970-01-01")
  ).filter(isNonCompliant);

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <header style={{ background: "#0f172a", padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "32px", height: "32px", background: "#3b82f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "white", fontSize: "16px" }}>🚛</span>
        </div>
        <Link href="/" style={{ color: "white", fontWeight: 700, fontSize: "18px", letterSpacing: "-0.3px", textDecoration: "none" }}>Carrier Intelligence</Link>
        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>FMCSA DATA PORTAL</span>
      </header>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 24px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", textDecoration: "none", marginBottom: "24px", fontFamily: "'DM Mono', monospace" }}>
          ← Back to search
        </Link>

        {/* Section 1 — Carrier Info */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{carrier.legal_name}</h1>
              {carrier.dba_name && <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>DBA: {carrier.dba_name}</p>}
              <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                DOT #{carrier.dot_number}{(carrier.mc_number && carrier.mc_number.trim().toUpperCase() !== "MC") ? ` · MC #${carrier.mc_number}` : ""}
              </p>
              <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "4px" }}>
                Source: FMCSA Census Data{carrier.updated_at ? ` · Last Updated: ${fmtDate(carrier.updated_at)}` : ""}
              </p>
            </div>
            {risk
              ? <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: "20px", background: risk.bg, color: risk.color, fontSize: "12px", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>{risk.label}</span>
              : <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: "20px", background: "#f1f5f9", color: "#64748b", fontSize: "12px", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>No Authority Issues Found</span>
            }
          </div>
          <InfoRow label="Address"      value={[carrier.address, carrier.city, stateName(carrier.state), carrier.zip].filter(Boolean).join(", ")} />
          <InfoRow label="Phone"        value={carrier.phone} />
          <InfoRow label="State"        value={stateName(carrier.state)} />
          <InfoRow label="Cargo Type"   value={carrier.cargo_type} />
          <InfoRow label="Status"       value={carrier.status} />
          <InfoRow label="Total Drivers" value={carrier.total_drivers} />
          <InfoRow label="Total Trucks"  value={carrier.total_trucks} />
          {(carrier.total_drivers === 0 && carrier.total_trucks === 0) && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", marginTop: "8px" }}>
              <p style={{ fontSize: "11px", color: "#92400e", fontFamily: "'DM Mono', monospace" }}>
                ⚠ Fleet size shows 0 — FMCSA census data may be incomplete. If carrier appears active, verify driver and truck count directly with FMCSA before relying on these figures.
              </p>
            </div>
          )}
        </div>

        {/* Executive Summary */}
        <div style={{ background: "white", borderRadius: "12px", padding: "20px 24px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Executive Summary</p>
          {summaryLines.map((line, i) => (
            <p key={i} style={{ fontSize: "13px", color: "#374151", lineHeight: "1.75", marginBottom: i < summaryLines.length - 1 ? "4px" : "0" }}>
              {line}
            </p>
          ))}
          <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "14px", lineHeight: "1.5" }}>
            This summary is generated from FMCSA public records and is a triage aid only. It is not a legal opinion or a complete risk assessment. Enter an accident date above for a date-specific analysis.
          </p>
        </div>

        {/* Section 2 — Accident Date Filter */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Accident Date Filter</h2>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "240px" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" }}>Enter Accident Date</span>
            <input
              type="date"
              value={accidentDate}
              onChange={e => setAccidentDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
            />
          </label>

          <KeyFindings
            carrier={carrier}
            sms={sms}
            crashes={cleanedCrashes}
            inspections={inspections}
            insurance={dedupedInsurance}
            authorityHistory={authorityHistory}
            alerts={alerts}
            oosOrders={oosOrders}
            accidentDate={accidentDate}
          />

          {accidentDate && insuranceDerived && authorityDerived && (
            <>
            <div style={{ display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" }}>
              {/* Insurance status card */}
              {(() => {
                const s = insuranceDerived.status;
                const bg  = s === "active" ? "#f0fdf4" : s === "not_required" ? "#f8fafc" : s === "unknown" ? "#fffbeb" : "#fef2f2";
                const col = s === "active" ? "#22c55e" : s === "not_required" ? "#64748b" : s === "unknown" ? "#92400e" : "#ef4444";
                const label = s === "active" ? "ACTIVE" : s === "not_required" ? "NOT REQUIRED" : s === "unknown" ? "VERIFY WITH FMCSA" : "INACTIVE";
                return (
                  <div style={{ background: bg, borderRadius: "8px", padding: "16px 20px", minWidth: "240px", maxWidth: "380px" }}>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Insurance Status on {fmtDate(accidentDate)}
                    </p>
                    <p style={{ fontSize: "20px", fontWeight: 700, color: col, marginBottom: "10px" }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Basis</p>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: "1.5" }}>{insuranceDerived.basis}</p>
                  </div>
                );
              })()}
              {/* Authority status card */}
              {(() => {
                const s = authorityDerived.status;
                const bg  = s === "active" ? "#f0fdf4" : s === "not_required" ? "#f8fafc" : "#fef2f2";
                const col = s === "active" ? "#22c55e" : s === "not_required" ? "#64748b" : "#ef4444";
                const label = s === "active" ? "ACTIVE" : s === "not_required" ? "NOT REQUIRED" : "INACTIVE";
                return (
                  <div style={{ background: bg, borderRadius: "8px", padding: "16px 20px", minWidth: "240px", maxWidth: "380px" }}>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Authority Status on {fmtDate(accidentDate)}
                    </p>
                    <p style={{ fontSize: "20px", fontWeight: 700, color: col, marginBottom: "10px" }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Basis</p>
                    <p style={{ fontSize: "12px", color: "#374151", lineHeight: "1.5" }}>{authorityDerived.basis}</p>
                  </div>
                );
              })()}
            </div>
            {(insuranceDataGap || authorityDataGap) && (
              <div style={{ marginTop: "16px", background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "8px", padding: "12px 16px" }}>
                <p style={{ color: "#92400e", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
                  <strong>⚠ Data Gap Warning:</strong>{" "}
                  {insuranceDataGap && authorityDataGap
                    ? `No insurance or authority records found in our database for MC#${carrier.mc_number}.`
                    : insuranceDataGap
                    ? `No insurance records found in our database for MC#${carrier.mc_number}.`
                    : `No authority records found in our database for MC#${carrier.mc_number}.`}{" "}
                  This may reflect an incomplete data import rather than confirmed absence of coverage. Verify directly with FMCSA SAFER before relying on this status.
                </p>
              </div>
            )}
            {authorityActiveAtDate && (insuranceDerived.status === "inactive" || insuranceDerived.status === "unknown") && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginTop: "12px" }}>
                <p style={{ fontSize: "12px", color: "#92400e", fontFamily: "'DM Mono', monospace" }}>
                  ⚠ Contradiction detected: authority shows ACTIVE but insurance filing is {insuranceDerived.status === "unknown" ? "unverified" : "INACTIVE"} on this date. Cross-check directly with FMCSA before relying on either status.
                </p>
              </div>
            )}
            {accidentInLapse && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginTop: "12px" }}>
                <p style={{ fontSize: "12px", color: "#991b1b", fontFamily: "'DM Mono', monospace" }}>
                  ⚠ Insurance lapse detected: accident date falls within a {accidentInLapse.gapDays}-day gap in Bodily Injury & Property Damage (BI&PD) coverage ({fmtDate(accidentInLapse.from)} – {fmtDate(accidentInLapse.to)}). No active BI&PD policy found for this period in available records.
                </p>
              </div>
            )}
          </>
          )}
        </div>

        {/* Sections 3 / 4 / 5 */}
        {!accidentDate ? (
          <div style={{ background: "white", borderRadius: "12px", padding: "32px 28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
              Enter an accident date above to see records broken down by time period.
            </p>
          </div>
        ) : (
          <>
            {/* Bucket 1 — oldest: more than 24 months before accident (chronological order) */}
            <TimeBucketSection
              label={`More Than 24 Months Before ${fmtDate(accidentDate)}`}
              sub={`Before ${fmtDate(cutoff24)}`}
              bucketStart={null}
              bucketEnd={cutoff24Minus1}
              {...sharedProps}
            />
            {/* Bucket 2 — within 24 months before accident (most critical for litigation) */}
            <TimeBucketSection
              label={`Within 24 Months Before ${fmtDate(accidentDate)}`}
              sub={`${fmtDate(cutoff24)} – ${fmtDate(accidentDate)}`}
              highlight
              bucketStart={cutoff24}
              bucketEnd={accidentDate}
              {...sharedProps}
            />
            {/* Bucket 3 — from accident date to today */}
            <TimeBucketSection
              label={`From ${fmtDate(accidentDate)} to Today`}
              sub={`${fmtDate(accidentDate)} – Today`}
              bucketStart={accidentDate}
              bucketEnd={today}
              {...sharedProps}
            />

            {/* Undated Inspections — shown once, after all buckets */}
            {undatedInspections.length > 0 && (
              <div style={{
                background: "white", borderRadius: "12px",
                border: "1px solid #fde68a",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "24px", overflow: "hidden",
              }}>
                <div style={{
                  background: "#fffbeb",
                  borderBottom: "1px solid #fde68a",
                  padding: "20px 28px",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#92400e" }}>
                      ⚠ Undated Inspections ({undatedInspections.length} record{undatedInspections.length !== 1 ? "s" : ""})
                    </h2>
                    <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                      Date not recorded in FMCSA data
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#92400e", fontFamily: "'DM Mono', monospace", marginTop: "6px" }}>
                    These inspections cannot be assigned to a time period. They are shown here to ensure no records are silently dropped. Cannot be used for accident-date analysis without a confirmed date.
                  </p>
                </div>
                <div style={{ padding: "4px 28px 28px" }}>
                  <div style={{ overflowX: "auto", marginTop: "16px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                          {["State", "Level", "Violations", "OOS Vehicles", "OOS Drivers"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {undatedInspections.map((insp, i) => {
                          const hasOos = (insp.oos_vehicles ?? 0) > 0 || (insp.oos_drivers ?? 0) > 0;
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: hasOos ? "#fff7ed" : "transparent" }}>
                              <td style={{ padding: "8px 12px", color: "#374151" }}>{stateName(insp.state)}</td>
                              <td style={{ padding: "8px 12px", color: "#374151", fontSize: "11px" }}>
                                {insp.level != null ? (INSPECTION_LEVELS[parseInt(insp.level)] ?? `Level ${insp.level}`) : "—"}
                              </td>
                              <td style={{ padding: "8px 12px", color: "#374151" }}>{insp.total_violations ?? "—"}</td>
                              <td style={{ padding: "8px 12px", color: (insp.oos_vehicles ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_vehicles ?? 0) > 0 ? 700 : 400 }}>{insp.oos_vehicles ?? "—"}</td>
                              <td style={{ padding: "8px 12px", color: (insp.oos_drivers ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_drivers ?? 0) > 0 ? 700 : 400 }}>{insp.oos_drivers ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Section — Undated Inspections (date unavailable — excluded from time buckets above) */}
        {(() => {
          const undated = inspections.filter(i => {
            const d = i.inspection_date;
            return (!d || d.startsWith("1970-01-01")) && isNonCompliant(i);
          });
          if (undated.length === 0) return null;
          return (
            <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>Inspections — Date Unavailable</h2>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: "1.5" }}>
                {undated.length} inspection{undated.length !== 1 ? "s" : ""} with violations or out-of-service events could not be assigned to a time period because the inspection date was not recorded in the imported data. These records are shown here so they are not silently omitted.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                      {["State", "Level", "Violations", "Out of Service Vehicles", "Out of Service Drivers"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {undated.map((insp, i) => {
                      const hasOos = (insp.oos_vehicles ?? 0) > 0 || (insp.oos_drivers ?? 0) > 0;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: hasOos ? "#fff7ed" : "transparent" }}>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>{stateName(insp.state)}</td>
                          <td style={{ padding: "8px 12px", color: "#374151", fontSize: "11px" }}>
                            {insp.level != null ? (INSPECTION_LEVELS[parseInt(insp.level)] ?? `Level ${insp.level}`) : "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>{insp.total_violations ?? "—"}</td>
                          <td style={{ padding: "8px 12px", color: (insp.oos_vehicles ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_vehicles ?? 0) > 0 ? 700 : 400 }}>{insp.oos_vehicles ?? "—"}</td>
                          <td style={{ padding: "8px 12px", color: (insp.oos_drivers ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_drivers ?? 0) > 0 ? 700 : 400 }}>{insp.oos_drivers ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Section — Chameleon Carrier Detection */}
        {suspectSuccessors.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "2px solid #fca5a5", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#991b1b", marginBottom: "6px" }}>⚠ Possible Successor / Related Entities</h2>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: "1.5" }}>
              The following carriers share the same address, phone number, or BOC-3 process agent as this carrier. If this carrier has a history of revocation, these may be successor entities operating under a new DOT number. These are investigative leads, not confirmed conclusions. Independent verification required.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Carrier Name", "DOT #", "MC #", "Status", "Connection"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suspectSuccessors.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "8px 12px" }}>
                        <a href={`/carrier/${s.dot_number}`} style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>{s.legal_name}</a>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{s.dot_number}</td>
                      <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{s.mc_number ?? "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, fontFamily: "'DM Mono', monospace", background: s.status === "ACTIVE" ? "#f0fdf4" : "#fef2f2", color: s.status === "ACTIVE" ? "#22c55e" : "#ef4444" }}>
                          {s.status ?? "UNKNOWN"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", color: "#f97316", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{s.connection_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section — BOC3 Process Agent */}
        {boc3.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>Process Agent (BOC-3)</h2>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: "1.5" }}>
              The BOC-3 agent is authorized to accept legal papers on behalf of this carrier in any US state. Serve litigation documents on this entity.
            </p>
            {boc3.map((agent, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < boc3.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <p style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Serve legal papers on</p>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>{agent.company_name ?? "—"}</p>
                {agent.attention_to && <p style={{ fontSize: "12px", color: "#64748b" }}>Attn: {agent.attention_to}</p>}
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  {[agent.address, agent.city, agent.state, agent.zip_code].filter(Boolean).join(", ")}
                  {agent.country && agent.country !== "US" && ` (${agent.country})`}
                </p>
              </div>
            ))}
            <p style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "12px" }}>Source: FMCSA BOC-3 Filing</p>
          </div>
        )}

        {/* Section — Rejected Insurance Filings */}
        {rejectedInsurance.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #fecaca", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#991b1b", marginBottom: "6px" }}>Rejected Insurance Filings ({rejectedInsurance.length})</h2>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", lineHeight: "1.5" }}>
              FMCSA rejected these insurance submissions. Each rejection indicates the carrier attempted to file insurance but FMCSA declined it — a significant finding for accident date coverage analysis.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Received", "Rejected", "Insurer", "Policy #", "Rejection Reason"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rejectedInsurance.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: "#fef2f2" }}>
                      <td style={{ padding: "8px 12px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(r.received_date)}</td>
                      <td style={{ padding: "8px 12px", color: "#ef4444", whiteSpace: "nowrap", fontWeight: 600 }}>{fmtDate(r.rejected_date)}</td>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{r.company_name ?? "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{r.policy_number ?? "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#7f1d1d", fontSize: "12px", lineHeight: "1.4" }}>{r.rejected_reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "12px" }}>Source: FMCSA Rejected Insurance Filings</p>
          </div>
        )}

        <CarrierTimeline
          carrier={carrier}
          crashes={cleanedCrashes}
          inspections={inspections}
          violations={violations}
          insurance={dedupedInsurance}
          authorityHistory={authorityHistory}
          alerts={alerts}
          oosOrders={oosOrders}
          accidentDate={accidentDate}
        />

        {/* Required disclaimer */}
        <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", textAlign: "center", marginTop: "32px", lineHeight: "1.6" }}>
          Data sourced from FMCSA public records. This report is for informational purposes only and does not constitute legal advice.
        </p>
      </div>
    </main>
  );
}
