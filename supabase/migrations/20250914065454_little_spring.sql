/*
  # Create journal entries and mood tracking tables

  1. New Tables
    - `journal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `content` (text)
      - `mood_score` (integer, 1-100)
      - `emotions` (jsonb)
      - `sentiment_analysis` (jsonb)
      - `ai_insights` (text)
      - `created_at` (timestamp)
    
    - `mood_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `mood_score` (integer, 1-100)
      - `mood_type` (text)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for user data access
*/

-- Create journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  mood_score integer CHECK (mood_score >= 1 AND mood_score <= 100),
  emotions jsonb DEFAULT '{}',
  sentiment_analysis jsonb DEFAULT '{}',
  facial_analysis jsonb DEFAULT '{}',
  speech_analysis jsonb DEFAULT '{}',
  ai_insights text,
  ai_recommendations text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mood logs table
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_score integer NOT NULL CHECK (mood_score >= 1 AND mood_score <= 100),
  mood_type text NOT NULL,
  emotions jsonb DEFAULT '{}',
  notes text,
  location text,
  weather text,
  activity text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Journal entries policies
CREATE POLICY "Users can read own journal entries"
  ON journal_entries
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own journal entries"
  ON journal_entries
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Clinicians can read assigned patient entries"
  ON journal_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_clinician_assignments pca
      WHERE pca.patient_id = journal_entries.user_id
      AND pca.clinician_id::text = auth.uid()::text
    )
  );

-- Mood logs policies
CREATE POLICY "Users can manage own mood logs"
  ON mood_logs
  FOR ALL
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Clinicians can read assigned patient mood logs"
  ON mood_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_clinician_assignments pca
      WHERE pca.patient_id = mood_logs.user_id
      AND pca.clinician_id::text = auth.uid()::text
    )
  );

-- Create indexes
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at);
CREATE INDEX idx_mood_logs_user_id ON mood_logs(user_id);
CREATE INDEX idx_mood_logs_created_at ON mood_logs(created_at);