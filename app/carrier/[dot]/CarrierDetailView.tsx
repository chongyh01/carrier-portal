"use client";

import { useState } from "react";
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

// Returns "YYYY-MM-DD" (matching <input type="date">), or null if the date is missing/a placeholder.
function dateOnly(d?: string | null): string | null {
  if (!d || d.startsWith("1970-01-01")) return null;
  return d.slice(0, 10);
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

function ScoreRow({ label, value, alert }: { label: string; value?: number | null; alert?: boolean | null }) {
  if (value === null || value === undefined) return null;
  const isAlert = alert ?? value >= ALERT_THRESHOLD;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: isAlert ? "#ef4444" : "#374151", fontFamily: "'DM Mono', monospace" }}>
          {value}th {isAlert && "⚠"}
        </span>
      </div>
      <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: isAlert ? "#ef4444" : value >= 50 ? "#f97316" : "#22c55e", borderRadius: "3px" }} />
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

  const inspectionsToShow = accidentDate
    ? inspections.filter((i) => {
        const id = dateOnly(i.inspection_date);
        return id !== null && id <= accidentDate;
      })
    : inspections;

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

  const hasSmsData = sms && (
    sms.unsafe_driving !== null && sms.unsafe_driving !== undefined ||
    sms.crash_indicator !== null && sms.crash_indicator !== undefined
  );

  const risk = smsAlerts >= 3 || fatalCrashes > 0
    ? { label: "HIGH RISK", color: "#ef4444", bg: "#fef2f2" }
    : smsAlerts >= 1 || totalCrashes > 0
    ? { label: "ELEVATED", color: "#f97316", bg: "#fff7ed" }
    : { label: "CLEAR", color: "#22c55e", bg: "#f0fdf4" };

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
            </div>
            <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: "20px", background: risk.bg, color: risk.color, fontSize: "12px", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>
              {risk.label}
            </span>
          </div>
          <InfoRow label="Address" value={[carrier.address, carrier.city, carrier.state, carrier.zip].filter(Boolean).join(", ")} />
          <InfoRow label="Phone" value={carrier.phone} />
          <InfoRow label="State" value={carrier.state} />
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

        {/* Safety Rating */}
        {(carrier.safety_rating || carrier.review_type) && (
          <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Safety Rating</h2>
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
                {carrier.safety_rating_date && (
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                    as of {new Date(carrier.safety_rating_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            )}
            <InfoRow label="Review Type" value={carrier.review_type} />
            <InfoRow label="Review Date" value={carrier.review_date ? new Date(carrier.review_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : undefined} />
          </div>
        )}

        {/* SMS Safety Scores */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>SMS Safety Scores</h2>
            {sms?.score_date && (
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                {fmtDate(sms.score_date)}
              </span>
            )}
          </div>
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
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Crash History</h2>

          {accidentDate && (
            <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px" }}>
              Showing {crashesToShow.length} of {crashes.length} crashes on or before {accidentDate}
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
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{c.state ?? "—"}</td>
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
        {/* Inspection History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Inspection History</h2>

          {accidentDate && (
            <p style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "16px" }}>
              Showing {inspectionsToShow.length} of {inspections.length} inspections on or before {accidentDate}
            </p>
          )}

          {inspectionsToShow.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
              {accidentDate ? "No inspections on or before the accident date." : "No inspection records found."}
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
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{insp.state ?? "—"}</td>
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

        {/* Violations */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Violations</h2>
          {violations.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No violation records found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Code", "CFR Section", "Category", "Unit", "OOS"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, i) => {
                    const isOos = v.oos_indicator === "Y";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: isOos ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{v.violation_code ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{v.description ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{v.basic_category ?? "—"}</td>
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

        {/* Insurance History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>Insurance History</h2>
            {accidentDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>ACTIVE ON {accidentDate}</span>
                <YesNoBadge value={insuranceActiveAtDate} />
              </div>
            )}
          </div>
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
                        <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.policy_type ?? "—"}</td>
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
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>OOS Orders & Reinstatements</h2>
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
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Revocation History</h2>
          {alerts.filter(a => a.event_type === "INVOLUNTARY_REVOCATION").length === 0 ? (
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
                  {alerts.filter(a => a.event_type === "INVOLUNTARY_REVOCATION").map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: "#fef2f2" }}>
                      <td style={{ padding: "8px 12px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(a.event_date)}</td>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{a.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Authority History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>Authority History</h2>
            {accidentDate && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>ACTIVE ON {accidentDate}</span>
                <YesNoBadge value={authorityActiveAtDate} />
              </div>
            )}
          </div>
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
