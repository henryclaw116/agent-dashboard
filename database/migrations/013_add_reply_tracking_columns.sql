-- Migration 013: Add reply tracking columns for auto-posting
-- Created: 2026-03-13
-- Purpose: Track reply URLs and screenshots after auto-posting

-- Add reply tracking columns if they don't exist
ALTER TABLE social_leads 
ADD COLUMN IF NOT EXISTS reply_url TEXT,
ADD COLUMN IF NOT EXISTS reply_screenshot_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_leads_reply_url ON social_leads(reply_url) WHERE reply_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_leads_sent_at ON social_leads(sent_at) WHERE sent_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN social_leads.reply_url IS 'URL of the posted reply (e.g., https://reddit.com/r/options/comments/abc123/)';
COMMENT ON COLUMN social_leads.reply_screenshot_url IS 'CDN URL of screenshot showing the posted reply';
