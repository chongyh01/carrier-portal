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

async function fetchSuspectSuccessors(dot: string, address?: string, phone?: string): Promise<SuspectSuccessor[]> {
  if (!address && !phone) return [];
  // Find carriers sharing address or phone, excluding the current carrier
  const filters: string[] = [`dot_number=neq.${dot}`];
  const orParts: string[] = [];
  if (address && address.trim().length > 5) {
    orParts.push(`address=ilike.${encodeURIComponent(address.trim())}`);
  }
  if (phone && phone.replace(/\D/g, '').length > 7) {
    orParts.push(`phone=eq.${encodeURIComponent(phone.trim())}`);
  }
  if (orParts.length === 0) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/carriers?select=dot_number,legal_name,mc_number,status&${filters.join('&')}&or=(${orParts.join(',')})&limit=10`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data: Array<{ dot_number: string; legal_name: string; mc_number?: string; status?: string }> = await res.json();
  return data.map(c => ({
    ...c,
    connection_type: address && c.dot_number ? 'Same address' : 'Same phone number',
  }));
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

  const suspectSuccessors = await fetchSuspectSuccessors(dot, carrier.address, carrier.phone);

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
