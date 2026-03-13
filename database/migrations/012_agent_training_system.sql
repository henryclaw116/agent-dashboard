-- Agent Training System Migration
-- Creates tables to store agent training history and auto-generated prompts

-- Training history table
CREATE TABLE IF NOT EXISTS agent_training_history (
  id SERIAL PRIMARY KEY,
  writer_prompt TEXT,
  scorer_guidelines TEXT,
  router_rules TEXT,
  reply_lessons_json JSONB,
  quality_lessons_json JSONB,
  training_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT DEFAULT 'system'
);

-- Indexes for fast queries
CREATE INDEX idx_agent_training_history_date ON agent_training_history(training_date DESC);
CREATE INDEX idx_agent_training_history_created ON agent_training_history(created_at DESC);

-- Lead quality training table (if not exists from previous feature)
CREATE TABLE IF NOT EXISTS lead_quality_training (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES social_leads(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  lead_score INTEGER,
  pain_category TEXT,
  selected_landing_page TEXT,
  post_text TEXT,
  platform TEXT,
  final_status TEXT,
  created_by TEXT DEFAULT 'Tony',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_quality_training_lead_id ON lead_quality_training(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_quality_training_created ON lead_quality_training(created_at DESC);

-- Reply training feedback table (if not exists from previous feature)  
CREATE TABLE IF NOT EXISTS training_feedback (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES social_leads(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  original_reply TEXT,
  improved_reply TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_feedback_lead_id ON training_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_training_feedback_created ON training_feedback(created_at DESC);

-- Comments
COMMENT ON TABLE agent_training_history IS 'Stores automated agent training results and improved prompts';
COMMENT ON TABLE lead_quality_training IS 'Stores user feedback about lead quality for training scorer/router agents';
COMMENT ON TABLE training_feedback IS 'Stores user feedback about reply quality for training writer agent';
