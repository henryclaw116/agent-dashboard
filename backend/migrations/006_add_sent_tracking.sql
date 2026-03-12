-- Add sent tracking columns to social_leads table
-- This allows tracking when/how leads were manually sent to social platforms

ALTER TABLE social_leads 
ADD COLUMN IF NOT EXISTS stage6_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS stage6_sent_manually BOOLEAN DEFAULT false;

-- Create index for querying sent leads
CREATE INDEX IF NOT EXISTS idx_social_leads_sent_at ON social_leads(stage6_sent_at);

-- Comment
COMMENT ON COLUMN social_leads.stage6_sent_at IS 'Timestamp when reply was posted to social platform';
COMMENT ON COLUMN social_leads.stage6_sent_manually IS 'True if manually copy-pasted, false if auto-sent via API';
