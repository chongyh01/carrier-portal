"use client";

import { useState } from "react";
import Link from "next/link";

const SUPABASE_URL = 'https://linlnqrroavcutfpmkiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbmxucXJyb2F2Y3V0ZnBta2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDI5NTgsImV4cCI6MjA5NjIxODk1OH0.lb8CzjTWfzRYPwbm1FU-JCRiA4BPgyhCIRBq2h4t6Qk';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

type Carrier = {
  dot_number: string;
  legal_name: string;
  dba_name?: string;
  state?: string;
  cargo_type?: string;
  status?: string;
  unsafe_driving_percentile?: number;
  crash_indicator_percentile?: number;
  driver_fitness_percentile?: number;
  controlled_substances_percentile?: number;
  vehicle_maintenance_percentile?: number;
  total_crashes?: number;
  fatal_crashes?: number;
};

const ALERT_THRESHOLD = 75;

function getRiskLevel(carrier: Carrier): { label: string; color: string; bg: string } {
  const scores = [
    carrier.unsafe_driving_percentile,
    carrier.crash_indicator_percentile,
    carrier.driver_fitness_percentile,
    carrier.vehicle_maintenance_percentile,
  ].filter((v) => v !== null && v !== undefined) as number[];

  const smsAlerts = scores.filter((s) => s >= ALERT_THRESHOLD).length;
  const hasFatal = (carrier.fatal_crashes ?? 0) > 0;
  const hasCrashes = (carrier.total_crashes ?? 0) > 0;

  if (smsAlerts >= 3 || hasFatal) return { label: "HIGH RISK", color: "#ef4444", bg: "#fef2f2" };
  if (smsAlerts >= 1 || hasCrashes) return { label: "ELEVATED", color: "#f97316", bg: "#fff7ed" };
  return { label: "CLEAR", color: "#22c55e", bg: "#f0fdf4" };
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (value === null || value === undefined) return null;
  const alert = value >= ALERT_THRESHOLD;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", color: "#6b7280", fontFamily: "'DM Mono', monospace" }}>{label}</span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: alert ? "#ef4444" : "#374151", fontFamily: "'DM Mono', monospace" }}>
          {value}th
        </span>
      </div>
      <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: alert ? "#ef4444" : value >= 50 ? "#f97316" : "#22c55e", borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

async function searchCarriers(query: string): Promise<Carrier[]> {
  const isNumber = /^\d+$/.test(query.trim());
  const q = query.trim();
  const select = 'dot_number,legal_name,dba_name,state,cargo_type,status';

  const carrierUrl = isNumber
    ? `${SUPABASE_URL}/rest/v1/carriers?select=${select}&dot_number=eq.${q}&limit=20`
    : `${SUPABASE_URL}/rest/v1/carriers?select=${select}&or=(legal_name.ilike.*${encodeURIComponent(q)}*,dba_name.ilike.*${encodeURIComponent(q)}*)&limit=100`;

  const res = await fetch(carrierUrl, { headers: HEADERS });
  console.log('STATUS:', res.status, 'URL:', carrierUrl);
  if (!res.ok) { console.log('ERROR:', await res.text()); return []; }
  const data = await res.json();

  let carriers: any[] = data;
  if (!isNumber) {
    const pattern = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    carriers = data.filter((c: any) => pattern.test(c.legal_name || "") || pattern.test(c.dba_name || ""));
    carriers.sort((a, b) => {
      const aName = (a.legal_name || "").toUpperCase();
      const bName = (b.legal_name || "").toUpperCase();
      const uq = q.toUpperCase();
      return (aName.startsWith(uq) ? 0 : 1) - (bName.startsWith(uq) ? 0 : 1) || aName.localeCompare(bName);
    });
    carriers = carriers.slice(0, 30);
  }

  if (carriers.length === 0) return [];

  const dots = carriers.map((c) => c.dot_number).join(',');

  const [smsRes, crashRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/sms_scores?select=dot_number,unsafe_driving,crash_indicator,driver_fitness,controlled_substances_alcohol,vehicle_maintenance&dot_number=in.(${dots})&order=score_date.desc`,
      { headers: HEADERS }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/crashes?select=dot_number,fatal&dot_number=in.(${dots})`,
      { headers: HEADERS }
    ),
  ]);

  const smsMap = new Map<string, any>();
  if (smsRes.ok) {
    for (const s of await smsRes.json()) {
      if (!smsMap.has(s.dot_number)) smsMap.set(s.dot_number, s);
    }
  }

  const crashMap = new Map<string, { total: number; fatal: number }>();
  if (crashRes.ok) {
    for (const c of await crashRes.json()) {
      const agg = crashMap.get(c.dot_number) ?? { total: 0, fatal: 0 };
      agg.total += 1;
      agg.fatal += c.fatal ?? 0;
      crashMap.set(c.dot_number, agg);
    }
  }

  return carriers.map((c) => {
    const sms = smsMap.get(c.dot_number);
    const crash = crashMap.get(c.dot_number);
    return {
      ...c,
      unsafe_driving_percentile: sms?.unsafe_driving ?? undefined,
      crash_indicator_percentile: sms?.crash_indicator ?? undefined,
      driver_fitness_percentile: sms?.driver_fitness ?? undefined,
      controlled_substances_percentile: sms?.controlled_substances_alcohol ?? undefined,
      vehicle_maintenance_percentile: sms?.vehicle_maintenance ?? undefined,
      total_crashes: crash?.total,
      fatal_crashes: crash?.fatal,
    };
  });
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const data = await searchCarriers(query);
    setResults(data);
    setLoading(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; }
        button:hover { opacity: 0.9; }
      `}</style>

      <header style={{ background: "#0f172a", padding: "16px 32px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "32px", height: "32px", background: "#3b82f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "white", fontSize: "16px" }}>🚛</span>
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: "18px", letterSpacing: "-0.3px" }}>Carrier Intelligence</span>
        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>FMCSA DATA PORTAL</span>
      </header>

      <section style={{ background: "#0f172a", padding: "48px 32px 64px", textAlign: "center" }}>
        <p style={{ color: "#64748b", fontSize: "12px", letterSpacing: "2px", fontFamily: "'DM Mono', monospace", marginBottom: "16px" }}>CARRIER LOOKUP</p>
        <h1 style={{ color: "white", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, letterSpacing: "-1px", marginBottom: "8px" }}>Search Any US Carrier</h1>
        <p style={{ color: "#94a3b8", fontSize: "15px", marginBottom: "32px" }}>Safety scores, crash history, violations — instant FMCSA intelligence</p>
        <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Company name or DOT number..."
            style={{ flex: 1, padding: "14px 20px", borderRadius: "10px", border: "2px solid #1e293b", background: "#1e293b", color: "white", fontSize: "15px", fontFamily: "'DM Sans', sans-serif" }}
          />
          <button onClick={handleSearch} style={{ padding: "14px 28px", background: "#3b82f6", color: "white", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
            {loading ? "..." : "Search"}
          </button>
        </div>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
        {loading && <p style={{ textAlign: "center", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Searching FMCSA database...</p>}
        {!loading && searched && results.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>No carriers found for &quot;{query}&quot;</p>}
        {!loading && results.length > 0 && <p style={{ color: "#64748b", fontSize: "13px", fontFamily: "'DM Mono', monospace", marginBottom: "20px" }}>{results.length} RESULT{results.length !== 1 ? "S" : ""} FOUND</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {results.map((carrier) => {
            const risk = getRiskLevel(carrier);
            const hasScores = [
              carrier.unsafe_driving_percentile,
              carrier.crash_indicator_percentile,
              carrier.driver_fitness_percentile,
              carrier.vehicle_maintenance_percentile,
              carrier.controlled_substances_percentile,
            ].some((v) => v !== null && v !== undefined);

            return (
              <Link key={carrier.dot_number} href={`/carrier/${carrier.dot_number}`} style={{ textDecoration: "none", color: "inherit", display: "block", background: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>{carrier.legal_name || "—"}</h2>
                    {carrier.dba_name && <p style={{ fontSize: "13px", color: "#64748b" }}>DBA: {carrier.dba_name}</p>}
                    <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#94a3b8" }}>DOT #{carrier.dot_number}</span>
                      {carrier.state && <span style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#94a3b8" }}>{carrier.state}</span>}
                      {carrier.cargo_type && <span style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: "#94a3b8" }}>{carrier.cargo_type}</span>}
                      {(carrier.total_crashes ?? 0) > 0 && (
                        <span style={{ fontSize: "12px", fontFamily: "'DM Mono', monospace", color: (carrier.fatal_crashes ?? 0) > 0 ? "#ef4444" : "#f97316", fontWeight: 600 }}>
                          {carrier.total_crashes} crash{carrier.total_crashes !== 1 ? "es" : ""}
                          {(carrier.fatal_crashes ?? 0) > 0 && ` · ${carrier.fatal_crashes} fatal`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "20px", background: risk.bg, color: risk.color, fontSize: "11px", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>{risk.label}</span>
                    {carrier.status && <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", fontFamily: "'DM Mono', monospace" }}>Status: {carrier.status}</p>}
                  </div>
                </div>

                {hasScores && (
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                    <p style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "12px", letterSpacing: "1px" }}>SMS PERCENTILES (≥75 = ALERT)</p>
                    <ScoreBar label="UNSAFE DRIVING" value={carrier.unsafe_driving_percentile} />
                    <ScoreBar label="CRASH INDICATOR" value={carrier.crash_indicator_percentile} />
                    <ScoreBar label="DRIVER FITNESS" value={carrier.driver_fitness_percentile} />
                    <ScoreBar label="VEHICLE MAINTENANCE" value={carrier.vehicle_maintenance_percentile} />
                    <ScoreBar label="CONTROLLED SUBSTANCES" value={carrier.controlled_substances_percentile} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
