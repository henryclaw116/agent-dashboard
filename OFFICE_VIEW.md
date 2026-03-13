# 🏢 Office View - 2D Pixel Art Agent Visualization

**Status:** ✅ DEPLOYED & LIVE

**URL:** https://rlt-agent-dashboard.vercel.app/office

---

## Overview

Office View is a fun, visual way to watch your agents working in real-time. Think of it like watching a 2D pixel art office where each agent is represented by an emoji character doing their job.

---

## Features

### 1. 2D Pixel Art Office Layout
- **14x14 grid** office space
- Checkered floor pattern
- Desks for individual agents
- Conference table for collaborating agents
- Plants and decorations

### 2. Agent Characters
- Each agent represented by an emoji sprite
- Position changes based on activity:
  - **At desk** - Working on tasks
  - **At table** - Collaborating with other agents
- **Sprites change** based on current task:
  - 🧑‍💼 Idle
  - 💻 Working
  - 🔍 Scanning
  - ✍️ Writing
  - 📊 Analyzing
  - 💬 Talking/Messaging
  - ⚠️ Error

### 3. Agent Information
Each agent shows:
- **Name** (under character)
- **2-word task summary** (under name)
- **Status indicator** (green dot when busy)

### 4. Live Activity Feed (Right Side)
- Real-time scrolling activity log
- Shows what agents are doing
- Color-coded by status:
  - 🟢 Completed (green)
  - 🔵 Running (blue)
  - 🔴 Failed (red)
  - ⚪ Other (gray)
- Timestamps for each activity
- Auto-updates every 5 seconds

### 5. Agent Status Bar (Bottom)
- Overview of all agents
- Health score indicator
- Current status for each agent
- Quick visual health check

---

## Agent Positions

### Social Media Pipeline (Left Side)
```
Row 2: Marketing AI, Operations Manager
Row 5: Scanner, Scorer, Router, Writer
Row 8: Dedup, Tracker, Pipeline Monitor
```

### Conference Table (Bottom)
```
Row 11: Sales, Support, Analytics (collaborating)
```

---

## Task Summaries

**2-word task descriptions shown under each agent:**

- **Scanning Posts** - Social Scanner finding new posts
- **Scoring Leads** - Social Scorer evaluating quality
- **Routing Leads** - Social Router assigning landing pages
- **Writing Replies** - Social Writer drafting responses
- **Checking Duplicates** - Social Dedup preventing spam
- **Creating Links** - Social Tracker generating Bitly links
- **Monitoring Pipeline** - Pipeline Monitor overseeing workflow
- **Posting Replies** - Marketing AI posting to platforms
- **Idle** - Agent waiting for tasks

---

## Technical Details

### Auto-Refresh
- **Agents:** Updated every 5 seconds
- **Activities:** Updated every 5 seconds
- **Status bar:** Real-time health scores

### Data Sources
- **Agents API:** `/api/agents` - agent status, tasks, health
- **Tasks API:** `/api/pipeline/active-tasks` - recent activities

### Performance
- Lightweight rendering (CSS grid + emoji sprites)
- No heavy graphics or animations
- Efficient state management
- Minimal API calls

---

## Navigation

**Access Office View:**
1. Dashboard → **Office View** tab (top navigation)
2. Direct URL: https://rlt-agent-dashboard.vercel.app/office

---

## Future Enhancements

**Potential additions:**

1. **Click agents** to see detailed status
2. **Zoom/pan** controls for larger office
3. **More sprites** for different agent types
4. **Animation** - walking between desks
5. **Chat bubbles** when agents communicate
6. **Sound effects** (optional)
7. **Dark/light mode** toggle
8. **Custom office layouts**
9. **Agent mood indicators** (happy, stressed, productive)
10. **Time of day** lighting (morning, afternoon, evening)

---

## Inspiration

Based on Tony's concept sketch showing:
- Pixel art agents at desks
- Conference table for collaboration
- Live activity feed on the right
- Agent names and current tasks
- Clean, fun visualization

Similar to games like:
- Game Dev Tycoon
- Two Point Hospital
- Theme Hospital
- Rimworld

But focused on **agent productivity visualization** rather than gameplay.

---

## Why This Is Cool

**Traditional dashboards:**
- Numbers and graphs
- Tables of data
- Status indicators
- Boring!

**Office View:**
- 🎮 **Gamified** - feels like watching a simulation game
- 👀 **Visual** - see what's happening at a glance
- 🎨 **Fun** - makes monitoring enjoyable
- 🤝 **Social** - shows agent collaboration
- 📊 **Informative** - still conveys important data
- 🎯 **Engaging** - you'll actually want to check it

---

## Screenshots

**Office Layout:**
- Grid of 14x14 cells (60px each)
- Total view: ~840px x 840px
- Responsive and scrollable

**Agent Example:**
```
    💻
  Marketing AI
  Writing Replies
      [•]
```

**Activity Feed Example:**
```
📡 Live Activity
━━━━━━━━━━━━━━━━
┌─────────────────────┐
│ Social Scanner      │
│ Scanning Posts      │
│                3:25 │
└─────────────────────┘
┌─────────────────────┐
│ Marketing AI        │
│ Posted Reply        │
│                3:24 │
└─────────────────────┘
```

---

## Implementation

**Files Created:**
- `frontend/src/pages/OfficeView.tsx` (11KB)
- `frontend/src/App.tsx` (updated - added route)
- `frontend/src/components/Layout.tsx` (updated - added nav link)

**Dependencies:**
- React
- React Router
- Lucide icons (Building2 icon)
- Tailwind CSS
- Axios (API calls)

**Git Commit:** fb846bd - "Add Office View: 2D pixel art view of agents at work with live activity feed"

**Deployed:** March 12, 2026 - 9:56 PM MDT

---

## Try It Now!

🔗 **https://rlt-agent-dashboard.vercel.app/office**

Watch your agents work in real-time! 🚀

---

## Notes

**Current agents visible:**
- 16 agents total
- All social media pipeline agents
- Operations, Sales, Support, Analytics
- Marketing AI (you!)

**Status accuracy:**
- Real agent data from database
- Live task information
- Actual health scores
- True activity feed

**Not simulated** - this is real data from your actual agents!

---

Built with ❤️ by Marketing AI Agent (Builder)
March 12, 2026
