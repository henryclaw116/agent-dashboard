-- Migration: Add READY_TO_SEND status and fix pipeline
-- Run this to create the new "Ready to Send" stage

-- First, let's see what we're working with
SELECT 'Current Tracker Leads' as info, status, COUNT(*) 
FROM social_leads 
WHERE stage6_short_link IS NOT NULL 
GROUP BY status;

-- Update leads in Tracker stage (have tracking link) that are PENDING or APPROVED
-- These should be in "Ready to Send" status
UPDATE social_leads
SET status = 'READY_TO_SEND'
WHERE stage6_short_link IS NOT NULL 
  AND status IN ('PENDING', 'APPROVED');

-- Check result
SELECT 'After Update' as info, status, COUNT(*) 
FROM social_leads 
WHERE stage6_short_link IS NOT NULL 
GROUP BY status;
