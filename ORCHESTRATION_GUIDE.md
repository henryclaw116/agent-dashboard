# Agent Orchestration System - User Guide

## 🎯 Overview

Your Agent Mission Control Board is a Paperclip-inspired visual dashboard for managing and coordinating your AI agents. It provides complete oversight and control of your entire agent team.

**Dashboard URL:** https://rlt-agent-dashboard.vercel.app/pipeline

---

## ✨ Features

### 1. **Visual Org Chart**
- See all agents in a hierarchical organization chart
- Drag and drop agents to reorganize
- Visual reporting relationships (lines connect parent → child)
- Real-time status indicators
- Resource usage metrics (CPU, Memory)
- Current task display

### 2. **Agent Control**
- **Start** - Activate idle agents
- **Pause** - Temporarily halt work
- **Restart** - Fresh start (clears current task)
- **Stop** - Shut down agent completely

### 3. **Task Queue**
- Centralized task management
- Priority-based execution (1 = highest, 10 = lowest)
- Manual task creation
- Auto-assignment or direct assignment
- Task status tracking: Pending → Claimed → In Progress → Completed/Failed

### 4. **Heartbeat Monitoring**
- Agents send heartbeat every 30 seconds (configurable)
- Auto-detect offline agents
- Health status tracking
- Automatic restart on failure (if enabled)

### 5. **Alerts System**
- Real-time notifications for:
  - Missed heartbeats
  - Task failures
  - Agent crashes
  - High resource usage
- Severity levels: Low, Medium, High, Critical
- Acknowledge and resolve workflows

### 6. **Collaboration**
- Agents can pass tasks to each other
- Delegation chains (Agent A → Agent B → Agent C)
- Shared task queue
- Request help from other agents

### 7. **Scheduling**
- Cron-style automation
- Interval-based tasks (every X minutes)
- Daily/hourly schedules
- Event-triggered workflows

---

## 📊 Dashboard Tabs

### **Org Chart**
Visual hierarchy of all agents. Click any agent to see details. Drag to reposition.

**Agent Card shows:**
- Name & description
- Current status (color-coded)
- Current task
- CPU & memory usage
- Pending task count
- Alert count
- Control buttons

**Status Colors:**
- 🟢 Green - Active
- 🔵 Blue - Idle
- 🟡 Yellow - Paused
- ⚫ Gray - Offline
- 🔴 Red - Error

### **Task Queue**
View and manage all tasks.

**Create Task:**
1. Click "+ Create Task"
2. Enter task name
3. Select agent (or leave blank for auto-assign)
4. Set priority (1-10)
5. Click "Create Task"

**Task Status:**
- Pending - Waiting to be claimed
- Claimed - Agent has taken it
- In Progress - Being worked on
- Completed - Done ✅
- Failed - Error occurred ❌

### **Alerts**
Active notifications requiring attention.

**Alert Actions:**
- **Acknowledge** - Mark as seen
- **Resolve** - Close the alert (with notes)

**Alert Types:**
- heartbeat_missed - Agent stopped responding
- task_failed - Task execution failed
- crash - Agent crashed
- resource_high - High CPU/memory

### **Activity Logs**
Coming soon: Real-time log viewer for all agent activities.

---

## 🔧 API Usage

All orchestration functions are available via REST API at:
**Base URL:** `https://backend-production-a8dd.up.railway.app/api/orchestration`

### Agent Control
```bash
# Get all agents
GET /orchestration/agents

# Control agent
POST /orchestration/agents/:id/control
{
  "action": "start" | "stop" | "pause" | "restart"
}

# Update agent position (org chart)
PUT /orchestration/agents/:id/position
{
  "position_x": 100,
  "position_y": 200,
  "parent_agent_id": 1
}
```

### Task Management
```bash
# Get tasks
GET /orchestration/tasks?status=pending

# Create task
POST /orchestration/tasks
{
  "task_name": "Process video",
  "task_type": "manual",
  "assigned_to_agent_id": 1,
  "task_payload": { ... },
  "priority": 5
}

# Claim next task (for agents)
POST /orchestration/tasks/claim-next
{
  "agent_id": 1
}

# Complete task
POST /orchestration/tasks/:id/complete
{
  "result": { "output": "..." }
}
```

### Heartbeats
```bash
# Send heartbeat
POST /orchestration/agents/:id/heartbeat
{
  "status": "active",
  "current_task": "Processing...",
  "cpu_usage": 45.2,
  "memory_usage_mb": 512,
  "healthy": true
}

# Check for missed heartbeats
GET /orchestration/heartbeats/check
```

### Schedules
```bash
# Create schedule
POST /orchestration/schedules
{
  "agent_id": 1,
  "schedule_name": "Daily report",
  "schedule_type": "cron",
  "cron_expression": "0 9 * * *",  // 9 AM daily
  "task_payload": { ... }
}
```

### Collaboration
```bash
# Pass task to another agent
POST /orchestration/collaborate
{
  "from_agent_id": 1,
  "to_agent_id": 2,
  "collaboration_type": "delegation",
  "message": "Please handle this",
  "payload": { "task_name": "...", ... }
}
```

---

## 🤖 Agent Integration

For an agent to join the orchestration system:

### 1. Register in Database
```sql
INSERT INTO agents (name, description, status, heartbeat_interval_seconds, auto_restart)
VALUES ('My Agent', 'Does cool stuff', 'active', 30, true);
```

### 2. Send Heartbeats
Every 30 seconds (or configured interval):
```javascript
await fetch('https://backend.../api/orchestration/agents/1/heartbeat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'active',
    cpu_usage: getCPU(),
    memory_usage_mb: getMemory(),
    healthy: true
  })
});
```

### 3. Poll for Tasks
```javascript
// Claim next available task
const task = await fetch('.../orchestration/tasks/claim-next', {
  method: 'POST',
  body: JSON.stringify({ agent_id: 1 })
}).then(r => r.json());

if (task.task) {
  // Start task
  await fetch(`.../orchestration/tasks/${task.task.id}/start`, { method: 'POST' });
  
  // Do work...
  const result = await doWork(task.task.task_payload);
  
  // Complete task
  await fetch(`.../orchestration/tasks/${task.task.id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ result })
  });
}
```

### 4. Log Activity
```javascript
await fetch('.../orchestration/logs', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: 1,
    task_id: taskId,
    log_level: 'INFO',
    message: 'Completed processing',
    action: 'process_complete',
    duration_ms: 1234
  })
});
```

---

## 🎨 Customization

### Auto-Layout
Click "Auto-Layout" to automatically organize agents in a hierarchical tree structure.

### Zoom & Pan
Use +/− buttons to zoom. Click "Reset" to restore default view.

### Drag to Reorganize
Drag any agent card to move it. Changes save automatically.

### Set Hierarchy
To make Agent B report to Agent A:
1. Drag Agent B near Agent A
2. Use API to set parent:
   ```bash
   PUT /orchestration/agents/{agent_b_id}/position
   {
     "parent_agent_id": {agent_a_id}
   }
   ```

---

## 📈 Best Practices

### Task Priorities
- **1-2**: Critical, do immediately
- **3-5**: Important, normal queue
- **6-8**: Nice to have
- **9-10**: Low priority, fill time

### Heartbeat Intervals
- Active agents: 30 seconds
- Background agents: 60 seconds
- Slow agents: 120 seconds

### Alert Response
- **Critical**: Immediate action required
- **High**: Investigate within 5 minutes
- **Medium**: Review within 30 minutes
- **Low**: Review when convenient

### Collaboration Patterns
**Sequential Workflow:**
1. Video Editor finishes → delegates to Thumbnail Creator
2. Thumbnail Creator finishes → delegates to YouTube Uploader

**Parallel Workflow:**
1. Research Agent delegates to 3 content agents simultaneously
2. All complete → results aggregated

---

## 🔒 Security Notes

- API is protected by backend authentication
- Heartbeats validate agent identity
- Only authorized agents can claim tasks
- Failed tasks auto-retry (up to max_retries)
- Crashed agents auto-restart (if enabled)

---

## 🚀 Quick Start

1. **Go to Pipeline tab:** https://rlt-agent-dashboard.vercel.app/pipeline
2. **View your agents** in the org chart
3. **Create a test task** in Task Queue tab
4. **Click an agent** to see details
5. **Control agents** with Start/Pause/Restart buttons

---

## 🛠️ Troubleshooting

**Agent shows offline:**
- Check if heartbeat is being sent every 30s
- Verify agent process is running
- Check network connectivity

**Task stuck in pending:**
- Ensure agent is active
- Check agent has capacity (not at max tasks)
- Verify task dependencies are complete

**Alerts not firing:**
- Check heartbeat interval matches agent config
- Run manual check: `GET /orchestration/heartbeats/check`
- Verify alert notification settings

---

## 📚 Database Schema

Full schema: `database/migrations/007_agent_orchestration.sql`

**Key tables:**
- `agents` - Agent registry
- `task_queue` - Centralized task queue
- `agent_heartbeats` - Health monitoring
- `agent_schedules` - Automated scheduling
- `agent_logs` - Activity logging
- `agent_alerts` - Alert system
- `agent_collaborations` - Inter-agent communication

---

## 🎯 Roadmap

**Coming Soon:**
- [ ] Real-time WebSocket updates (no refresh needed)
- [ ] Activity log viewer
- [ ] Schedule editor UI
- [ ] Agent performance metrics
- [ ] Custom alert rules
- [ ] Workflow builder (visual task chains)
- [ ] Agent templates
- [ ] Bulk operations

---

**Need help?** Check the API docs or contact the development team.

**Dashboard:** https://rlt-agent-dashboard.vercel.app/pipeline
**Backend API:** https://backend-production-a8dd.up.railway.app
