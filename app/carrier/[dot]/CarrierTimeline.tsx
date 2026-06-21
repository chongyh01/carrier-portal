"use client";
import type { Carrier, Crash, Inspection, Violation, Insurance, AuthorityRecord, CarrierAlert, OosOrder } from "./types";

type Props = {
  carrier?: Carrier;
  crashes: Crash[];
  inspections: Inspection[];
  violations: Violation[];
  insurance: Insurance[];
  authorityHistory: AuthorityRecord[];
  alerts: CarrierAlert[];
  oosOrders: OosOrder[];
  accidentDate?: string;
};

type TimelineEvent = {
  date: string;
  label: string;
  color: string;
};

const MAX_EVENTS = 50;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function isValidDate(d: string | undefined | null): boolean {
  if (!d) return false;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return false;
  // Skip 1970 epoch dates (null proxies)
  if (dt.getUTCFullYear() === 1970) return false;
  return true;
}

function buildEvents(props: Props): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Crashes
  for (const c of props.crashes) {
    if (!isValidDate(c.crash_date)) continue;
    const parts: string[] = [];
    if (c.fatal > 0) parts.push(`${c.fatal} fatal`);
    if (c.injury > 0) parts.push(`${c.injury} injur${c.injury === 1 ? "y" : "ies"}`);
    if (c.towaway > 0) parts.push(`${c.towaway} towaway${c.towaway === 1 ? "" : "s"}`);
    const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    const stateStr = c.state ? ` — ${c.state}` : "";
    const isFatal = c.fatal > 0;
    events.push({
      date: c.crash_date!,
      label: `${isFatal ? "Fatal crash" : "Crash"}${detail}${stateStr}`,
      color: "#dc2626", // red
    });
  }

  // Inspections — one entry per inspection (violations and OOS from inspection fields)
  for (const insp of props.inspections) {
    if (!isValidDate(insp.inspection_date)) continue;
    const parts: string[] = [];
    if (insp.total_violations != null && insp.total_violations > 0) {
      parts.push(`${insp.total_violations} violation${insp.total_violations === 1 ? "" : "s"}`);
    }
    const oosCount = (insp.oos_vehicles ?? 0) + (insp.oos_drivers ?? 0);
    if (oosCount > 0) {
      const oosParts: string[] = [];
      if (insp.oos_vehicles && insp.oos_vehicles > 0) oosParts.push(`${insp.oos_vehicles} vehicle out-of-service (OOS)`);
      if (insp.oos_drivers && insp.oos_drivers > 0) oosParts.push(`${insp.oos_drivers} driver out-of-service (OOS)`);
      parts.push(oosParts.join(", "));
    }
    const detail = parts.length > 0 ? ` with ${parts.join(" and ")}` : "";
    const levelStr = insp.level ? ` (Level ${insp.level})` : "";
    const hasOos = oosCount > 0;
    events.push({
      date: insp.inspection_date!,
      label: `Inspection${levelStr}${detail}`,
      color: hasOos ? "#d97706" : "#2563eb", // amber if OOS, blue otherwise
    });
  }

  // Insurance events — one entry per policy start and per policy end
  for (const ins of props.insurance) {
    const policyStr = ins.policy_type ? ` (${ins.policy_type})` : "";
    const insurerStr = ins.insurer_name ? ` — ${ins.insurer_name}` : "";

    if (isValidDate(ins.effective_date)) {
      events.push({
        date: ins.effective_date!,
        label: `Insurance active${policyStr}${insurerStr}`,
        color: "#16a34a", // green
      });
    }

    if (isValidDate(ins.cancellation_date)) {
      events.push({
        date: ins.cancellation_date!,
        label: `Insurance cancelled${policyStr}${insurerStr}`,
        color: "#dc2626", // red
      });
    }
  }

  // Authority history
  for (const auth of props.authorityHistory) {
    const typeStr = auth.authority_type ? ` (${auth.authority_type})` : "";

    if (isValidDate(auth.effective_date)) {
      const statusUpper = (auth.status ?? "").toUpperCase();
      let label: string;
      let color: string;

      if (statusUpper.includes("REVOK") || statusUpper.includes("REVOC")) {
        label = `Authority revoked${typeStr}`;
        color = "#dc2626";
      } else if (statusUpper.includes("REINSTAT")) {
        label = `Authority reinstated${typeStr}`;
        color = "#16a34a";
      } else if (statusUpper.includes("GRANT") || statusUpper === "ACTIVE") {
        label = `Authority granted${typeStr}`;
        color = "#16a34a";
      } else {
        label = `Authority ${auth.status ?? "updated"}${typeStr}`;
        color = "#6b7280"; // grey
      }

      events.push({
        date: auth.effective_date!,
        label,
        color,
      });
    }

    if (isValidDate(auth.revocation_date)) {
      const reasonStr = auth.reason ? ` — ${auth.reason}` : "";
      events.push({
        date: auth.revocation_date!,
        label: `Authority revoked${typeStr}${reasonStr}`,
        color: "#dc2626",
      });
    }
  }

  // Carrier alerts (INVOLUNTARY_REVOCATION entries)
  for (const alert of props.alerts) {
    if (!isValidDate(alert.event_date)) continue;
    const isRevocation =
      (alert.event_type ?? "").toUpperCase().includes("REVOC") ||
      (alert.event_type ?? "").toUpperCase().includes("REVOK");
    if (!isRevocation) continue;
    const desc = alert.description ? ` — ${alert.description}` : "";
    events.push({
      date: alert.event_date!,
      label: `Involuntary revocation${desc}`,
      color: "#dc2626",
    });
  }

  // OOS orders
  for (const oos of props.oosOrders) {
    if (isValidDate(oos.order_date)) {
      const reasonStr = oos.reason ? ` — ${oos.reason}` : "";
      events.push({
        date: oos.order_date!,
        label: `Out-of-service order issued${reasonStr}`,
        color: "#d97706", // amber
      });
    }

    if (isValidDate(oos.reinstatement_date)) {
      events.push({
        date: oos.reinstatement_date!,
        label: "Out-of-service order lifted (reinstated)",
        color: "#16a34a",
      });
    }
  }

  // Sort descending (most recent first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return events;
}

export default function CarrierTimeline(props: Props) {
  const allEvents = buildEvents(props);
  const overflow = allEvents.length > MAX_EVENTS ? allEvents.length - MAX_EVENTS : 0;
  const events = overflow > 0 ? allEvents.slice(0, MAX_EVENTS) : allEvents;

  // Find the first event index where date <= accidentDate (insert marker before that row)
  const accDate = props.accidentDate && isValidDate(props.accidentDate) ? props.accidentDate : null;
  const accMarkerIndex = accDate
    ? events.findIndex(ev => ev.date <= accDate)
    : -1;

  return (
    <div style={{ marginTop: 32 }}>
      {/* Section header */}
      <div
        style={{
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
          padding: "10px 16px",
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "#1e293b",
            letterSpacing: 0.2,
          }}
        >
          Chronological Timeline
        </h2>
      </div>

      {events.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          No dated records available for timeline.
        </p>
      ) : (
        <>
          {/* Vertical timeline */}
          <div
            style={{
              borderLeft: "2px solid #e2e8f0",
              paddingLeft: 20,
              marginLeft: 8,
            }}
          >
            {events.map((ev, idx) => (
              <div key={idx}>
                {accMarkerIndex === idx && (
                  <div style={{ borderTop: "2px dashed #ef4444", margin: "8px 0 12px -20px", paddingLeft: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>▼ ACCIDENT DATE — {fmtDate(accDate!)}</span>
                  </div>
                )}
              <div
                style={{
                  position: "relative",
                  marginBottom: 16,
                }}
              >
                {/* Colored dot */}
                <div
                  style={{
                    position: "absolute",
                    left: -28,
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: ev.color,
                    border: "2px solid #ffffff",
                    boxShadow: "0 0 0 1px #e2e8f0",
                  }}
                />
                {/* Event text */}
                <span
                  style={{
                    fontSize: 13,
                    color: "#1e293b",
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{fmtDate(ev.date)}</span>
                  {" — "}
                  <span style={{ color: ev.color === "#6b7280" ? "#475569" : ev.color, fontWeight: 500 }}>
                    {ev.label}
                  </span>
                </span>
              </div>
              </div>
            ))}
          </div>

          {overflow > 0 && (
            <p
              style={{
                marginTop: 12,
                marginLeft: 28,
                fontSize: 13,
                color: "#6b7280",
                fontStyle: "italic",
              }}
            >
              ... and {overflow} more event{overflow === 1 ? "" : "s"} not shown (showing most recent {MAX_EVENTS})
            </p>
          )}
        </>
      )}
    </div>
  );
}
