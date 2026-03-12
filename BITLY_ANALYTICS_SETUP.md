# Bitly Analytics Setup

## Overview
The Social Media Pipeline now includes **Bitly Link Analytics** to track clicks on all your shortened links in real-time.

## Features

### ✅ Real-Time Analytics Dashboard
- **Clicks Today**: How many people clicked your links today
- **Clicks This Week**: 7-day rolling total
- **Total Links**: How many Bitly links you've created
- **Active Links**: Links that have received clicks this week

### ✅ Top Performing Links
- See which links are getting the most clicks
- Compare today's clicks vs. this week's total
- Direct links to open the destination

### ✅ Click Trends
- Visual bar chart showing daily clicks over the last 30 days
- Identify high-traffic days and patterns
- Spot which days your outreach performs best

### ✅ Auto-Refresh
- Dashboard refreshes automatically every 5 minutes
- Manual refresh button available
- Always see current data

---

## Setup Instructions

### 1. Get Your Bitly Access Token

1. **Log in to Bitly**: https://app.bitly.com/
2. **Go to Settings** → **API** → **Access Tokens**
3. **Generate New Token**
   - Name it: "RLT Agent Dashboard"
   - Enable all permissions
4. **Copy the token** (starts with something like `d3a7f9c8b2e1...`)

### 2. Add Token to Railway

1. **Go to Railway Dashboard**: https://railway.app
2. **Select your backend project**: `rlt-agent-dashboard-backend`
3. **Go to Variables tab**
4. **Add new variable**:
   - Key: `BITLY_ACCESS_TOKEN`
   - Value: (paste your Bitly token)
5. **Save** → Railway will automatically redeploy with the token

### 3. Verify It's Working

1. **Go to dashboard**: https://rlt-agent-dashboard.vercel.app/social-media
2. **Click "Link Analytics" tab**
3. **Should see**:
   - Summary cards with click counts
   - Top performing links table
   - Daily trends chart

---

## API Endpoints

The following endpoints are now available:

### Get Summary Stats
```
GET /api/bitly-analytics/summary
```
Returns:
- clicks_today
- clicks_this_week
- total_links
- active_links
- top_links (top 10 by today's clicks)

### Get Trends
```
GET /api/bitly-analytics/trends
```
Returns daily click counts for the last 30 days.

### Get Link Details
```
GET /api/bitly-analytics/link/:linkId
```
Returns detailed analytics for a specific link:
- Total clicks
- Referrers (where clicks came from)
- Geographic data (countries)
- Click timeline

---

## What Data Is Tracked

### From Your Database
- All Bitly short links from `social_leads.stage6_short_link`
- Links are automatically discovered and tracked

### From Bitly API
- **Click counts** by day/week/month
- **Referrers**: Where people clicked from (Reddit, Twitter, etc.)
- **Geographic data**: Which countries your clicks come from
- **Device data**: Desktop vs mobile clicks
- **Click timeline**: Hour-by-hour breakdown

---

## Use Cases

### 1. Measure Campaign Performance
- See which social posts are driving the most traffic
- Identify your best-performing platforms (Reddit, Twitter, etc.)

### 2. Optimize Posting Times
- Check the trends chart to see which days get the most clicks
- Schedule future posts for high-traffic days

### 3. A/B Test Landing Pages
- Compare click-through rates for different landing pages
- See which pain categories drive the most engagement

### 4. Track Conversion Funnel
- Clicks today → leads today
- Calculate your click-to-trial conversion rate
- Measure ROI on social outreach

---

## Troubleshooting

### "Analytics Unavailable" Message

**Problem**: Dashboard shows "Bitly analytics are not configured"

**Solution**:
1. Check that `BITLY_ACCESS_TOKEN` is set in Railway
2. Make sure the token is valid (test it at https://dev.bitly.com/)
3. Redeploy Railway backend after adding the token

### No Data Showing

**Problem**: Dashboard shows 0 clicks even though you have links

**Possible causes**:
1. **Links haven't been clicked yet** - Share them to get data!
2. **Token permissions** - Make sure your Bitly token has "read" permission
3. **Link format** - Verify links in database are complete (e.g., `https://bit.ly/abc123`)

### Slow Loading

**Problem**: Analytics take a long time to load

**Explanation**: The first load fetches data from Bitly for every link you have. This can take 30-60 seconds if you have many links.

**Solutions**:
- Data is cached for 5 minutes after first load
- Manual refresh available
- Consider implementing server-side caching for faster loads

---

## Future Enhancements

Planned features:
- [ ] Click notifications (Slack/Discord alerts when you get clicks)
- [ ] Conversion tracking (clicks that became trials)
- [ ] Custom date ranges (last 7 days, last 30 days, custom)
- [ ] Export data to CSV
- [ ] Comparison charts (this week vs. last week)
- [ ] Geographic heatmap
- [ ] Real-time click feed (see clicks as they happen)

---

## Status

✅ **Backend API**: Deployed to Railway  
✅ **Frontend Dashboard**: Deployed to Vercel  
⏳ **Bitly Token**: Needs to be added to Railway environment

**Once you add the token, the analytics will start working immediately!**
