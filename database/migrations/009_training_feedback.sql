-- Migration: Training Feedback Storage
-- Stores user feedback on AI-generated replies for model improvement

CREATE TABLE IF NOT EXISTS training_feedback (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES social_leads(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  original_reply TEXT,
  improved_reply TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  incorporated BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_training_feedback_lead ON training_feedback(lead_id);
CREATE INDEX idx_training_feedback_created ON training_feedback(created_at DESC);
CREATE INDEX idx_training_feedback_reviewed ON training_feedback(reviewed) WHERE NOT reviewed;

COMMENT ON TABLE training_feedback IS 'Stores training feedback from users to improve AI reply generation';
COMMENT ON COLUMN training_feedback.feedback_text IS 'User feedback on what to improve';
COMMENT ON COLUMN training_feedback.original_reply IS 'AI-generated reply before feedback';
COMMENT ON COLUMN training_feedback.improved_reply IS 'AI-generated reply after incorporating feedback';
COMMENT ON COLUMN training_feedback.reviewed IS 'Whether feedback has been reviewed for model training';
COMMENT ON COLUMN training_feedback.incorporated IS 'Whether feedback has been incorporated into model training';
