"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
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

// Step 1 — US state abbreviation → full name
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

// Step 3 — FMCSA INSP_VIOLATION_CATEGORY_ID → plain English
// Source: MCMIS Vehicle Inspection Data Set Dictionary, Rev 5, 2025-10-15
const VIOLATION_CATEGORY: Record<number, string> = {
  1: "Medical Certificate",
  2: "False Log Book",
  3: "Log Book / Hours of Service",
  4: "10/15 Hours",
  5: "15/20 Hours",
  6: "60/70/80 Hours",
  7: "All Other Hours of Service",
  8: "Disqualified Driver",
  9: "Drugs",
  10: "Alcohol",
  11: "Seat Belt",
  12: "Traffic Enforcement",
  13: "Radar Detector",
  14: "All Other Driver Violations",
  15: "Brakes — Out of Adjustment",
  16: "Brakes — All Other",
  17: "Coupling Devices",
  18: "Fuel Systems",
  19: "Frames",
  20: "Lighting",
  21: "Steering Mechanism",
  22: "Suspension",
  23: "Tires",
  24: "Wheels / Studs / Clamps",
  25: "Load Securement",
  26: "Windshield",
  27: "Exhaust Discharge",
  28: "Emergency Equipment",
  29: "Periodic Inspection",
  30: "All Other Vehicle Defects",
  31: "Hazmat — Shipping Papers",
  32: "Hazmat — Improper Placarding",
  33: "Hazmat — Improperly Marked Shipment",
  34: "Hazmat — Improper Blocking & Bracing",
  35: "Hazmat — No Cargo Tank Retest",
  36: "Hazmat — No Remote Shutoff",
  37: "Hazmat — Non-Specification Container",
  38: "Hazmat — Emergency Response",
  39: "Hazmat — All Other",
  40: "Failure to Obey Traffic Control Device",
  41: "Following Too Close",
  42: "Improper Lane Change",
  43: "Improper Passing",
  44: "Reckless Driving",
  45: "Speeding",
  46: "Improper Turns",
  47: "Size and Weight",
  48: "Failure to Yield Right of Way",
  49: "State/Local Hours of Service",
  99: "Unknown",
};

// Step 3 — CFR section number → plain English (common Part 390–396 codes)
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
  "393.28": "Wiring systems", "393.29": "Protected wiring",
  "393.30": "Battery installation",
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
function cfrDescription(raw?: string | null): string | null {
  if (!raw || raw === "999") return null;
  const m = raw.match(/^(\d+\.\d+)/);
  return m ? (CFR_DESCRIPTIONS[m[1]] ?? null) : null;
}

// Step 3 — Insurance form code → plain English (FMCSA dataset spec)
const INSURANCE_FORM_CODES: Record<string, string> = {
  "34": "Cargo Insurance",
  "82": "Public Liability Insurance (BI&PD)",
  "83": "Cargo Insurance",
  "84": "Property Broker's Surety Bond",
  "85": "Property Broker's Trust Fund",
  "85C": "BMC Trust Fund Cancellation",
  "91": "Public Liability Insurance",
  "91X": "Public Liability Insurance",
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
  const eff = dateOnly(a.effective_date);
  const rev = dateOnly(a.revocation_date);
  if (!eff || eff > accidentDate) return false;
  if (rev && rev < accidentDate) return false;
  return true;
}

// Step 4 — returns true if inspection had a violation or OOS event (not a clean pass)
function isNonCompliant(i: Inspection): boolean {
  return (i.total_violations ?? 0) > 0 || (i.oos_vehicles ?? 0) > 0 || (i.oos_drivers ?? 0) > 0;
}

function ScoreRow({ label, value, alert }: { label: string; value?: number | null; alert?: boolean | null }) {
  // FMCSA stores 0 for unscored BASICs (insufficient data) — treat as not available
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
};

export default function CarrierDetailView({ carrier, sms, crashes, inspections, violations, insurance, authorityHistory, alerts, oosOrders }: Props) {
  const [accidentDate, setAccidentDate] = useState("");

  const crashesToShow = accidentDate
    ? crashes.filter((c) => {
        const cd = dateOnly(c.crash_date);
        return cd !== null && cd <= accidentDate;
      })
    : crashes;

  // Step 4 — only non-compliant inspections (violations or OOS found)
  const allNonCompliantInspections = inspections.filter(isNonCompliant);

  const inspectionsToShow = accidentDate
    ? inspections
        .filter((i) => {
          const id = dateOnly(i.inspection_date);
          return id !== null && id <= accidentDate;
        })
        .filter(isNonCompliant)
    : allNonCompliantInspections;

  const revocations = alerts.filter((a) => a.event_type === "INVOLUNTARY_REVOCATION");

  const insuranceActiveAtDate = accidentDate ? insurance.some((ins) => isInsuranceActiveOn(ins, accidentDate)) : false;
  const authorityActiveAtDate = accidentDate ? authorityHistory.some((a) => isAuthorityActiveOn(a, accidentDate)) : false;

  const totalCrashes = crashesToShow.length;
  const fatalCrashes = crashesToShow.reduce((sum, c) => sum + (c.fatal ?? 0), 0);
  const injuryCrashes = crashesToShow.reduce((sum, c) => sum + (c.injury ?? 0), 0);

  const smsAlerts = [
    sms?.unsafe_driving_alert,
    sms?.crash_indicator_alert,
    sms?.driver_fitness_alert,
    sms?.vehicle_maintenance_alert,
  ].filter(Boolean).length;

  const hasSmsData = sms !== null;

  const risk = smsAlerts >= 3 || fatalCrashes > 0
    ? { label: "HIGH RISK", color: "#ef4444", bg: "#fef2f2" }
    : smsAlerts >= 1 || totalCrashes > 0
    ? { label: "ELEVATED", color: "#f97316", bg: "#fff7ed" }
    : { label: "CLEAR", color: "#22c55e", bg: "#f0fdf4" };

  // Step 5 — timeline analysis periods (only computed when accident date is set)
  let timelinePeriods: Array<{ label: string; sub: string; crashes: number; inspections: number; oos: number }> | null = null;
  if (accidentDate) {
    const accDt = new Date(accidentDate + "T00:00:00Z");
    const cutoffDt = new Date(accDt);
    cutoffDt.setUTCMonth(cutoffDt.getUTCMonth() - 24);
    const cutoff24 = cutoffDt.toISOString().slice(0, 10);

    const oosInspections = inspections.filter((i) => (i.oos_vehicles ?? 0) > 0 || (i.oos_drivers ?? 0) > 0);

    timelinePeriods = [
      {
        label: "More than 24 months before accident",
        sub: `Before ${fmtDate(cutoff24)}`,
        crashes: crashes.filter((c) => { const d = dateOnly(c.crash_date); return d !== null && d < cutoff24; }).length,
        inspections: allNonCompliantInspections.filter((i) => { const d = dateOnly(i.inspection_date); return d !== null && d < cutoff24; }).length,
        oos: oosInspections.filter((i) => { const d = dateOnly(i.inspection_date); return d !== null && d < cutoff24; }).length,
      },
      {
        label: "Within 24 months before accident",
        sub: `${fmtDate(cutoff24)} – ${fmtDate(accidentDate)}`,
        crashes: crashes.filter((c) => { const d = dateOnly(c.crash_date); return d !== null && d >= cutoff24 && d <= accidentDate; }).length,
        inspections: allNonCompliantInspections.filter((i) => { const d = dateOnly(i.inspection_date); return d !== null && d >= cutoff24 && d <= accidentDate; }).length,
        oos: oosInspections.filter((i) => { const d = dateOnly(i.inspection_date); return d !== null && d >= cutoff24 && d <= accidentDate; }).length,
      },
      {
        label: "Accident date to today",
        sub: `After ${fmtDate(accidentDate)}`,
        crashes: crashes.filter((c) => { const d = dateOnly(c.crash_date); return d !== null && d > accidentDate; }).length,
        inspections: allNonCompliantInspections.filter((i) => { const d = dateOnly(i.inspection_date); return d !== null && d > accidentDate; }).length,
        oos: oosInspections.filter((i) => { const d = dateOnly(i.inspection_date); return d !== null && d > accidentDate; }).length,
      },
    ];
  }

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

        {/* Carrier overview */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{carrier.legal_name}</h1>
              {carrier.dba_name && <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "4px" }}>DBA: {carrier.dba_name}</p>}
              <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                DOT #{carrier.dot_number}{carrier.mc_number ? ` · MC #${carrier.mc_number}` : ""}
              </p>
              <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginTop: "4px" }}>
                Source: FMCSA Census Data{carrier.updated_at ? ` · Last Updated: ${fmtDate(carrier.updated_at)}` : ""}
              </p>
            </div>
            <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: "20px", background: risk.bg, color: risk.color, fontSize: "12px", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>
              {risk.label}
            </span>
          </div>
          <InfoRow label="Address" value={[carrier.address, carrier.city, stateName(carrier.state), carrier.zip].filter(Boolean).join(", ")} />
          <InfoRow label="Phone" value={carrier.phone} />
          <InfoRow label="State" value={stateName(carrier.state)} />
          <InfoRow label="Cargo Type" value={carrier.cargo_type} />
          <InfoRow label="Status" value={carrier.status} />
          <InfoRow label="Total Drivers" value={carrier.total_drivers} />
          <InfoRow label="Total Trucks" value={carrier.total_trucks} />
        </div>

        {/* Accident Date Filter */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Accident Date Filter</h2>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "240px" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" }}>Enter Accident Date</span>
            <input
              type="date"
              value={accidentDate}
              onChange={(e) => setAccidentDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}
            />
          </label>

          {accidentDate && (
            <div style={{ display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" }}>
              <div style={{ background: insuranceActiveAtDate ? "#f0fdf4" : "#fef2f2", borderRadius: "8px", padding: "12px 20px", minWidth: "170px" }}>
                <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>INSURANCE ACTIVE</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: insuranceActiveAtDate ? "#22c55e" : "#ef4444" }}>{insuranceActiveAtDate ? "YES" : "NO"}</p>
              </div>
              <div style={{ background: authorityActiveAtDate ? "#f0fdf4" : "#fef2f2", borderRadius: "8px", padding: "12px 20px", minWidth: "170px" }}>
                <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>AUTHORITY ACTIVE</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: authorityActiveAtDate ? "#22c55e" : "#ef4444" }}>{authorityActiveAtDate ? "YES" : "NO"}</p>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "12px 20px", minWidth: "170px" }}>
                <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>CRASHES AT ACCIDENT DATE</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>{crashesToShow.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* Step 5 — Timeline Analysis (only shown when accident date is set) */}
        {timelinePeriods && (
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>Timeline Analysis</h2>
            <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "20px" }}>
              Accident date: {fmtDate(accidentDate)} · Counts across all records (not filtered by accident date)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {timelinePeriods.map((period, idx) => (
                <div key={idx} style={{
                  background: idx === 1 ? "#fffbeb" : "#f8fafc",
                  borderRadius: "10px", padding: "16px 20px",
                  border: idx === 1 ? "1px solid #fde68a" : "1px solid #f1f5f9",
                }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#374151", fontFamily: "'DM Mono', monospace", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: "1.4" }}>{period.label}</p>
                  <p style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "14px" }}>{period.sub}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Crashes</span>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: period.crashes > 0 ? "#ef4444" : "#374151" }}>{period.crashes}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Inspections w/ Violations</span>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: period.inspections > 0 ? "#f97316" : "#374151" }}>{period.inspections}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>OOS Events</span>
                      <span style={{ fontSize: "18px", fontWeight: 700, color: period.oos > 0 ? "#ef4444" : "#374151" }}>{period.oos}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety Rating */}
        {(carrier.safety_rating || carrier.review_type) && (
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
            <SectionHeader title="Safety Rating" source="FMCSA Safety Rating (Compliance Review)" />
            {carrier.safety_rating && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", minWidth: "160px", textTransform: "uppercase" }}>Rating</span>
                <span style={{
                  display: "inline-block", padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 700, fontFamily: "'DM Mono', monospace",
                  background: carrier.safety_rating.toLowerCase() === "satisfactory" ? "#f0fdf4" : carrier.safety_rating.toLowerCase() === "conditional" ? "#fff7ed" : carrier.safety_rating.toLowerCase() === "unsatisfactory" ? "#fef2f2" : "#f8fafc",
                  color: carrier.safety_rating.toLowerCase() === "satisfactory" ? "#22c55e" : carrier.safety_rating.toLowerCase() === "conditional" ? "#f97316" : carrier.safety_rating.toLowerCase() === "unsatisfactory" ? "#ef4444" : "#64748b",
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
          </div>
        )}

        {/* SMS Safety Scores */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader
            title="SMS Safety Scores"
            source="FMCSA SMS (Safety Measurement System)"
            lastUpdated={sms?.fetched_at}
            right={sms?.score_date && (
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                SMS Period: {fmtDate(sms.score_date)}
              </span>
            )}
          />
          {hasSmsData ? (
            <>
              <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px", letterSpacing: "1px" }}>PERCENTILE RANKING (≥75 = ALERT)</p>
              <ScoreRow label="UNSAFE DRIVING" value={sms!.unsafe_driving} alert={sms!.unsafe_driving_alert} />
              <ScoreRow label="CRASH INDICATOR" value={sms!.crash_indicator} alert={sms!.crash_indicator_alert} />
              <ScoreRow label="DRIVER FITNESS" value={sms!.driver_fitness} alert={sms!.driver_fitness_alert} />
              <ScoreRow label="VEHICLE MAINTENANCE" value={sms!.vehicle_maintenance} alert={sms!.vehicle_maintenance_alert} />
              <ScoreRow label="CONTROLLED SUBSTANCES" value={sms!.controlled_substances_alcohol} alert={sms!.controlled_substances_alcohol_alert} />
              <ScoreRow label="HOS COMPLIANCE" value={sms!.hours_of_service_compliance} alert={sms!.hours_of_service_compliance_alert} />
              <ScoreRow label="HAZARDOUS MATERIALS" value={sms!.hazardous_materials} alert={sms!.hazardous_materials_alert} />
            </>
          ) : (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No SMS score data available for this carrier.</p>
          )}
        </div>

        {/* Crash History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader title="Crash History" source="FMCSA Crash Data (MCMIS)" lastUpdated={mostRecent(crashes.map((c) => c.imported_at))} />

          {accidentDate && (
            <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px" }}>
              Showing {crashesToShow.length} of {crashes.length} crashes on or before {fmtDate(accidentDate)}
            </p>
          )}

          {totalCrashes === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
              {accidentDate ? "No crashes on or before the accident date." : "No crash records found."}
            </p>
          ) : (
            <>
              <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "12px 20px", minWidth: "100px" }}>
                  <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>TOTAL</p>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>{totalCrashes}</p>
                </div>
                {fatalCrashes > 0 && (
                  <div style={{ background: "#fef2f2", borderRadius: "8px", padding: "12px 20px", minWidth: "100px" }}>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>FATAL</p>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: "#ef4444" }}>{fatalCrashes}</p>
                  </div>
                )}
                {injuryCrashes > 0 && (
                  <div style={{ background: "#fff7ed", borderRadius: "8px", padding: "12px 20px", minWidth: "100px" }}>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>INJURY</p>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: "#f97316" }}>{injuryCrashes}</p>
                  </div>
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                      {["Date", "State", "Fatal", "Injury", "Towaway", "Report #"].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crashesToShow.map((c, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: c.fatal > 0 ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(c.crash_date)}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{stateName(c.state)}</td>
                        <td style={{ padding: "8px 12px", color: c.fatal > 0 ? "#ef4444" : "#374151", fontWeight: c.fatal > 0 ? 700 : 400 }}>{c.fatal}</td>
                        <td style={{ padding: "8px 12px", color: c.injury > 0 ? "#f97316" : "#374151" }}>{c.injury}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{c.towaway}</td>
                        <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{c.report_number ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Inspection History — Step 4: clean inspections hidden */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader
            title="Inspection History"
            source="FMCSA Inspection Data (MCMIS)"
            lastUpdated={mostRecent(inspections.map((i) => i.imported_at))}
          />

          {accidentDate && (
            <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px" }}>
              Showing {inspectionsToShow.length} non-compliant inspection{inspectionsToShow.length !== 1 ? "s" : ""} on or before {fmtDate(accidentDate)} · clean inspections hidden
            </p>
          )}

          {!accidentDate && (
            <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px" }}>
              Showing {allNonCompliantInspections.length} non-compliant inspection{allNonCompliantInspections.length !== 1 ? "s" : ""} of {inspections.length} total · clean inspections hidden
            </p>
          )}

          {inspectionsToShow.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
              {accidentDate ? "No non-compliant inspections on or before the accident date." : "No non-compliant inspection records found."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Date", "State", "Level", "Violations", "OOS Vehicles", "OOS Drivers"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspectionsToShow.map((insp, i) => {
                    const hasOos = (insp.oos_vehicles ?? 0) > 0 || (insp.oos_drivers ?? 0) > 0;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: hasOos ? "#fff7ed" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(insp.inspection_date)}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{stateName(insp.state)}</td>
                        <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{insp.level ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{insp.total_violations ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: (insp.oos_vehicles ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_vehicles ?? 0) > 0 ? 700 : 400 }}>{insp.oos_vehicles ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: (insp.oos_drivers ?? 0) > 0 ? "#f97316" : "#374151", fontWeight: (insp.oos_drivers ?? 0) > 0 ? 700 : 400 }}>{insp.oos_drivers ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Violations — Step 3: plain-English category + CFR descriptions */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader title="Violations" source="FMCSA Inspection Data (MCMIS)" lastUpdated={mostRecent(violations.map((v) => v.imported_at))} />
          {violations.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No violation records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Category", "CFR Section", "Unit", "OOS"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, i) => {
                    const isOos = v.oos_indicator === "Y";
                    const catCode = v.violation_code ? parseInt(v.violation_code) : null;
                    const catName = catCode !== null && !isNaN(catCode) ? (VIOLATION_CATEGORY[catCode] ?? null) : null;
                    const cfrPlain = cfrDescription(v.description);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: isOos ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "8px 12px" }}>
                          {catName ? (
                            <span style={{ color: "#374151" }}>{catName}</span>
                          ) : (
                            <span style={{ color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{v.violation_code ?? "—"}</span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {cfrPlain ? (
                            <div>
                              <span style={{ color: "#374151", display: "block" }}>{cfrPlain}</span>
                              <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "10px" }}>{v.description}</span>
                            </div>
                          ) : (
                            <span style={{ color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{v.description ?? "—"}</span>
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
          )}
        </div>

        {/* Insurance History — Step 3: translated policy type */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader
            title="Insurance History"
            source="FMCSA Insurance Filings"
            lastUpdated={mostRecent(insurance.map((ins) => ins.imported_at))}
            right={accidentDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>ACTIVE ON {fmtDate(accidentDate)}</span>
                <YesNoBadge value={insuranceActiveAtDate} />
              </div>
            )}
          />
          {insurance.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No insurance records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Type", "Insurer", "Policy #", "Effective", "Cancelled", "Status"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insurance.map((ins, i) => {
                    const activeAtDate = accidentDate ? isInsuranceActiveOn(ins, accidentDate) : null;
                    return (
                      <tr key={i} style={{
                        borderBottom: "1px solid #f8fafc",
                        background: activeAtDate ? "#f0fdf4" : "transparent",
                        opacity: activeAtDate === false ? 0.4 : 1,
                      }}>
                        <td style={{ padding: "8px 12px" }}>
                          <div>
                            <span style={{ color: "#374151", display: "block" }}>{insuranceTypeLabel(ins.policy_type)}</span>
                            {ins.policy_type && INSURANCE_FORM_CODES[ins.policy_type.trim().toUpperCase()] && (
                              <span style={{ color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "10px" }}>{ins.policy_type}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{ins.insurer_name ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.policy_number ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{fmtDate(ins.effective_date)}</td>
                        <td style={{ padding: "8px 12px", color: ins.cancellation_date ? "#ef4444" : "#94a3b8" }}>{fmtDate(ins.cancellation_date)}</td>
                        <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.status ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* OOS Orders & Reinstatements */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader title="OOS Orders & Reinstatements" source="FMCSA Out-of-Service Orders" lastUpdated={mostRecent(oosOrders.map((o) => o.detected_at))} />
          {oosOrders.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No OOS order records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Order Date", "Reason", "Status", "Reinstated"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {oosOrders.map((o, i) => {
                    const isActive = o.status === "ACTIVE";
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
          )}
        </div>

        {/* Revocation History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <SectionHeader title="Revocation History" source="FMCSA Revocation Records" lastUpdated={mostRecent(revocations.map((a) => a.detected_at))} />
          {revocations.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No revocation records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Date", "Description"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revocations.map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: "#fef2f2" }}>
                      <td style={{ padding: "8px 12px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(a.event_date)}</td>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>Involuntary Revocation</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Authority History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <SectionHeader
            title="Authority History"
            source="FMCSA Operating Authority History (AuthHist)"
            lastUpdated={mostRecent(authorityHistory.map((a) => a.imported_at))}
            right={accidentDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>ACTIVE ON {fmtDate(accidentDate)}</span>
                <YesNoBadge value={authorityActiveAtDate} />
              </div>
            )}
          />
          {authorityHistory.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No authority records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Type", "Status", "Effective", "Revoked", "Reason"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {authorityHistory.map((a, i) => (
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
          )}
        </div>
      </div>
    </main>
  );
}
