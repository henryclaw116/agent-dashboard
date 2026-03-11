# 💰 Financials Tab - User Guide

**Created:** March 10, 2026  
**Status:** ✅ Live and Ready  
**Location:** Dashboard → Financials tab

---

## 🎯 What It Does

Your **Financials tab** gives you a complete at-a-glance view of Real Life Trading's financial health:
- Monthly revenue, expenses, and profit
- MRR (Monthly Recurring Revenue) tracking
- Active subscriber count
- YTD (Year-to-Date) totals
- Visual charts showing 12-month trends
- Upload and track financial statements

---

## 📊 Dashboard Overview

### Key Metrics (4 Cards at Top)

1. **Monthly Revenue**
   - Total revenue for current month
   - MRR shown below
   - Blue dollar sign icon

2. **Net Profit**
   - Current month profit (Revenue - Expenses)
   - Profit margin percentage shown below
   - Green up arrow (profit) or red down arrow (loss)

3. **Active Subscribers**
   - Current subscription count
   - Churn rate shown below
   - Purple users icon

4. **YTD Profit**
   - Total profit for the year so far
   - YTD revenue shown below
   - Orange target icon

---

## 📈 Charts

### 1. Revenue vs Expenses (12 Months)
**Line chart** showing:
- Blue line = Revenue trend
- Red line = Expenses trend
- Green line = Net profit
- Helps spot patterns and growth

### 2. Expense Breakdown (This Month)
**Bar chart** showing where money goes:
- Red = Payroll
- Orange = Marketing
- Blue = Software/tools
- Gray = Other expenses

### 3. MRR Trend
**Line chart** tracking Monthly Recurring Revenue over time  
- Purple line showing subscription growth
- Critical metric for scaling to $300K/month

### 4. Recent Statements
**List** of last 5 uploaded financial documents
- File name and type
- Period (YYYY-MM)
- Status: Pending, Processing, or Complete

---

## 📤 Upload Statements

**Click "Upload Statement" button** (top right)

**Supported formats:**
- PDF (bank statements, invoices)
- CSV (transaction exports)
- Excel files (.xlsx, .xls)

**Upload limit:** 50MB per file

**What happens:**
1. File uploads to secure server storage
2. Status shows as "Pending"
3. (Future) AI agent can extract data automatically
4. File appears in "Recent Statements" list

---

## 📝 How to Add Monthly Metrics

**Currently:** You need to input metrics via API or update database directly

**Future:** Add a "+ Add Month" button to enter metrics through the UI

**Metrics to track each month:**

**Revenue:**
- Total revenue
- Subscription revenue (MRR × subscribers)
- One-time revenue (Premier upgrades, etc.)

**Expenses:**
- Payroll
- Marketing spend
- Software/tools
- Other expenses

**RLT-Specific:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue = MRR × 12)
- Active subscribers (AAP count)
- Churn rate (cancellations ÷ total subscribers × 100)

**Auto-calculated:**
- Net profit (Revenue - Expenses)
- Profit margin (Profit ÷ Revenue × 100)

---

## 🔢 Sample Month Entry (via API)

```bash
curl -X POST http://localhost:3002/api/financials/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2026-03",
    "revenue_total": 43000,
    "revenue_subscriptions": 43000,
    "revenue_one_time": 0,
    "expenses_total": 15000,
    "expenses_payroll": 8000,
    "expenses_marketing": 4000,
    "expenses_software": 2000,
    "expenses_other": 1000,
    "mrr": 43000,
    "arr": 516000,
    "active_subscribers": 158,
    "churn_rate": 5.2
  }'
```

System will auto-calculate:
- Net profit: $28,000
- Profit margin: 65.1%

---

## 💡 How to Use This Effectively

### Weekly Check-In (Monday mornings)
- Review current month metrics
- Check MRR trend
- Spot any unusual expense spikes
- Monitor churn rate

### Month-End Close (Last day of month)
- Upload final bank/Stripe statements
- Enter monthly metrics
- Review profit margin vs target
- Check progress toward $300K/month goal

### Strategic Planning
- Use 12-month trends to forecast
- Identify seasonal patterns
- Track expense creep
- Measure marketing ROI (revenue growth vs marketing spend)

---

## 🎯 Real Life Trading Specific Metrics

### Current State (as of Mar 2026)
- MRR: ~$43K ($275/month × ~158 subscribers)
- ARR: ~$516K
- Target: $300K/month ($3.6M/year)

### Growth Tracking
**The Financials tab helps you track:**
- Trial → AAP conversion rate (affects subscriber growth)
- Churn reduction impact (every 1% = more MRR)
- Revenue per subscriber trends
- Marketing efficiency (cost per new subscriber)

### Key Milestones to Watch
- MRR hits $50K
- MRR hits $100K
- MRR hits $200K
- MRR hits $300K (🎯 GOAL!)

---

## 🔮 Future Enhancements

**Planned features:**
1. **Manual entry form** - Add metrics directly in the UI
2. **Statement parsing** - AI extracts data from uploaded files
3. **Budget tracking** - Set targets and compare actual vs planned
4. **Cash flow forecast** - Project next 3-6 months
5. **Financial goals** - Track progress toward $300K/month
6. **Expense alerts** - Notify when spending exceeds budget
7. **Subscriber LTV** - Calculate lifetime value per customer
8. **Export to CSV** - Download monthly reports

---

## 🚀 Quick Start

**To see it working NOW:**

1. **Open dashboard:** http://localhost:5173 (or Vercel URL)
2. **Click "Financials" tab** (💰 icon in nav)
3. **Upload a statement** to test the upload feature
4. **View the charts** (empty until you add monthly data)

**To populate with data:**
- Use the API endpoint shown above to add March 2026 data
- Repeat for Feb, Jan, etc. to build 12-month trend
- Upload actual bank statements for record-keeping

---

## 📁 Files & Database

**Backend API:** `backend/src/routes/financials.routes.ts`  
**Frontend Page:** `frontend/src/pages/Financials.tsx`  
**Database Tables:**
- `financial_statements` - Uploaded files
- `monthly_metrics` - Revenue/expense tracking
- `transactions` - Individual line items
- `financial_goals` - Target tracking

**Uploads stored:** `backend/uploads/financials/`

---

## ✅ What's Working Now

- ✅ Financials tab visible in navigation
- ✅ Dashboard displays metrics (when data exists)
- ✅ Upload statements (PDF, CSV, Excel)
- ✅ 4 key metric cards
- ✅ 3 interactive charts (Chart.js)
- ✅ Recent statements list
- ✅ API endpoints functional
- ✅ Database tables created
- ✅ Currency formatting ($43,000)
- ✅ Percentage formatting (65.1%)

---

## 🎉 Summary

You now have a **professional financial dashboard** that:
- Tracks RLT's path to $300K/month
- Visualizes revenue and expense trends
- Monitors MRR and subscriber growth
- Stores all financial statements
- Provides at-a-glance business health metrics

**The Financials tab is live and ready to use!** 📊

---

**Questions?** Just ask in Discord and I'll help you set it up with real data!
