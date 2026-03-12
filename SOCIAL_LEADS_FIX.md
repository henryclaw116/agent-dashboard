# Social Leads Pipeline Stats Fix

## Problem
Tony noticed the lead count numbers in the Social Media tab weren't updating or may be inaccurate.

## Root Cause
1. **Wrong Column Names**: The `/api/social-leads/stats` endpoint was querying columns that don't exist in the database (`response_status`, `lead_score`)
2. **Wrong Endpoint Used**: Frontend was calling `/social-leads?stage=${selectedStage}` but not getting stats back
3. **No Stage Filtering**: The API didn't support filtering by pipeline stage

## Database Schema (Actual)
The `social_leads` table uses these columns:
- `stage1_filter_result` - Scanner result ('KEEP' or 'REJECT')
- `stage2_score` - Scorer result (numeric score)
- `stage3_landing_page` - Router output (landing page URL)
- `stage4_reply_text` - Writer output (draft reply)
- `stage5_final_status` - Dedup result ('APPROVED', 'REJECTED', etc.)
- `stage6_bitly_link` - Tracker output (shortened link)
- `stage6_ready_for_dashboard` - Ready for Tony's approval

## Fixes Applied

### Backend (`backend/src/routes/socialLeads.routes.ts`)

**1. Updated `/api/social-leads/stats` endpoint:**
```typescript
// Now counts leads by actual pipeline stage columns
SELECT
  COUNT(*) FILTER (WHERE stage1_filter_result = 'KEEP') as scanner,
  COUNT(*) FILTER (WHERE stage2_score IS NOT NULL) as scorer,
  COUNT(*) FILTER (WHERE stage3_landing_page IS NOT NULL) as router,
  COUNT(*) FILTER (WHERE stage4_reply_text IS NOT NULL) as writer,
  COUNT(*) FILTER (WHERE stage5_final_status = 'APPROVED') as dedup,
  COUNT(*) FILTER (WHERE stage6_bitly_link IS NOT NULL OR stage6_ready_for_dashboard = true) as tracker,
  COUNT(*) as total
FROM social_leads
```

**2. Updated `/api/social-leads` GET endpoint:**
- Added `stage` query parameter (scanner, scorer, router, writer, dedup, tracker, all)
- Filters leads based on which pipeline stage they've completed
- Returns stage counts in response (`stats` object)
- Fixed column references (`stage2_score` instead of `lead_score`, etc.)

## Expected Behavior After Fix

### Lead Counts Update Every 10 Seconds
The LeadPipelineSection component auto-refreshes every 10 seconds:
```typescript
useEffect(() => {
  loadLeads();
  const interval = setInterval(loadLeads, 10000); // Every 10s
  return () => clearInterval(interval);
}, [selectedStage]);
```

### Accurate Stage Counts
Each stage box shows the number of leads that have completed that stage:
- **Scanner**: Leads with `stage1_filter_result = 'KEEP'`
- **Scorer**: Leads with a score (`stage2_score IS NOT NULL`)
- **Router**: Leads with a landing page assigned (`stage3_landing_page IS NOT NULL`)
- **Writer**: Leads with a draft reply (`stage4_reply_text IS NOT NULL`)
- **Dedup**: Leads approved after dedup (`stage5_final_status = 'APPROVED'`)
- **Tracker**: Leads with Bitly link or ready for dashboard

## Testing

**1. Check stats endpoint:**
```bash
curl https://backend-production-a8dd.up.railway.app/api/social-leads/stats
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "scanner": 150,
    "scorer": 120,
    "router": 90,
    "writer": 75,
    "dedup": 60,
    "tracker": 50,
    "total": 150
  }
}
```

**2. Check filtered leads:**
```bash
curl "https://backend-production-a8dd.up.railway.app/api/social-leads?stage=scorer&limit=5"
```

Should return leads that have been scored + stats for all stages.

## Status

✅ **Backend Code Updated** (Committed: f0e7f6f)
⏳ **Railway Deployment** (In progress)
⏳ **Testing** (Waiting for deployment)

## Next Steps
1. Wait for Railway to finish deploying (~2-3 minutes)
2. Test the stats endpoint
3. Verify lead counts in Social Media tab
4. If still not working, check if database has any leads in it

## Notes
- The frontend component (`LeadPipelineSection.tsx`) is already set up correctly to display the stats
- No frontend changes needed
- The issue was purely backend SQL queries using wrong column names
