# Lead Scrapers Setup

## Overview

Two scrapers automatically find trading leads and feed them into your 6-stage pipeline:

1. **Brand24 Email Scraper** - Monitors inbox for Brand24 alerts
2. **StockTwits Scraper** - Searches StockTwits for trading discussions

Both scrapers insert leads into `social_leads` table, where your pipeline automatically processes them through all 6 stages.

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install imap mailparser axios
npm install --save-dev @types/imap @types/mailparser
```

### 2. Configure Email Access (for Brand24 emails)

Add to `backend/.env`:

```env
# Email credentials (for Brand24 alerts)
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**For Gmail:**
1. Go to https://myaccount.google.com/apppasswords
2. Generate an app password
3. Use that password (not your real Gmail password)

**Email setup allows the scraper to:**
- Read Brand24 alert emails
- Extract social media mentions
- Parse post content, URLs, usernames
- Insert leads into pipeline

### 3. (Optional) Add StockTwits Token

StockTwits scraper works without authentication but has rate limits.

For higher limits, add to `.env`:
```env
STOCKTWITS_ACCESS_TOKEN=your-token-here
```

Get token: https://stocktwits.com/developers

---

## Running the Scrapers

### Option 1: One-Time Run

```bash
cd backend

# Run both scrapers once
npx ts-node src/scripts/run-lead-scrapers.ts

# Or run individually:
npx ts-node src/scripts/brand24-email-scraper.ts
npx ts-node src/scripts/stocktwits-scraper.ts
```

### Option 2: Continuous Mode (Every 10 Minutes)

```bash
cd backend
npx ts-node src/scripts/run-lead-scrapers.ts --continuous
```

This runs both scrapers every 10 minutes automatically.

### Option 3: Deploy to Railway (Best for Production)

Add a new process to Railway that runs continuously:

1. **Go to Railway** dashboard
2. **Add new service** (or update existing backend)
3. **Add start command**:
   ```
   npx ts-node src/scripts/run-lead-scrapers.ts --continuous
   ```
4. **Set as background worker** (not web server)

Or use Railway's cron feature to run every 10 minutes.

---

## What the Scrapers Do

### Brand24 Email Scraper

**Monitors:** Inbox for emails from `brand24.com`

**Extracts:**
- Platform (Reddit, Twitter, etc.)
- Username
- Post content
- Post URL
- Timestamp

**Filters:**
- Only processes unread emails
- Skips emails older than 7 days
- Marks emails as read after processing

**Output:** Inserts leads with `status='PENDING'` into `social_leads` table

**Expected volume:** Depends on your Brand24 alerts (could be 10-100+ per day)

---

### StockTwits Scraper

**Monitors:**
- Trending stream
- Symbol streams (SPY, QQQ, IWM, TLT, GLD)
- Searches for keywords

**Keywords tracked:**
- "options trading"
- "credit spreads"
- "losing money"
- "day trading"
- "options strategy"
- "premium seller"
- "theta gang"
- "iron condor"
- "vertical spread"

**Filters:**
- Must match trading keywords
- Bonus points for frustration keywords
- Bonus points for questions
- Bonus points for engagement (likes, replies)
- Minimum relevance score: 50/100

**Output:** Inserts qualified leads into `social_leads` table

**Expected volume:** 20-50 qualified leads per day

---

## How Leads Flow Through Pipeline

1. **Scraper inserts lead** → `social_leads` table with `status='PENDING'`

2. **Scanner Agent** (auto-triggered):
   - Reads new leads
   - Filters spam/noise (80% rejection rate)
   - Updates `stage1_status` to 'KEEP' or 'REJECT'

3. **Scorer Agent** (auto-triggered for KEEP leads):
   - Scores lead quality (0-100)
   - Updates `stage2_score`, `stage2_pain_category`
   - Filters out leads < 70 score

4. **Router Agent** (auto-triggered for 70+ scores):
   - Assigns landing page based on pain category
   - Updates `stage3_landing_url`

5. **Writer Agent** (auto-triggered):
   - Drafts 4-sentence reply
   - Updates `stage4_reply_text`

6. **Dedup Agent** (auto-triggered):
   - Checks for duplicate users (30-day window)
   - Updates `stage5_status` to 'APPROVED' or 'DUPLICATE'

7. **Tracker Agent** (auto-triggered for approved):
   - Creates Bitly short link
   - Inserts tracking params
   - Updates `stage6_short_link`

8. **Your Dashboard**:
   - See all leads in Social Media → Lead Pipeline
   - Click Details to review
   - Edit draft if needed
   - Click "Approve & Send" when ready

---

## Monitoring

### Check Scraper Output

```bash
cd backend
npx ts-node src/scripts/run-lead-scrapers.ts
```

You should see:
```
📧 === Running Brand24 Email Scraper ===
✅ Connected to email server
📬 Inbox opened: 45 total messages
📨 Found 3 Brand24 email(s)
  ✓ Stored: reddit - trader_username

📊 === Running StockTwits Scraper ===
🔥 Checking trending stream...
  Found 30 trending messages
  ✓ Stored: @username (relevance: 75)

✅ === Scrapers Complete - 12s ===
```

### Check Leads in Dashboard

1. **Go to**: https://rlt-agent-dashboard.vercel.app/social-media
2. **Click "Lead Pipeline" tab**
3. **Should see counts increasing**:
   - Scanner: New leads appearing
   - Scorer: Leads moving through
   - Router/Writer/Dedup/Tracker: Processing in order

### Check Database Directly

```bash
# See total leads
curl https://backend-production-a8dd.up.railway.app/api/social-leads/stats

# See recent leads
curl https://backend-production-a8dd.up.railway.app/api/social-leads?limit=10
```

---

## Troubleshooting

### "Failed to connect to email server"

**Fix:**
1. Check EMAIL_USER and EMAIL_PASSWORD in .env
2. For Gmail, make sure you're using an App Password (not your real password)
3. Enable IMAP in Gmail settings

### "No new Brand24 emails found"

**Reasons:**
- All Brand24 emails have been processed (marked as read)
- No new alerts in last 7 days
- Emails not from "brand24.com" domain

**Solutions:**
- Check your inbox manually - are there Brand24 emails?
- Mark some as unread to test
- Adjust the search date range in the code (currently 7 days)

### "StockTwits rate limit"

**Fix:**
- Add STOCKTWITS_ACCESS_TOKEN to .env
- Increase delay between requests (currently 1 second)
- Reduce number of symbols checked

### "Duplicate key errors"

**Explanation:** This is normal! The scrapers use `ON CONFLICT DO NOTHING` to skip leads that have already been inserted.

**Why it happens:**
- Same post found multiple times (e.g., mentioned in multiple Brand24 emails)
- StockTwits scraper runs twice and finds same tweets
- This is by design - prevents duplicate leads

---

## Scaling Up

### Increase Scraper Frequency

Edit `run-lead-scrapers.ts`:
```typescript
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes instead of 10
```

### Add More StockTwits Symbols

Edit `stocktwits-scraper.ts`:
```typescript
await this.scrapeSymbols([
  'SPY', 'QQQ', 'IWM', 'TLT', 'GLD',
  'TSLA', 'AAPL', 'NVDA', 'AMD', 'MSFT'  // Add more
]);
```

### Add More Keywords

Edit `stocktwits-scraper.ts`:
```typescript
private readonly KEYWORDS = [
  'options trading',
  'credit spreads',
  // Add more:
  'wheel strategy',
  'covered calls',
  'cash secured puts'
];
```

### Monitor Multiple Email Accounts

Create separate scraper instances for different email accounts (e.g., one for Brand24, one for Mention.com)

---

## Status

✅ **Brand24 Email Scraper**: Ready (needs email credentials)  
✅ **StockTwits Scraper**: Ready (works without token)  
✅ **Scheduler**: Ready (runs every 10 minutes)  
⏳ **Email Credentials**: Need to be added to .env  
⏳ **Deploy to Railway**: Optional (for 24/7 operation)

---

## Next Steps

1. **Add email credentials** to backend/.env
2. **Run scrapers once** to test: `npx ts-node src/scripts/run-lead-scrapers.ts`
3. **Check dashboard** - see leads appearing
4. **Deploy to Railway** for continuous operation (optional)

Once running, you should see:
- **20-100 new leads per day** flowing into the pipeline
- **Scanner** filtering 80% (keeping 20-40 leads)
- **Scorer** passing ~15-30 high-quality leads
- **Writer** creating draft replies for all qualified leads
- **Dashboard** showing leads ready for your approval

🚀 **Your pipeline will be fully automated!**
