-- Add columns for reply tracking
ALTER TABLE social_leads 
ADD COLUMN IF NOT EXISTS stage6_reply_url TEXT,
ADD COLUMN IF NOT EXISTS stage6_screenshot TEXT,
ADD COLUMN IF NOT EXISTS stage6_error TEXT;

-- Add index on status for quick filtering
CREATE INDEX IF NOT EXISTS idx_social_leads_status ON social_leads(status);
