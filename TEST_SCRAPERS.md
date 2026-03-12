# Quick Test - Lead Scrapers

## Test StockTwits Scraper (Works Right Now!)

The StockTwits scraper doesn't need any setup - it can run immediately:

```bash
cd C:\Users\reall\.openclaw\workspace\agent-dashboard\backend
npx ts-node src/scripts/stocktwits-scraper.ts
```

**You should see:**
```
📊 Starting StockTwits Scraper...

🔥 Checking trending stream...
  Found 30 trending messages
  ✓ Stored: @trader123 (relevance: 75)
  ✓ Stored: @daytrader99 (relevance: 82)

📈 Checking trading-related symbols...
  SPY: 30 messages
  ✓ Stored: @options_guy (relevance: 90)
  QQQ: 30 messages
  ...

✅ Scraper finished successfully
```

**Then check dashboard:**
1. Go to: https://rlt-agent-dashboard.vercel.app/social-media
2. Click "Lead Pipeline"
3. **Scanner number should jump from 1 to 20+!**

---

## Test Brand24 Email Scraper (Needs Email Setup)

### Step 1: Add Email Credentials

Edit `backend/.env` and add:

```env
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

**For Gmail app password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password
4. Paste into EMAIL_PASSWORD (no spaces)

### Step 2: Run Scraper

```bash
cd C:\Users\reall\.openclaw\workspace\agent-dashboard\backend
npx ts-node src/scripts/brand24-email-scraper.ts
```

**You should see:**
```
🔍 Starting Brand24 Email Scraper...

✅ Connected to email server

📬 Inbox opened: 142 total messages

📨 Found 5 Brand24 email(s)

📧 Processing email: New mention from Reddit
  📊 Found 3 mention(s)
  ✓ Stored: reddit - trading_user
  ✓ Stored: reddit - options_newbie
  ✓ Stored: reddit - frustrated_trader

✅ Finished processing emails
```

---

## Test Both (Recommended)

```bash
cd C:\Users\reall\.openclaw\workspace\agent-dashboard\backend
npx ts-node src/scripts/run-lead-scrapers.ts
```

Runs both scrapers in parallel.

---

## Expected Results

### Before Running Scrapers:
- **Scanner**: 1 lead
- **Scorer**: 1 lead
- **Router**: 1 lead
- **Writer**: 1 lead
- **Dedup**: 0 leads
- **Tracker**: 0 leads

### After Running StockTwits Scraper:
- **Scanner**: 20-40 leads (depending on how many qualify)
- **Scorer**: 1 lead (pipeline processes automatically, but takes time)
- **Router**: 1 lead
- **Writer**: 1 lead
- **Dedup**: 0 leads
- **Tracker**: 0 leads

**Why are the other stages still at 1?**

The 6-stage pipeline processes leads **one at a time** through each stage. The agents need to be running to process the queue.

### To See Pipeline Process All Leads:

You need the 6 agents running:
1. Social Scanner
2. Social Scorer
3. Social Router
4. Social Writer
5. Social Dedup
6. Social Tracker

Each agent picks up tasks from the queue and processes them.

**For now**, the scrapers will:
- ✅ Insert leads into database
- ✅ Show in the Scanner count
- ⏳ Wait for agents to process them

---

## Quick Win: Run StockTwits Scraper NOW

Since StockTwits scraper doesn't need any setup:

```bash
cd C:\Users\reall\.openclaw\workspace\agent-dashboard\backend
npx ts-node src/scripts/stocktwits-scraper.ts
```

**Then refresh your dashboard** and watch Scanner count go up! 🚀

---

## Deploy for Continuous Operation

### Option 1: Run Locally (Testing)

```bash
cd C:\Users\reall\.openclaw\workspace\agent-dashboard\backend
npx ts-node src/scripts/run-lead-scrapers.ts --continuous
```

Runs every 10 minutes. Keep terminal open.

### Option 2: Deploy to Railway (Production)

Add a new Railway service:
- **Start command**: `npx ts-node src/scripts/run-lead-scrapers.ts --continuous`
- **Service type**: Worker (not web)
- Runs 24/7 automatically

---

## Troubleshooting

### "Cannot find module 'imap'"

**Fix:**
```bash
cd backend
npm install imap mailparser
```

### StockTwits: "429 Too Many Requests"

**Normal!** StockTwits has rate limits. The scraper:
- Waits 1 second between symbol requests
- Only checks 5 symbols at a time
- Should complete in ~10 seconds

If you hit rate limits often, add a StockTwits API token to `.env`:
```env
STOCKTWITS_ACCESS_TOKEN=your-token
```

### Email Scraper: "Authentication failed"

**Fixes:**
1. Use Gmail **App Password**, not your regular password
2. Enable IMAP in Gmail settings: Settings → Forwarding and POP/IMAP → Enable IMAP
3. Double-check EMAIL_USER is your full email address

---

## Summary

- ✅ **StockTwits scraper**: Ready to run NOW (no setup needed)
- ⏳ **Brand24 scraper**: Needs email credentials in .env
- ✅ **Both will insert leads** into database
- ⏳ **Pipeline agents** need to be running to process leads through all stages
- ✅ **Dashboard will show** leads accumulating in Scanner stage

**Quick test:** Run StockTwits scraper → See Scanner number jump from 1 to 20+! 🎉
