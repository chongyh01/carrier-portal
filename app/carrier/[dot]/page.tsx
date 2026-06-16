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
    `${SUPABASE_URL}/rest/v1/crashes?select=crash_date,state,fatal,injury,towaway,report_number,imported_at&dot_number=eq.${dot}&order=crash_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchInspections(dot: string): Promise<Inspection[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/inspections?select=id,inspection_date,state,level,oos_vehicles,oos_drivers,total_violations,imported_at&dot_number=eq.${dot}&order=inspection_date.desc&limit=50`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchViolations(dot: string): Promise<Violation[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/violations?select=violation_code,description,oos_indicator,unit_type,basic_category,imported_at&dot_number=eq.${dot}&limit=100`,
    { headers: HEADERS, cache: 'no-store' }
  );
  if (!res.ok) return [];
  return res.json();
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
    />
  );
}
