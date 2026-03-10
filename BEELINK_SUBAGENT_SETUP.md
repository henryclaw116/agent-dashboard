# Beelink Sub-Agent Setup - Complete

**Status:** ✅ COMPLETE  
**Commit:** a90906c  
**Date:** March 9, 2026 - 10:27 PM

## Overview

The Agent Dashboard now supports assigning agents to run on either the **MSI Gateway (Primary)** or the **Beelink SER (Compute Node)**. Heavy tasks can be delegated to the Beelink while keeping the MSI as the main control center.

## What Was Built

### 1. Database Layer

**Migration:** `database/migrations/005_add_compute_nodes.sql`

- Added **MSI Gateway** as primary console
  - Host: 192.168.0.97:18789
  - Capabilities: sessions, sub-agents, browser, canvas, messaging, scheduling
  
- Added **Beelink SER** as compute node console
  - Host: 192.168.0.91:18789
  - SSH: tony@192.168.0.91 (with id_beelink key)
  - Capabilities: sessions, sub-agents, browser, long-running-tasks, headless, compute
  
- Added `preferred_runtime` column to agents table
  - Values: 'msi' (default) | 'beelink'
  - Determines where the agent spawns sub-agents by default

### 2. Frontend Updates

**AgentForm Component** (`frontend/src/components/AgentForm.tsx`)
- Added "Preferred Runtime" dropdown selector
- Options: MSI (Primary Gateway) | Beelink (Compute Node)
- Visual indicator: 🖥️ icon
- Help text: "Where this agent runs tasks by default"

**Agent Type** (`frontend/src/types/index.ts`)
- Added `preferred_runtime?: 'msi' | 'beelink'` field

### 3. Backend API

**New Routes:** `backend/src/routes/subagent.routes.ts`

#### POST /api/subagents/spawn
Spawn a sub-agent on specified runtime

**Request Body:**
```json
{
  "task": "Build the credit spread app",
  "runtime": "beelink",
  "agent_id": 1,
  "task_id": 42,
  "label": "credit-spread-builder"
}
```

**Response:**
```json
{
  "success": true,
  "runtime": "beelink",
  "console_name": "Beelink SER (Compute Node)",
  "session_key": "session-abc123",
  "stdout": "Session spawned: session-abc123"
}
```

#### GET /api/subagents/list
List all running sub-agents

#### POST /api/subagents/:sessionKey/kill
Kill a running sub-agent

#### POST /api/subagents/:sessionKey/steer
Send a message to a running sub-agent

#### GET /api/subagents/runtimes
Get available runtimes and their status

**Response:**
```json
{
  "runtimes": [
    {
      "id": 1,
      "name": "MSI Gateway (Primary)",
      "runtime_key": "msi",
      "status": "online",
      "host": "192.168.0.97",
      "capabilities": ["sessions", "sub-agents", "browser", ...]
    },
    {
      "id": 2,
      "name": "Beelink SER (Compute Node)",
      "runtime_key": "beelink",
      "status": "online",
      "host": "192.168.0.91",
      "ssh": "tony@192.168.0.91",
      "capabilities": ["sessions", "sub-agents", "compute", ...]
    }
  ]
}
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│   MSI Gateway (Primary)                 │
│   - Main control center                 │
│   - User interface                      │
│   - Agent orchestration                 │
│   - Delegates heavy tasks to Beelink    │
└─────────────────────────────────────────┘
              │
              │ SSH (tony@192.168.0.91)
              │ Key: id_beelink
              ▼
┌─────────────────────────────────────────┐
│   Beelink SER (Compute Node)            │
│   - Runs heavy compute tasks            │
│   - Long-running processes              │
│   - Headless operations                 │
│   - Reports completion to MSI           │
└─────────────────────────────────────────┘
```

### Usage Example

**1. Assign Agent to Beelink:**

In the dashboard Team page:
1. Click on an agent (e.g., "Development Agent")
2. Click "Edit Agent"
3. Set "Preferred Runtime" to "Beelink (Compute Node)"
4. Save

**2. Spawn Sub-Agent on Beelink:**

```javascript
// From MSI agent code
const response = await fetch('http://localhost:3002/api/subagents/spawn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: 'Build and deploy the credit spread app',
    runtime: 'beelink', // or 'msi'
    agent_id: 7, // Development Agent ID
    label: 'credit-spread-deployment'
  })
});

const { session_key } = await response.json();
// Sub-agent now running on Beelink!
```

**3. Monitor Sub-Agent:**

```javascript
// List all sub-agents
const subagents = await fetch('http://localhost:3002/api/subagents/list').then(r => r.json());

// Steer sub-agent (send message)
await fetch(`http://localhost:3002/api/subagents/${session_key}/steer`, {
  method: 'POST',
  body: JSON.stringify({ message: 'Please update the status' })
});

// Kill sub-agent
await fetch(`http://localhost:3002/api/subagents/${session_key}/kill`, {
  method: 'POST'
});
```

## Deployment Steps

### 1. Run Database Migration

```bash
# Connect to Supabase and run migration
psql $DATABASE_URL -f database/migrations/005_add_compute_nodes.sql
```

### 2. Restart Backend

The backend will automatically load the new routes on restart.

### 3. Test Sub-Agent Spawning

**From PowerShell:**
```powershell
# Test local spawn (MSI)
curl -X POST http://localhost:3002/api/subagents/spawn `
  -H "Content-Type: application/json" `
  -d '{"task":"Test task","runtime":"msi"}'

# Test remote spawn (Beelink)
curl -X POST http://localhost:3002/api/subagents/spawn `
  -H "Content-Type: application/json" `
  -d '{"task":"Test task","runtime":"beelink"}'
```

**Check if sub-agent spawned on Beelink:**
```powershell
ssh tony@192.168.0.91 "openclaw sessions list"
```

## Benefits

### For MSI (Primary Gateway)
- Remains responsive for user interaction
- Orchestrates work without overload
- Quick response for user queries
- Lightweight operations

### For Beelink (Compute Node)
- Handles CPU-intensive tasks
- Long-running builds/deployments
- Headless browser automation
- Background processing
- No UI lag from heavy operations

### For Agents
- Development Agent → Uses Beelink for coding/building
- Marketing Agent → Uses MSI for quick responses
- Content Agent → Uses Beelink for video processing
- Business Agent → Uses MSI for analytics queries

## Next Steps

1. ✅ Deploy database migration
2. ✅ Restart backend with new routes
3. ✅ Configure agents with preferred runtime
4. ✅ Test spawning on both MSI and Beelink
5. 🔄 Build UI component for task runtime selection (optional enhancement)
6. 🔄 Add runtime status indicator in dashboard (optional enhancement)

## Files Modified

- `database/migrations/005_add_compute_nodes.sql` (new)
- `backend/src/routes/subagent.routes.ts` (new)
- `backend/src/server.ts` (added subagent routes)
- `frontend/src/components/AgentForm.tsx` (added runtime selector)
- `frontend/src/types/index.ts` (added preferred_runtime field)

## Troubleshooting

### Sub-agent won't spawn on Beelink
- Check SSH access: `ssh -i ~/.ssh/id_beelink tony@192.168.0.91`
- Check Beelink gateway status: `ssh tony@192.168.0.91 "openclaw gateway status"`
- Check OpenClaw installed on Beelink: `ssh tony@192.168.0.91 "openclaw --version"`

### Runtime status shows offline
- Check network connectivity: `ping 192.168.0.91`
- Check gateway running: `curl http://192.168.0.91:18789/`
- Update console status in database

### SSH authentication fails
- Verify SSH key exists: `ls ~/.ssh/id_beelink`
- Check key permissions: Should be 600 (read/write owner only)
- Verify public key on Beelink: `ssh tony@192.168.0.91 "cat ~/.ssh/authorized_keys"`

---

**The Beelink is now ready as a compute node for sub-agent delegation!** 🎉
