/*
  # Create vector embeddings and AI analysis tables

  1. New Tables
    - `journal_embeddings`
      - `id` (uuid, primary key)
      - `journal_entry_id` (uuid, foreign key)
      - `embedding` (vector)
      - `model_version` (text)
      - `created_at` (timestamp)
    
    - `ai_analysis_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `session_type` (text)
      - `input_data` (jsonb)
      - `analysis_results` (jsonb)
      - `model_confidence` (float)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate access policies
*/

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create journal embeddings table
CREATE TABLE IF NOT EXISTS journal_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding vector(384), -- 384 dimensions for sentence-transformers
  model_version text DEFAULT 'gte-small',
  created_at timestamptz DEFAULT now()
);

-- Create AI analysis sessions table
CREATE TABLE IF NOT EXISTS ai_analysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type text NOT NULL, -- 'facial', 'speech', 'text', 'combined'
  input_data jsonb NOT NULL DEFAULT '{}',
  analysis_results jsonb NOT NULL DEFAULT '{}',
  model_confidence float CHECK (model_confidence >= 0 AND model_confidence <= 1),
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create facial expression analysis table
CREATE TABLE IF NOT EXISTS facial_expressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES ai_analysis_sessions(id),
  image_data text, -- base64 encoded image
  emotions jsonb NOT NULL DEFAULT '{}',
  dominant_emotion text,
  confidence_score float,
  landmarks jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create speech analysis table
CREATE TABLE IF NOT EXISTS speech_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES ai_analysis_sessions(id),
  audio_transcript text,
  speech_features jsonb DEFAULT '{}',
  emotional_tone jsonb DEFAULT '{}',
  speech_rate float,
  pause_patterns jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE journal_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facial_expressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speech_analysis ENABLE ROW LEVEL SECURITY;

-- Embeddings policies
CREATE POLICY "Users can read own embeddings"
  ON journal_embeddings
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "System can manage embeddings"
  ON journal_embeddings
  FOR ALL
  USING (true); -- Allow system operations

-- AI analysis sessions policies
CREATE POLICY "Users can manage own analysis sessions"
  ON ai_analysis_sessions
  FOR ALL
  USING (user_id::text = auth.uid()::text);

-- Facial expressions policies
CREATE POLICY "Users can manage own facial expressions"
  ON facial_expressions
  FOR ALL
  USING (user_id::text = auth.uid()::text);

-- Speech analysis policies
CREATE POLICY "Users can manage own speech analysis"
  ON speech_analysis
  FOR ALL
  USING (user_id::text = auth.uid()::text);

-- Create indexes
CREATE INDEX idx_journal_embeddings_user_id ON journal_embeddings(user_id);
CREATE INDEX idx_journal_embeddings_journal_entry_id ON journal_embeddings(journal_entry_id);
CREATE INDEX idx_ai_analysis_sessions_user_id ON ai_analysis_sessions(user_id);
CREATE INDEX idx_ai_analysis_sessions_type ON ai_analysis_sessions(session_type);
CREATE INDEX idx_facial_expressions_user_id ON facial_expressions(user_id);
CREATE INDEX idx_speech_analysis_user_id ON speech_analysis(user_id);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_journal_entries(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  journal_entry_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id,
    je.journal_entry_id,
    j.content,
    1 - (je.embedding <=> query_embedding) AS similarity
  FROM journal_embeddings je
  JOIN journal_entries j ON j.id = je.journal_entry_id
  WHERE 
    (target_user_id IS NULL OR je.user_id = target_user_id)
    AND 1 - (je.embedding <=> query_embedding) > match_threshold
  ORDER BY je.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;