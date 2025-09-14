/*
  # Create patient-clinician assignments and clinical data tables

  1. New Tables
    - `patient_clinician_assignments`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to users)
      - `clinician_id` (uuid, foreign key to users)
      - `assigned_at` (timestamp)
      - `status` (text)
    
    - `clinical_notes`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `clinician_id` (uuid, foreign key)
      - `note_content` (text)
      - `note_type` (text)
      - `created_at` (timestamp)
    
    - `intervention_plans`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key)
      - `clinician_id` (uuid, foreign key)
      - `plan_details` (jsonb)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate clinical access policies
*/

-- Create assignment status enum
CREATE TYPE assignment_status_enum AS ENUM ('active', 'inactive', 'transferred');
CREATE TYPE note_type_enum AS ENUM ('assessment', 'progress', 'intervention', 'discharge');
CREATE TYPE plan_status_enum AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- Create patient-clinician assignments table
CREATE TABLE IF NOT EXISTS patient_clinician_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinician_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization text,
  assigned_at timestamptz DEFAULT now(),
  status assignment_status_enum DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, clinician_id)
);

-- Create clinical notes table
CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinician_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_content text NOT NULL,
  note_type note_type_enum NOT NULL,
  is_confidential boolean DEFAULT false,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intervention plans table
CREATE TABLE IF NOT EXISTS intervention_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinician_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  plan_details jsonb NOT NULL DEFAULT '{}',
  goals text[],
  interventions text[],
  timeline_weeks integer,
  status plan_status_enum DEFAULT 'draft',
  effectiveness_score integer CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create alerts and notifications table
CREATE TABLE IF NOT EXISTS user_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'risk', 'appointment', 'medication', 'check_in'
  severity text NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  action_required boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE patient_clinician_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

-- Assignment policies
CREATE POLICY "Patients can view own assignments"
  ON patient_clinician_assignments
  FOR SELECT
  USING (patient_id::text = auth.uid()::text);

CREATE POLICY "Clinicians can view own assignments"
  ON patient_clinician_assignments
  FOR SELECT
  USING (clinician_id::text = auth.uid()::text);

CREATE POLICY "Clinicians can create assignments"
  ON patient_clinician_assignments
  FOR INSERT
  WITH CHECK (clinician_id::text = auth.uid()::text);

-- Clinical notes policies
CREATE POLICY "Clinicians can manage notes for assigned patients"
  ON clinical_notes
  FOR ALL
  USING (
    clinician_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM patient_clinician_assignments pca
      WHERE pca.patient_id = clinical_notes.patient_id
      AND pca.clinician_id::text = auth.uid()::text
      AND pca.status = 'active'
    )
  );

-- Intervention plans policies
CREATE POLICY "Clinicians can manage intervention plans"
  ON intervention_plans
  FOR ALL
  USING (
    clinician_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM patient_clinician_assignments pca
      WHERE pca.patient_id = intervention_plans.patient_id
      AND pca.clinician_id::text = auth.uid()::text
      AND pca.status = 'active'
    )
  );

CREATE POLICY "Patients can view own intervention plans"
  ON intervention_plans
  FOR SELECT
  USING (patient_id::text = auth.uid()::text);

-- Alerts policies
CREATE POLICY "Users can manage own alerts"
  ON user_alerts
  FOR ALL
  USING (user_id::text = auth.uid()::text);

-- Create indexes
CREATE INDEX idx_assignments_patient_id ON patient_clinician_assignments(patient_id);
CREATE INDEX idx_assignments_clinician_id ON patient_clinician_assignments(clinician_id);
CREATE INDEX idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_clinician_id ON clinical_notes(clinician_id);
CREATE INDEX idx_intervention_plans_patient_id ON intervention_plans(patient_id);
CREATE INDEX idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX idx_user_alerts_unread ON user_alerts(user_id, is_read) WHERE is_read = false;