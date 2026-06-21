"use client";
import type {
  Carrier, Crash, Inspection, Violation, Insurance,
  AuthorityRecord, CarrierAlert, OosOrder, RejectedInsurance,
} from "./types";

type EventCategory =
  | "crash"
  | "inspection"
  | "inspection-oos"
  | "authority-granted"
  | "authority-revoked"
  | "authority-other"
  | "insurance-active"
  | "insurance-cancelled"
  | "insurance-rejected"
  | "oos-issued"
  | "oos-lifted"
  | "revocation";

type TimelineEvent = {
  date: string;
  label: string;
  category: EventCategory;
};

type Props = {
  carrier?: Carrier;
  crashes: Crash[];
  inspections: Inspection[];
  violations: Violation[];
  insurance: Insurance[];
  authorityHistory: AuthorityRecord[];
  alerts: CarrierAlert[];
  oosOrders: OosOrder[];
  rejectedInsurance: RejectedInsurance[];
  accidentDate?: string;
};

const MAX_EVENTS = 60;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, "0")} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function isValidDate(d: string | undefined | null): boolean {
  if (!d) return false;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return false;
  if (dt.getUTCFullYear() === 1970) return false;
  return true;
}

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

const CATEGORY_STYLE: Record<EventCategory, { color: string; icon: string; label: string }> = {
  "crash":               { color: "#dc2626", icon: "!",  label: "Crash" },
  "inspection":          { color: "#2563eb", icon: "i",  label: "Inspection" },
  "inspection-oos":      { color: "#d97706", icon: "!",  label: "Inspection (OOS)" },
  "authority-granted":   { color: "#16a34a", icon: "+",  label: "Authority granted/reinstated" },
  "authority-revoked":   { color: "#dc2626", icon: "x",  label: "Authority revoked" },
  "authority-other":     { color: "#6b7280", icon: "~",  label: "Authority update" },
  "insurance-active":    { color: "#16a34a", icon: "+",  label: "Insurance active" },
  "insurance-cancelled": { color: "#dc2626", icon: "x",  label: "Insurance cancelled" },
  "insurance-rejected":  { color: "#b45309", icon: "!",  label: "Insurance rejected by FMCSA" },
  "oos-issued":          { color: "#d97706", icon: "!",  label: "OOS order issued" },
  "oos-lifted":          { color: "#16a34a", icon: "+",  label: "OOS order lifted" },
  "revocation":          { color: "#dc2626", icon: "x",  label: "Involuntary revocation" },
};

const LEGEND_CATEGORIES: EventCategory[] = [
  "crash", "revocation", "authority-revoked",
  "inspection-oos", "oos-issued", "insurance-rejected",
  "authority-granted", "insurance-active", "oos-lifted",
  "inspection",
];

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
    events.push({
      date: c.crash_date!,
      label: `${c.fatal > 0 ? "Fatal crash" : "Crash"}${detail}${stateStr}`,
      category: "crash",
    });
  }

  // Inspections
  for (const insp of props.inspections) {
    if (!isValidDate(insp.inspection_date)) continue;
    const parts: string[] = [];
    if (insp.total_violations != null && insp.total_violations > 0) {
      parts.push(`${insp.total_violations} violation${insp.total_violations === 1 ? "" : "s"}`);
    }
    const oosV = insp.oos_vehicles ?? 0;
    const oosD = insp.oos_drivers ?? 0;
    if (oosV > 0) parts.push(`${oosV} vehicle OOS`);
    if (oosD > 0) parts.push(`${oosD} driver OOS`);
    const detail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
    const levelStr = insp.level ? ` Level ${insp.level}` : "";
    const hasOos = oosV + oosD > 0;
    events.push({
      date: insp.inspection_date!,
      label: `Inspection${levelStr}${detail}`,
      category: hasOos ? "inspection-oos" : "inspection",
    });
  }

  // Insurance
  for (const ins of props.insurance) {
    const policyStr = ins.policy_type ? ` (${ins.policy_type})` : "";
    const insurerStr = ins.insurer_name ? ` — ${ins.insurer_name}` : "";
    if (isValidDate(ins.effective_date)) {
      events.push({
        date: ins.effective_date!,
        label: `Insurance active${policyStr}${insurerStr}`,
        category: "insurance-active",
      });
    }
    if (isValidDate(ins.cancellation_date)) {
      const methodStr = ins.status ? ` (${ins.status})` : "";
      events.push({
        date: ins.cancellation_date!,
        label: `Insurance cancelled${methodStr}${policyStr}${insurerStr}`,
        category: "insurance-cancelled",
      });
    }
  }

  // Rejected insurance
  for (const r of props.rejectedInsurance) {
    const dateStr = r.rejected_date || r.received_date;
    if (!isValidDate(dateStr)) continue;
    const companyStr = r.company_name ? ` — ${r.company_name}` : "";
    const reasonStr = r.rejected_reason ? `: ${r.rejected_reason.slice(0, 80)}${r.rejected_reason.length > 80 ? "…" : ""}` : "";
    events.push({
      date: dateStr!,
      label: `FMCSA rejected insurance filing${companyStr}${reasonStr}`,
      category: "insurance-rejected",
    });
  }

  // Authority history
  for (const auth of props.authorityHistory) {
    const typeStr = auth.authority_type ? ` (${auth.authority_type})` : "";
    if (isValidDate(auth.effective_date)) {
      const statusUpper = (auth.status ?? "").toUpperCase();
      let label: string;
      let category: EventCategory;
      if (statusUpper.includes("REVOK") || statusUpper.includes("REVOC")) {
        label = `Authority revoked${typeStr}`;
        category = "authority-revoked";
      } else if (statusUpper.includes("REINSTAT")) {
        label = `Authority reinstated${typeStr}`;
        category = "authority-granted";
      } else if (statusUpper.includes("GRANT") || statusUpper === "ACTIVE") {
        label = `Authority granted${typeStr}`;
        category = "authority-granted";
      } else {
        label = `Authority ${auth.status ?? "updated"}${typeStr}`;
        category = "authority-other";
      }
      events.push({ date: auth.effective_date!, label, category });
    }
    if (isValidDate(auth.revocation_date)) {
      const reasonStr = auth.reason ? ` — ${auth.reason}` : "";
      events.push({
        date: auth.revocation_date!,
        label: `Authority revoked${typeStr}${reasonStr}`,
        category: "authority-revoked",
      });
    }
  }

  // Carrier alerts (involuntary revocations)
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
      category: "revocation",
    });
  }

  // OOS orders
  for (const oos of props.oosOrders) {
    if (isValidDate(oos.order_date)) {
      const reasonStr = oos.reason ? ` — ${oos.reason}` : "";
      events.push({
        date: oos.order_date!,
        label: `Out-of-service order issued${reasonStr}`,
        category: "oos-issued",
      });
    }
    if (isValidDate(oos.reinstatement_date)) {
      events.push({
        date: oos.reinstatement_date!,
        label: "Out-of-service order lifted (reinstated)",
        category: "oos-lifted",
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

  const accDate = props.accidentDate && isValidDate(props.accidentDate) ? props.accidentDate : null;

  // Index where we should insert the accident-date divider (first event with date <= accidentDate)
  const accMarkerIndex = accDate
    ? events.findIndex(ev => ev.date <= accDate)
    : -1;

  // Unique legend categories actually used
  const usedCategories = Array.from(new Set(events.map(e => e.category)));
  const legendItems = LEGEND_CATEGORIES.filter(c => usedCategories.includes(c));

  return (
    <div style={{ marginTop: 32 }}>
      {/* Section header */}
      <div style={{ backgroundColor: "#f1f5f9", borderRadius: 6, padding: "10px 16px", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b", letterSpacing: 0.2 }}>
          Chronological Timeline
        </h2>
      </div>

      {events.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
          No dated records available for timeline.
        </p>
      ) : (
        <>
          {/* Legend */}
          {legendItems.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", marginBottom: 20 }}>
              {legendItems.map(cat => {
                const s = CATEGORY_STYLE[cat];
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      backgroundColor: s.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1, fontFamily: "monospace" }}>
                        {s.icon}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#475569" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* "After Accident" label */}
          {accDate && accMarkerIndex > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, marginLeft: 28 }}>
              After accident
            </div>
          )}

          {/* Vertical timeline */}
          <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 20, marginLeft: 8 }}>
            {events.map((ev, idx) => {
              const s = CATEGORY_STYLE[ev.category];
              const near = accDate ? daysBetween(ev.date, accDate) <= 90 : false;
              const isAfter = accDate ? ev.date > accDate : false;

              return (
                <div key={idx}>
                  {/* Accident date divider */}
                  {accMarkerIndex === idx && (
                    <div style={{
                      borderTop: "2px dashed #ef4444",
                      margin: "10px 0 14px -20px",
                      paddingLeft: 20,
                    }}>
                      <span style={{
                        display: "inline-block",
                        marginTop: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#ef4444",
                        fontFamily: "monospace",
                        letterSpacing: "0.04em",
                      }}>
                        ▼ ACCIDENT DATE — {fmtDate(accDate!)}
                      </span>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 10 }}>
                        Before accident
                      </div>
                    </div>
                  )}

                  <div style={{
                    position: "relative",
                    marginBottom: 14,
                    ...(near && !isAfter ? {
                      borderLeft: `3px solid ${s.color}`,
                      paddingLeft: 10,
                      marginLeft: -2,
                      backgroundColor: `${s.color}08`,
                      borderRadius: "0 6px 6px 0",
                      paddingTop: 4,
                      paddingBottom: 4,
                    } : {}),
                  }}>
                    {/* Colored dot with icon */}
                    <div style={{
                      position: "absolute",
                      left: near && !isAfter ? -38 : -28,
                      top: near && !isAfter ? 8 : 4,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: s.color,
                      border: "2px solid #ffffff",
                      boxShadow: "0 0 0 1px #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, lineHeight: 1, fontFamily: "monospace" }}>
                        {s.icon}
                      </span>
                    </div>

                    <span style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: near && !isAfter ? 700 : 600 }}>{fmtDate(ev.date)}</span>
                      {" — "}
                      <span style={{ color: s.color === "#6b7280" ? "#475569" : s.color, fontWeight: 500 }}>
                        {ev.label}
                      </span>
                      {near && !isAfter && accDate && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#ef4444",
                          fontFamily: "monospace",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 4,
                          padding: "1px 5px",
                        }}>
                          {daysBetween(ev.date, accDate)} days from accident
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {overflow > 0 && (
            <p style={{ marginTop: 12, marginLeft: 28, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
              ... and {overflow} more event{overflow === 1 ? "" : "s"} not shown (showing most recent {MAX_EVENTS})
            </p>
          )}
        </>
      )}
    </div>
  );
}
