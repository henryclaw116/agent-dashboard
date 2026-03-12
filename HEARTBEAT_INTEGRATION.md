# 💓 Heartbeat Integration Guide

## Overview

For the Pipeline dashboard to show live agent data, your agents need to send heartbeats every 30 seconds to the orchestration API.

---

## Quick Start

### 1. Add Heartbeat to Your Agent

**JavaScript/TypeScript:**
```javascript
const AGENT_ID = 1; // Your agent's database ID
const API_BASE = 'https://backend-production-a8dd.up.railway.app';

async function sendHeartbeat() {
  try {
    await fetch(`${API_BASE}/api/orchestration/agents/${AGENT_ID}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'active',
        current_task: getCurrentTask(), // Optional: what you're working on
        cpu_usage: getCPUUsage(),       // Optional: % CPU
        memory_usage_mb: getMemoryMB(), // Optional: memory in MB
        healthy: true,
        message: 'All systems operational'
      })
    });
    console.log('✓ Heartbeat sent');
  } catch (error) {
    console.error('✗ Heartbeat failed:', error);
  }
}

// Send heartbeat every 30 seconds
setInterval(sendHeartbeat, 30000);
sendHeartbeat(); // Send immediately on startup
```

**Python:**
```python
import requests
import time
import threading

AGENT_ID = 1
API_BASE = 'https://backend-production-a8dd.up.railway.app'

def send_heartbeat():
    try:
        requests.post(
            f'{API_BASE}/api/orchestration/agents/{AGENT_ID}/heartbeat',
            json={
                'status': 'active',
                'current_task': get_current_task(),  # Optional
                'cpu_usage': get_cpu_usage(),        # Optional
                'memory_usage_mb': get_memory_mb(),  # Optional
                'healthy': True,
                'message': 'All systems operational'
            }
        )
        print('✓ Heartbeat sent')
    except Exception as e:
        print(f'✗ Heartbeat failed: {e}')

def heartbeat_loop():
    while True:
        send_heartbeat()
        time.sleep(30)

# Start heartbeat thread
thread = threading.Thread(target=heartbeat_loop, daemon=True)
thread.start()
```

---

## Heartbeat Payload

### Required Fields
- **None!** The timestamp is added automatically.

### Optional Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `status` | string | Agent status | `'active'`, `'idle'`, `'paused'`, `'error'` |
| `current_task` | string | What you're working on | `'Processing video'` |
| `cpu_usage` | number | CPU usage % | `45.2` |
| `memory_usage_mb` | number | Memory in MB | `512` |
| `healthy` | boolean | Health status | `true` or `false` |
| `message` | string | Status message | `'All systems normal'` |
| `metadata` | object | Any extra data | `{ custom: 'data' }` |

---

## Getting CPU & Memory (Optional)

### Node.js
```javascript
import os from 'os';

function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  return 100 - (100 * totalIdle / totalTick);
}

function getMemoryMB() {
  const used = process.memoryUsage();
  return Math.round(used.heapUsed / 1024 / 1024);
}
```

### Python
```python
import psutil

def get_cpu_usage():
    return psutil.cpu_percent(interval=1)

def get_memory_mb():
    process = psutil.Process()
    return process.memory_info().rss / 1024 / 1024
```

---

## What Happens When You Send Heartbeats?

1. ✅ **Dashboard Updates** - Your agent card shows:
   - Green status indicator
   - Current task
   - CPU & memory usage
   - "Last heartbeat: 5s ago"

2. ✅ **Health Monitoring** - System tracks:
   - Agent is alive and responding
   - Resource usage over time
   - Missed heartbeats (alerts if >60s)

3. ✅ **Auto-Recovery** - If configured:
   - Missing heartbeats trigger alerts
   - Auto-restart on failure (if enabled)

---

## Testing Your Heartbeats

### 1. Start Your Agent
```bash
node your-agent.js
# or
python your_agent.py
```

### 2. Check the Dashboard
Go to: https://rlt-agent-dashboard.vercel.app/pipeline

You should see your agent card update with:
- Status: Active
- Last heartbeat timestamp updating
- CPU/Memory metrics (if sending them)

### 3. Check the Database
```sql
SELECT * FROM agent_heartbeats 
WHERE agent_id = 1 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## Test Heartbeat Simulator (For Development)

We've included a heartbeat simulator that sends fake heartbeats for ALL agents:

```bash
cd agent-dashboard/backend
npx ts-node src/scripts/heartbeat-simulator.ts
```

This will:
- Send heartbeats every 30 seconds
- Simulate random CPU (10-70%) and memory (256-1280MB)
- Update all agent cards in real-time

**Use this for:**
- Testing the dashboard without running real agents
- Demoing the system
- Checking that everything works end-to-end

**Stop with:** Ctrl+C

---

## Integration Checklist

- [ ] Agent has unique ID from database
- [ ] Heartbeat code added (30s interval)
- [ ] Heartbeat sends on startup
- [ ] Agent status updates on state change
- [ ] CPU/memory collection (optional but recommended)
- [ ] Error handling (don't crash if heartbeat fails)
- [ ] Tested in dashboard - agent card updates
- [ ] Verified in database - heartbeats are recorded

---

## Troubleshooting

**Agent not showing in dashboard:**
- Check agent exists in database (`SELECT * FROM agents WHERE id = X`)
- Verify position fields are set (`position_x`, `position_y`)
- Run: `npx ts-node src/scripts/populate-agent-positions.ts` if needed

**Heartbeats failing:**
- Check API_BASE URL is correct
- Verify AGENT_ID matches database
- Check network connectivity
- Look for errors in console/logs

**Dashboard not updating:**
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors
- Verify heartbeat timestamp in database is recent

**Agent showing offline:**
- Check heartbeat interval (should be ≤30s)
- Verify heartbeat is actually running (check logs)
- Ensure no errors in heartbeat function

---

## Advanced: Task Status Integration

When your agent starts/completes tasks, update the orchestration system:

```javascript
// When claiming a task
await fetch(`${API_BASE}/api/orchestration/tasks/${taskId}/claim`, {
  method: 'POST',
  body: JSON.stringify({ agent_id: AGENT_ID })
});

// When starting work
await fetch(`${API_BASE}/api/orchestration/tasks/${taskId}/start`, {
  method: 'POST'
});

// Include current task in heartbeat
await fetch(`${API_BASE}/api/orchestration/agents/${AGENT_ID}/heartbeat`, {
  method: 'POST',
  body: JSON.stringify({
    status: 'active',
    current_task: `Working on: ${taskName}`
  })
});

// When complete
await fetch(`${API_BASE}/api/orchestration/tasks/${taskId}/complete`, {
  method: 'POST',
  body: JSON.stringify({
    result: { output: '...' }
  })
});
```

---

## Questions?

Check:
- Full API docs: `ORCHESTRATION_GUIDE.md`
- Build summary: `PIPELINE_BUILD_SUMMARY.md`
- Backend routes: `backend/src/routes/orchestration.routes.ts`

**Dashboard:** https://rlt-agent-dashboard.vercel.app/pipeline
**Backend API:** https://backend-production-a8dd.up.railway.app
