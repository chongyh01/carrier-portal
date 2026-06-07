import Link from "next/link";
import { notFound } from "next/navigation";

const SUPABASE_URL = 'https://linlnqrroavcutfpmkiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbmxucXJyb2F2Y3V0ZnBta2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDI5NTgsImV4cCI6MjA5NjIxODk1OH0.lb8CzjTWfzRYPwbm1FU-JCRiA4BPgyhCIRBq2h4t6Qk';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

const ALERT_THRESHOLD = 75;

type Carrier = {
  dot_number: string;
  mc_number?: string;
  legal_name: string;
  dba_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  total_drivers?: number;
  total_trucks?: number;
  cargo_type?: string;
  status?: string;
};

type SmsScores = {
  unsafe_driving?: number;
  hours_of_service_compliance?: number;
  driver_fitness?: number;
  controlled_substances_alcohol?: number;
  vehicle_maintenance?: number;
  hazardous_materials?: number;
  crash_indicator?: number;
  unsafe_driving_alert?: boolean;
  hours_of_service_compliance_alert?: boolean;
  driver_fitness_alert?: boolean;
  controlled_substances_alcohol_alert?: boolean;
  vehicle_maintenance_alert?: boolean;
  hazardous_materials_alert?: boolean;
  crash_indicator_alert?: boolean;
  score_date?: string;
};

type Crash = {
  crash_date?: string;
  state?: string;
  fatal: number;
  injury: number;
  towaway: number;
  report_number?: string;
};

type Inspection = {
  id: string;
  inspection_date?: string;
  state?: string;
  level?: string;
  oos_vehicles?: number;
  oos_drivers?: number;
  total_violations?: number;
};

type Violation = {
  violation_code?: string;
  description?: string;
  oos_indicator?: string;
  unit_type?: string;
  basic_category?: string;
};

type Insurance = {
  policy_type?: string;
  insurer_name?: string;
  policy_number?: string;
  effective_date?: string;
  cancellation_date?: string;
  status?: string;
};

type AuthorityRecord = {
  authority_type?: string;
  status?: string;
  effective_date?: string;
  revocation_date?: string;
  reason?: string;
};

type CarrierAlert = {
  event_type?: string;
  event_date?: string;
  description?: string;
};

type OosOrder = {
  order_date?: string;
  reason?: string;
  status?: string;
  reinstatement_date?: string;
};

async function fetchCarrier(dot: string): Promise<Carrier | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/carriers?select=*&dot_number=eq.${dot}&limit=1`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}

async function fetchSmsScores(dot: string): Promise<SmsScores | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sms_scores?select=*&dot_number=eq.${dot}&order=score_date.desc&limit=1`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}

async function fetchCrashes(dot: string): Promise<Crash[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/crashes?select=crash_date,state,fatal,injury,towaway,report_number&dot_number=eq.${dot}&order=crash_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchInspections(dot: string): Promise<Inspection[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/inspections?select=id,inspection_date,state,level,oos_vehicles,oos_drivers,total_violations&dot_number=eq.${dot}&order=inspection_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchViolations(dot: string): Promise<Violation[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/violations?select=violation_code,description,oos_indicator,unit_type,basic_category&dot_number=eq.${dot}&limit=100`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchInsurance(dot: string): Promise<Insurance[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/insurance?select=policy_type,insurer_name,policy_number,effective_date,cancellation_date,status&dot_number=eq.${dot}&order=effective_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchAuthorityHistory(dot: string): Promise<AuthorityRecord[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/authority_history?select=authority_type,status,effective_date,revocation_date,reason&dot_number=eq.${dot}&order=effective_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchAlerts(dot: string): Promise<CarrierAlert[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/carrier_alerts?select=event_type,event_date,description&dot_number=eq.${dot}&order=event_date.desc&limit=20`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchOosOrders(dot: string): Promise<OosOrder[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/oos_orders?select=order_date,reason,status,reinstatement_date&dot_number=eq.${dot}&order=order_date.desc&limit=20`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
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

export default async function CarrierDetailPage({ params }: { params: Promise<{ dot: string }> }) {
  const { dot } = await params;
  const [carrier, sms, crashes, inspections, violations, insurance, authorityHistory, alerts, oosOrders] = await Promise.all([
    fetchCarrier(dot),
    fetchSmsScores(dot),
    fetchCrashes(dot),
    fetchInspections(dot),
    fetchViolations(dot),
    fetchInsurance(dot),
    fetchAuthorityHistory(dot),
    fetchAlerts(dot),
    fetchOosOrders(dot),
  ]);

  if (!carrier) notFound();

  const totalCrashes = crashes.length;
  const fatalCrashes = crashes.reduce((sum, c) => sum + (c.fatal ?? 0), 0);
  const injuryCrashes = crashes.reduce((sum, c) => sum + (c.injury ?? 0), 0);

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

        {/* SMS Safety Scores */}
        <div style={{ background: "white", borderRadius: "12px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>SMS Safety Scores</h2>
            {sms?.score_date && (
              <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>
                {new Date(sms.score_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
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

          {totalCrashes === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No crash records found.</p>
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
                    {crashes.map((c, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: c.fatal > 0 ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{c.crash_date && c.crash_date !== "1970-01-01" ? new Date(c.crash_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
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
          {inspections.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>No inspection records found.</p>
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
                  {inspections.map((insp, i) => {
                    const hasOos = (insp.oos_vehicles ?? 0) > 0 || (insp.oos_drivers ?? 0) > 0;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f8fafc", background: hasOos ? "#fff7ed" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{insp.inspection_date && insp.inspection_date !== "1970-01-01" ? new Date(insp.inspection_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
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
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Insurance History</h2>
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
                  {insurance.map((ins, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.policy_type ?? "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{ins.insurer_name ?? "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.policy_number ?? "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{ins.effective_date ? new Date(ins.effective_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                      <td style={{ padding: "8px 12px", color: ins.cancellation_date ? "#ef4444" : "#94a3b8" }}>{ins.cancellation_date ? new Date(ins.cancellation_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#374151", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>{ins.status ?? "—"}</td>
                    </tr>
                  ))}
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
                        <td style={{ padding: "8px 12px", color: "#374151" }}>{o.order_date && o.order_date !== "1970-01-01" ? new Date(o.order_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#374151", maxWidth: "280px" }}>{o.reason ?? "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, fontFamily: "'DM Mono', monospace", background: isActive ? "#fef2f2" : isReinstated ? "#f0fdf4" : "#f8fafc", color: isActive ? "#ef4444" : isReinstated ? "#22c55e" : "#64748b" }}>
                            {o.status ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "#22c55e" }}>{o.reinstatement_date ? new Date(o.reinstatement_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
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
                      <td style={{ padding: "8px 12px", color: "#374151", whiteSpace: "nowrap" }}>{a.event_date && a.event_date !== "1970-01-01" ? new Date(a.event_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
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
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>Authority History</h2>
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
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{a.effective_date ? new Date(a.effective_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                      <td style={{ padding: "8px 12px", color: a.revocation_date ? "#ef4444" : "#94a3b8" }}>{a.revocation_date ? new Date(a.revocation_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
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
