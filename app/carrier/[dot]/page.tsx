import { notFound } from "next/navigation";
import CarrierDetailView from "./CarrierDetailView";
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

const SUPABASE_URL = 'https://linlnqrroavcutfpmkiz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbmxucXJyb2F2Y3V0ZnBta2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDI5NTgsImV4cCI6MjA5NjIxODk1OH0.lb8CzjTWfzRYPwbm1FU-JCRiA4BPgyhCIRBq2h4t6Qk';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
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
    `${SUPABASE_URL}/rest/v1/crashes?select=crash_date,state,fatal,injury,towaway,report_number,imported_at&dot_number=eq.${dot}&order=crash_date.desc&limit=200`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchInspections(dot: string): Promise<Inspection[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/inspections?select=id,inspection_date,state,level,oos_vehicles,oos_drivers,total_violations,imported_at&dot_number=eq.${dot}&order=inspection_date.desc&limit=200`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchViolations(dot: string): Promise<Violation[]> {
  // inspection_id FK is not populated in the import pipeline, so we can't join directly.
  // Instead, fetch violations and inspections separately, then distribute violation rows
  // across inspections in date order using each inspection's total_violations count.
  const [violRes, inspRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/violations?select=violation_code,description,oos_indicator,unit_type,basic_category,imported_at&dot_number=eq.${dot}&limit=500`,
      { headers: HEADERS, cache: 'no-store' }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/inspections?select=inspection_date,total_violations&dot_number=eq.${dot}&order=inspection_date.desc&limit=200`,
      { headers: HEADERS, cache: 'no-store' }
    ),
  ]);
  if (!violRes.ok) return [];
  const violations: Violation[] = await violRes.json();
  if (inspRes.ok) {
    const inspections: Array<{ inspection_date?: string; total_violations?: number }> = await inspRes.json();
    let idx = 0;
    for (const insp of inspections) {
      const count = insp.total_violations ?? 0;
      for (let i = 0; i < count && idx < violations.length; i++, idx++) {
        violations[idx].inspection_date = insp.inspection_date;
      }
    }
  }
  return violations;
}

async function fetchInsurance(dot: string): Promise<Insurance[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/insurance?select=policy_type,insurer_name,policy_number,effective_date,cancellation_date,status,imported_at&dot_number=eq.${dot}&order=effective_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchAuthorityHistory(dot: string): Promise<AuthorityRecord[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/authority_history?select=authority_type,status,effective_date,revocation_date,reason,imported_at&dot_number=eq.${dot}&order=effective_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchAlerts(dot: string): Promise<CarrierAlert[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/carrier_alerts?select=event_type,event_date,description,detected_at&dot_number=eq.${dot}&order=event_date.desc&limit=20`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchOosOrders(dot: string): Promise<OosOrder[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/oos_orders?select=order_date,reason,status,reinstatement_date,detected_at&dot_number=eq.${dot}&order=order_date.desc&limit=20`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchBoc3(dot: string): Promise<Boc3Agent[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/boc3?select=company_name,attention_to,address,city,state,zip_code,country&dot_number=eq.${dot}&limit=5`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchRejectedInsurance(dot: string): Promise<RejectedInsurance[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rejected_insurance?select=form_code,insurance_type,policy_number,received_date,rejected_date,company_name,rejected_reason,class_code&dot_number=eq.${dot}&order=rejected_date.desc&limit=20`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchSuspectSuccessors(
  dot: string,
  revocationDate: string,
  address?: string,
  phone?: string,
): Promise<SuspectSuccessor[]> {
  const results: Map<string, SuspectSuccessor> = new Map();

  // Fix 4: Split address and phone into separate fetches so each match
  // can be correctly labelled (combined OR query mislabels phone-only matches as "Same address").

  // --- 1a. Address matches ---
  if (address && address.trim().length > 5) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/carriers?select=dot_number,legal_name,mc_number,status&dot_number=neq.${dot}&address=ilike.${encodeURIComponent('%' + address.trim() + '%')}&limit=20`,
      { headers: HEADERS, cache: 'no-store' }
    );
    if (res.ok) {
      const data: Array<{ dot_number: string; legal_name: string; mc_number?: string; status?: string }> = await res.json();
      for (const c of data) {
        if (!results.has(c.dot_number)) {
          results.set(c.dot_number, { ...c, connection_type: 'Same address' });
        }
      }
    }
  }

  // --- 1b. Phone matches ---
  if (phone && phone.replace(/\D/g, '').length > 7) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/carriers?select=dot_number,legal_name,mc_number,status&dot_number=neq.${dot}&phone=eq.${encodeURIComponent(phone.trim())}&limit=20`,
      { headers: HEADERS, cache: 'no-store' }
    );
    if (res.ok) {
      const data: Array<{ dot_number: string; legal_name: string; mc_number?: string; status?: string }> = await res.json();
      for (const c of data) {
        if (!results.has(c.dot_number)) {
          results.set(c.dot_number, { ...c, connection_type: 'Same phone number' });
        }
      }
    }
  }

  // --- 2. BOC3 process agent matches ---
  const boc3Res = await fetch(
    `${SUPABASE_URL}/rest/v1/boc3?select=company_name&dot_number=eq.${dot}&company_name=not.is.null&limit=5`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (boc3Res.ok) {
    const myBoc3: Array<{ company_name: string }> = await boc3Res.json();
    const myAgents = myBoc3.map(b => b.company_name).filter(Boolean);
    if (myAgents.length > 0) {
      const agentFilter = myAgents.map(a => `company_name=eq.${encodeURIComponent(a)}`).join(',');
      const sharedRes = await fetch(
        `${SUPABASE_URL}/rest/v1/boc3?select=dot_number&dot_number=neq.${dot}&or=(${agentFilter})&limit=50`,
        { headers: HEADERS, cache: 'no-store' }
      );
      if (sharedRes.ok) {
        const sharedAgents: Array<{ dot_number: string }> = await sharedRes.json();
        const boc3DotNumbers = [...new Set(sharedAgents.map(b => b.dot_number))].filter(d => !results.has(d));
        if (boc3DotNumbers.length > 0) {
          const dotFilter = boc3DotNumbers.slice(0, 30).map(d => `dot_number=eq.${d}`).join(',');
          const carriersRes = await fetch(
            `${SUPABASE_URL}/rest/v1/carriers?select=dot_number,legal_name,mc_number,status&or=(${dotFilter})&limit=30`,
            { headers: HEADERS, cache: 'no-store' }
          );
          if (carriersRes.ok) {
            const boc3Carriers: Array<{ dot_number: string; legal_name: string; mc_number?: string; status?: string }> = await carriersRes.json();
            for (const c of boc3Carriers) {
              if (!results.has(c.dot_number)) {
                results.set(c.dot_number, { ...c, connection_type: 'Same process agent (BOC-3)' });
              }
            }
          }
        }
      }
    }
  }

  // Fix 1: Filter candidates by revocationDate — only keep carriers that obtained
  // a new authority grant AFTER the revocation. Carriers registered before the
  // revocation sharing an address are not chameleons; they are co-located businesses.
  const filteredDots: string[] = [];
  for (const dotNum of results.keys()) {
    try {
      const authRes = await fetch(
        `${SUPABASE_URL}/rest/v1/authority_history?dot_number=eq.${dotNum}&status=ilike.*GRANT*&effective_date=gt.${encodeURIComponent(revocationDate)}&select=effective_date&order=effective_date.asc&limit=1`,
        { headers: HEADERS, cache: 'no-store' }
      );
      if (authRes.ok) {
        const authData: Array<{ effective_date: string }> = await authRes.json();
        if (authData.length > 0) {
          // This candidate registered after the revocation — keep it and store the date
          const succ = results.get(dotNum)!;
          results.set(dotNum, { ...succ, first_authority_date: authData[0].effective_date });
          filteredDots.push(dotNum);
        }
      }
    } catch {
      // skip on error
    }
  }

  // Remove candidates that didn't pass the revocationDate filter
  for (const dotNum of results.keys()) {
    if (!filteredDots.includes(dotNum)) {
      results.delete(dotNum);
    }
  }

  return Array.from(results.values()).slice(0, 10);
}

export default async function CarrierDetailPage({ params }: { params: Promise<{ dot: string }> }) {
  const { dot } = await params;
  const [carrier, sms, crashes, inspections, violations, insurance, authorityHistory, alerts, oosOrders, boc3, rejectedInsurance] = await Promise.all([
    fetchCarrier(dot),
    fetchSmsScores(dot),
    fetchCrashes(dot),
    fetchInspections(dot),
    fetchViolations(dot),
    fetchInsurance(dot),
    fetchAuthorityHistory(dot),
    fetchAlerts(dot),
    fetchOosOrders(dot),
    fetchBoc3(dot),
    fetchRejectedInsurance(dot),
  ]);

  if (!carrier) notFound();

  // Fix 2: Exclude DISCONTINUED revocations (reversed) — these are not real revocations.
  // Fix 3: Extract the most recent qualifying revocation date to pass as the filter boundary.
  const qualifyingRevocations = alerts.filter(
    a =>
      a.event_type === 'INVOLUNTARY_REVOCATION' &&
      !(a.description ?? '').toLowerCase().includes('discontinued'),
  );
  const hasRevocation = qualifyingRevocations.length > 0;
  const revocationDate = qualifyingRevocations
    .map(a => a.event_date ?? '')
    .filter(Boolean)
    .sort()
    .pop() ?? '';
  const suspectSuccessors =
    hasRevocation && revocationDate
      ? await fetchSuspectSuccessors(dot, revocationDate, carrier.address, carrier.phone)
      : [];

  return (
    <CarrierDetailView
      carrier={carrier}
      sms={sms}
      crashes={crashes}
      inspections={inspections}
      violations={violations}
      insurance={insurance}
      authorityHistory={authorityHistory}
      alerts={alerts}
      oosOrders={oosOrders}
      boc3={boc3}
      rejectedInsurance={rejectedInsurance}
      suspectSuccessors={suspectSuccessors}
    />
  );
}
