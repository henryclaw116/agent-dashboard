-- Migration 014: Add approved tracking columns
-- Purpose: Track when leads are approved and by whom for training data

ALTER TABLE social_leads
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);

-- Add index for filtering approved leads
CREATE INDEX IF NOT EXISTS idx_social_leads_approved_at ON social_leads(approved_at) WHERE approved_at IS NOT NULL;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_social_leads_status_approved ON social_leads(status) WHERE status = 'APPROVED';
