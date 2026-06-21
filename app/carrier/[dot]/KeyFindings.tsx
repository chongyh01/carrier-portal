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
};

const COLOR_MAP: Record<Bullet["color"], string> = {
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  grey: "#94a3b8",
};

function parseDateStr(dateStr: string | undefined): Date | null {
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

  // 1. Carrier type
  const hasMC = carrier.mc_number && carrier.mc_number !== "MC";
  const cargoUpper = (carrier.cargo_type ?? "").toUpperCase();
  const isPrivate =
    (cargoUpper.includes("PRIVATE PROPERTY") || cargoUpper.includes("PRIVATE PASSENGER")) &&
    !hasMC &&
    !cargoUpper.includes("APPLYING FOR MC");
  const isForHire = !isPrivate;
  const isActive = (carrier.status ?? "").toUpperCase() === "ACTIVE";
  bullets.push({
    text: `${isActive ? "Active" : "Inactive"} ${isForHire ? "authorized-for-hire" : "private property"} carrier`,
    color: isActive ? "green" : "amber",
  });

  // 2. Fleet
  const drivers = carrier.total_drivers ?? null;
  const trucks = carrier.total_trucks ?? null;
  const bothZeroOrNull =
    (drivers === null || drivers === 0) && (trucks === null || trucks === 0);
  if (!bothZeroOrNull) {
    bullets.push({
      text: `${drivers ?? 0} driver${drivers !== 1 ? "s" : ""} and ${trucks ?? 0} truck${trucks !== 1 ? "s" : ""}`,
      color: "grey",
    });
  }

  // 3. All-time crashes
  const totalCrashes = crashes.length;
  if (totalCrashes > 0) {
    bullets.push({
      text: `${totalCrashes} historical crash${totalCrashes !== 1 ? "es" : ""} on record`,
      color: "amber",
    });
  }

  // 4. Fatal crashes
  const fatalCount = crashes.reduce((sum, c) => sum + (c.fatal || 0), 0);
  if (fatalCount > 0) {
    bullets.push({
      text: `${fatalCount} fatal crash${fatalCount !== 1 ? "es" : ""}`,
      color: "red",
    });
  }

  // 5. Injury crashes
  const injuryCount = crashes.reduce((sum, c) => sum + (c.injury || 0), 0);
  if (injuryCount > 0) {
    bullets.push({
      text: `${injuryCount} injury crash${injuryCount !== 1 ? "es" : ""}`,
      color: "amber",
    });
  }

  // 6. Inspections — within 24 months before accident date if set, else all
  let inspectionCount = 0;
  let inspectionLabel = "";
  if (accidentDate) {
    const accDate = parseDateStr(accidentDate);
    if (accDate) {
      const cutoff = subtractMonths(accDate, 24);
      inspectionCount = inspections.filter((insp) => {
        const d = parseDateStr(insp.inspection_date);
        if (!d) return false;
        return d >= cutoff && d <= accDate;
      }).length;
      inspectionLabel = "within 24 months before accident";
    } else {
      inspectionCount = inspections.length;
      inspectionLabel = "on record";
    }
  } else {
    inspectionCount = inspections.length;
    inspectionLabel = "on record";
  }
  if (inspectionCount > 0) {
    bullets.push({
      text: `${inspectionCount} inspection${inspectionCount !== 1 ? "s" : ""} ${inspectionLabel}`,
      color: "grey",
    });
  }

  // 7. OOS vehicle events — sum oos_vehicles from inspections + oosOrders.length
  const oosFromInspections = inspections.reduce(
    (sum, insp) => sum + (insp.oos_vehicles ?? 0),
    0,
  );
  const oosTotal = oosFromInspections + oosOrders.length;
  if (oosTotal > 0) {
    bullets.push({
      text: `${oosTotal} vehicle out-of-service event${oosTotal !== 1 ? "s" : ""}`,
      color: "red",
    });
  }

  // 8. Insurance
  if (insurance.length === 0) {
    if (hasMC) {
      bullets.push({
        text: "No insurance records in database — verify with FMCSA (data may be incomplete)",
        color: "amber",
      });
    } else {
      bullets.push({
        text: "No FMCSA insurance filing records located",
        color: "grey",
      });
    }
  } else {
    bullets.push({
      text: `${insurance.length} insurance filing${insurance.length !== 1 ? "s" : ""} on record`,
      color: "grey",
    });
  }

  // 9. Authority
  if (authorityHistory.length === 0) {
    if (hasMC) {
      bullets.push({
        text: "No authority records in database — verify with FMCSA",
        color: "amber",
      });
    } else {
      bullets.push({
        text: "No operating authority records located",
        color: "grey",
      });
    }
  } else {
    bullets.push({
      text: `${authorityHistory.length} authority record${authorityHistory.length !== 1 ? "s" : ""} on file`,
      color: "grey",
    });
  }

  // 10. Safety rating
  if (carrier.safety_rating) {
    const ratingDate = parseDateStr(carrier.safety_rating_date);
    const now = new Date();
    let text = `Latest safety rating: ${carrier.safety_rating}`;
    if (ratingDate && yearsBetween(ratingDate, now) > 10) {
      const yearsOld = Math.floor(yearsBetween(ratingDate, now));
      text += ` — review date is ${yearsOld} years old`;
    }
    bullets.push({
      text,
      color:
        ratingDate && yearsBetween(ratingDate, now) > 10 ? "amber" : "grey",
    });
  }

  // 11. SMS alerts — count all *_alert booleans that are true
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
        text: `${alertCount} Safety Measurement System (SMS) Behavior Analysis and Safety Improvement Category (BASIC) alert${alertCount !== 1 ? "s" : ""} above threshold`,
        color: "red",
      });
    }
  }

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
        {bullets.map((bullet, i) => (
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
