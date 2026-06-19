export type Carrier = {
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
  safety_rating?: string;
  safety_rating_date?: string;
  review_type?: string;
  review_date?: string;
  updated_at?: string;
};

export type SmsScores = {
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
  fetched_at?: string;
};

export type Crash = {
  crash_date?: string;
  state?: string;
  fatal: number;
  injury: number;
  towaway: number;
  report_number?: string;
  imported_at?: string;
};

export type Inspection = {
  id: string;
  inspection_date?: string;
  state?: string;
  level?: string;
  oos_vehicles?: number;
  oos_drivers?: number;
  total_violations?: number;
  imported_at?: string;
};

export type Violation = {
  violation_code?: string;
  description?: string;
  oos_indicator?: string;
  unit_type?: string;
  basic_category?: string;
  imported_at?: string;
  inspection_date?: string;
};

export type Insurance = {
  policy_type?: string;
  insurer_name?: string;
  policy_number?: string;
  effective_date?: string;
  cancellation_date?: string;
  status?: string;
  imported_at?: string;
};

export type AuthorityRecord = {
  authority_type?: string;
  status?: string;
  effective_date?: string;
  revocation_date?: string;
  reason?: string;
  imported_at?: string;
};

export type CarrierAlert = {
  event_type?: string;
  event_date?: string;
  description?: string;
  detected_at?: string;
};

export type OosOrder = {
  order_date?: string;
  reason?: string;
  status?: string;
  reinstatement_date?: string;
  detected_at?: string;
};

export type Boc3Agent = {
  company_name?: string;
  attention_to?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
};

export type RejectedInsurance = {
  form_code?: string;
  insurance_type?: string;
  policy_number?: string;
  received_date?: string;
  rejected_date?: string;
  company_name?: string;
  rejected_reason?: string;
  class_code?: string;
};

export type SuspectSuccessor = {
  dot_number: string;
  legal_name: string;
  mc_number?: string;
  status?: string;
  connection_type: string;
  first_authority_date?: string;
};
