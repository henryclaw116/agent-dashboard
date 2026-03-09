# Agent Dashboard - Quick Deployment Guide

## ✅ Frontend Already Live!
**URL:** https://rlt-agent-dashboard.vercel.app

## 🚀 Deploy Backend (5 minutes)

### Option 1: Render (Recommended - Free Tier)

1. **Go to Render:** https://render.com/
2. **Sign up/Login** (can use GitHub, GitLab, or email)
3. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Choose "Build and deploy from a Git repository"
   - Connect your GitHub (or create new GitHub repo with code from `C:\Users\reall\.openclaw\workspace\agent-dashboard`)

4. **Configure:**
   - **Name:** `rlt-agent-dashboard-api`
   - **Region:** Oregon (or closest)
   - **Branch:** `master`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. **Create PostgreSQL Database:**
   - Click "New +" → "PostgreSQL"
   - **Name:** `rlt-dashboard-db`
   - **Plan:** Free
   - Copy the "Internal Database URL"

6. **Add Environment Variable:**
   - Go back to your Web Service
   - Go to "Environment" tab
   - Add: `DATABASE_URL` = (paste the database URL from step 5)
   - Add: `PORT` = `3001`
   - Add: `NODE_ENV` = `production`

7. **Deploy:** Click "Manual Deploy" → "Deploy latest commit"

### Option 2: Railway (Alternative - Free Tier)

1. **Go to Railway:** https://railway.app/
2. **Sign up with GitHub**
3. **New Project** → "Deploy from GitHub repo"
4. **Add PostgreSQL:** Click "+ New" → "Database" → "PostgreSQL"
5. **Configure backend:**
   - Select backend service
   - Add environment variables from PostgreSQL
   - Deploy

### After Backend is Live:

1. **Get Backend URL:** Copy the URL from Render (e.g., `https://rlt-agent-dashboard-api.onrender.com`)

2. **Update Frontend:**
   - Edit `frontend/src/api/api.ts`
   - Change `baseURL` to your backend URL
   - Redeploy frontend: `cd frontend && vercel --prod`

## 🔄 Alternative: Run Locally (Fastest for Testing)

1. **Start PostgreSQL locally** (or use free cloud database)
2. **Backend:**
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📊 Database Setup

After backend is deployed, initialize the database:

1. Go to your Render PostgreSQL dashboard
2. Click "Connect" → Copy psql command
3. Run the SQL from `database/schema.sql`
4. Run the SQL from `database/social-media-schema.sql`

---

**Need help?** Message me in Discord #dev-updates
