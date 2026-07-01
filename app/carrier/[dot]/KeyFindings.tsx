"use client";

import type {
  Carrier,
  SmsScores,
  Crash,
  Inspection,
  Insurance,
  AuthorityRecord,
  CarrierAlert,
  OosOrder,
} from "./types";

type Props = {
  carrier: Carrier;
  sms: SmsScores | null;
  crashes: Crash[]; // pre-cleaned, non-zero fatal/injury/towaway only
  inspections: Inspection[];
  insurance: Insurance[]; // deduped
  authorityHistory: AuthorityRecord[];
  alerts: CarrierAlert[];
  oosOrders: OosOrder[];
  accidentDate: string; // yyyy-mm-dd or ""
};

type Bullet = {
  text: string;
  color: "green" | "red" | "amber" | "grey";
  priority: number; // lower = more important; used to sort when accidentDate is set
};

const COLOR_MAP: Record<Bullet["color"], string> = {
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  grey: "#94a3b8",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseDateStr(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function yearsBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function fmtYear(d: Date): string {
  return String(d.getUTCFullYear());
}

function fmtDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function KeyFindings({
  carrier,
  sms,
  crashes,
  inspections,
  insurance,
  authorityHistory,
  alerts,
  oosOrders,
  accidentDate,
}: Props) {
  const bullets: Bullet[] = [];

  // ── helpers ──────────────────────────────────────────────
  const hasMC = !!(carrier.mc_number && carrier.mc_number.trim().toUpperCase() !== "MC");
  const cargoUpper = (carrier.cargo_type ?? "").toUpperCase();
  const isPrivate =
    (cargoUpper.includes("PRIVATE PROPERTY") || cargoUpper.includes("PRIVATE PASSENGER")) &&
    !hasMC &&
    !cargoUpper.includes("APPLYING FOR MC");
  const isForHire = !isPrivate;
  const isActive = (carrier.status ?? "").toUpperCase() === "ACTIVE";

  const accDate = parseDateStr(accidentDate) ?? null;
  const cutoff24 = accDate ? subtractMonths(accDate, 24) : null;

  // ── 1. Carrier status (priority 10) ───────────────────────
  bullets.push({
    text: `${isActive ? "Active" : "Inactive"} ${isForHire ? "authorized-for-hire" : "private property"} carrier`,
    color: isActive ? "green" : "amber",
    priority: 10,
  });

  // ── 2. Fleet — always show (priority 11) ─────────────────
  const drivers = carrier.total_drivers ?? null;
  const trucks = carrier.total_trucks ?? null;
  const bothZeroOrNull =
    (drivers === null || drivers === 0) && (trucks === null || trucks === 0);
  if (bothZeroOrNull) {
    bullets.push({
      text: "Fleet size unverified — verify with FMCSA",
      color: "amber",
      priority: 11,
    });
  } else {
    bullets.push({
      text: `${drivers ?? 0} driver${drivers !== 1 ? "s" : ""} and ${trucks ?? 0} truck${trucks !== 1 ? "s" : ""} on record`,
      color: "grey",
      priority: 11,
    });
  }

  // ── 3. Operating years (priority 12) ─────────────────────
  const earliestAuthDate = authorityHistory
    .map((r) => parseDateStr(r.effective_date))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  if (earliestAuthDate) {
    const now = new Date();
    const yearsOperating = yearsBetween(earliestAuthDate, now);
    if (yearsOperating >= 1) {
      bullets.push({
        text: `Operating for approximately ${Math.floor(yearsOperating)} year${Math.floor(yearsOperating) !== 1 ? "s" : ""} (first authority on record: ${fmtYear(earliestAuthDate)})`,
        color: "grey",
        priority: 12,
      });
    }
  }

  // ── 4. Crashes — single combined bullet (priority 1 or 2) ─
  const totalCrashes = crashes.length;
  const fatalCount = crashes.reduce((sum, c) => sum + (c.fatal || 0), 0);
  const injuryCount = crashes.reduce((sum, c) => sum + (c.injury || 0), 0);
  if (totalCrashes > 0) {
    const parts: string[] = [];
    if (fatalCount > 0) parts.push(`${fatalCount} fatal`);
    if (injuryCount > 0) parts.push(`${injuryCount} with injuries`);
    const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    bullets.push({
      text: `${totalCrashes} crash${totalCrashes !== 1 ? "es" : ""} in total${detail}`,
      color: fatalCount > 0 ? "red" : "amber",
      priority: fatalCount > 0 ? 1 : 2,
    });
  }

  // ── 5. Inspections (priority 3) ───────────────────────────
  let inspectionCount: number;
  let inspectionLabel: string;
  if (accDate && cutoff24) {
    inspectionCount = inspections.filter((insp) => {
      const d = parseDateStr(insp.inspection_date);
      if (!d) return false;
      return d >= cutoff24 && d <= accDate;
    }).length;
    inspectionLabel = "within 24 months before accident";
  } else {
    inspectionCount = inspections.length;
    inspectionLabel = "on record";
  }
  if (inspectionCount > 0) {
    bullets.push({
      text: `${inspectionCount} inspection${inspectionCount !== 1 ? "s" : ""} ${inspectionLabel}`,
      color: "grey",
      priority: 3,
    });
  }

  // ── 6. Violations + OOS combined (priority 4) ─────────────
  // Filter to 24-month window when accidentDate is set (same scope as inspection count)
  const inspInScope = accDate && cutoff24
    ? inspections.filter(insp => {
        const d = parseDateStr(insp.inspection_date);
        return d !== null && d >= cutoff24 && d <= accDate;
      })
    : inspections;
  const violLabel = accDate && cutoff24 ? " within 24 months before accident" : "";

  const totalViolations = inspInScope.reduce(
    (sum, insp) => sum + (insp.total_violations ?? 0),
    0,
  );
  const oosFromInspections = inspInScope.reduce(
    (sum, insp) => sum + (insp.oos_vehicles ?? 0),
    0,
  );
  const oosInScope = accDate && cutoff24
    ? oosOrders.filter(o => {
        const d = parseDateStr(o.order_date);
        return d !== null && d >= cutoff24 && d <= accDate;
      })
    : oosOrders;
  const oosTotal = oosFromInspections + oosInScope.length;
  if (totalViolations > 0 || oosTotal > 0) {
    const parts: string[] = [];
    if (totalViolations > 0) parts.push(`${totalViolations} violation${totalViolations !== 1 ? "s" : ""}${violLabel}`);
    if (oosTotal > 0) parts.push(`${oosTotal} out-of-service event${oosTotal !== 1 ? "s" : ""}${violLabel}`);
    bullets.push({
      text: parts.join(", "),
      color: oosTotal > 0 ? "red" : "amber",
      priority: 4,
    });
  }

  // ── 7. Insurance — status summary (priority 5) ───────────
  if (insurance.length === 0) {
    bullets.push({
      text: hasMC
        ? "No insurance records found — for-hire carriers must maintain FMCSA filing"
        : "No FMCSA insurance filing records located",
      color: hasMC ? "red" : "grey",
      priority: 5,
    });
  } else {
    const hasActive = insurance.some(
      (pol) =>
        pol.status?.toLowerCase().includes("active") ||
        (!pol.cancellation_date && pol.effective_date),
    );
    const hasCancelled = insurance.some(
      (pol) =>
        pol.status?.toLowerCase().includes("cancel") ||
        pol.status?.toLowerCase().includes("term"),
    );
    if (hasActive) {
      bullets.push({
        text: "Active insurance policy on file",
        color: "green",
        priority: 5,
      });
    } else if (hasCancelled) {
      bullets.push({
        text: "Insurance gaps detected — no confirmed active policy",
        color: "red",
        priority: 5,
      });
    } else {
      bullets.push({
        text: `${insurance.length} insurance filing${insurance.length !== 1 ? "s" : ""} on record`,
        color: "grey",
        priority: 5,
      });
    }
  }

  // ── 8. Authority — status summary (priority 6) ────────────
  const nonDiscontinuedRevocations = alerts.filter(
    (a) =>
      a.event_type === "INVOLUNTARY_REVOCATION" &&
      !(a.description ?? "").toLowerCase().includes("discontinued"),
  );
  if (authorityHistory.length === 0) {
    bullets.push({
      text: hasMC
        ? "No authority records in database — verify with FMCSA"
        : "No operating authority records located",
      color: hasMC ? "amber" : "grey",
      priority: 6,
    });
  } else if (nonDiscontinuedRevocations.length > 0 && !isActive) {
    bullets.push({
      text: "Authority revoked — carrier is no longer active",
      color: "red",
      priority: 6,
    });
  } else if (nonDiscontinuedRevocations.length > 0 && isActive) {
    bullets.push({
      text: "Active authority on file — prior revocation history exists",
      color: "amber",
      priority: 6,
    });
  } else {
    bullets.push({
      text: "Active operating authority on file",
      color: "green",
      priority: 6,
    });
  }

  // ── 9. Safety rating (priority 13) ────────────────────────
  if (carrier.safety_rating) {
    const ratingDate = parseDateStr(carrier.safety_rating_date);
    const now = new Date();
    let text = `Safety rating: ${carrier.safety_rating}`;
    let color: Bullet["color"] = "grey";
    if (ratingDate) {
      const reviewYear = ratingDate.getUTCFullYear();
      const yearsOld = Math.floor(yearsBetween(ratingDate, now));
      text += ` (${fmtDate(ratingDate)})`;
      if (yearsOld > 10) {
        text += ` — rating is ${yearsOld} years old`;
        color = "amber";
      }
      if (carrier.safety_rating.toUpperCase() === "UNSATISFACTORY") color = "red";
    }
    bullets.push({ text, color, priority: 13 });
  }

  // ── 10. SMS alerts — shortened (priority 7) ───────────────
  if (sms) {
    const alertFields: (keyof SmsScores)[] = [
      "unsafe_driving_alert",
      "hours_of_service_compliance_alert",
      "driver_fitness_alert",
      "controlled_substances_alcohol_alert",
      "vehicle_maintenance_alert",
      "hazardous_materials_alert",
      "crash_indicator_alert",
    ];
    const alertCount = alertFields.filter((field) => sms[field] === true).length;
    if (alertCount > 0) {
      bullets.push({
        text: `${alertCount} SMS safety category alert${alertCount !== 1 ? "s" : ""} above FMCSA threshold`,
        color: "red",
        priority: 7,
      });
    }
  }

  // ── Sort + cap ────────────────────────────────────────────
  const sorted = accDate
    ? [...bullets].sort((a, b) => a.priority - b.priority).slice(0, 8)
    : bullets.slice(0, 8);

  return (
    <div
      style={{
        background: "#f0f9ff",
        borderLeft: "2px solid #3b82f6",
        padding: "16px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: "#64748b",
          fontWeight: 700,
          marginBottom: "12px",
          textTransform: "uppercase",
        }}
      >
        Key Findings
      </div>
      <div>
        {sorted.map((bullet, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              lineHeight: 1.8,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: COLOR_MAP[bullet.color],
                flexShrink: 0,
                marginRight: "10px",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                color: "#1e293b",
                lineHeight: 1.8,
              }}
            >
              {bullet.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
