# 🎯 Task Visibility System - Implementation Plan

## Problem

Tasks assigned by the Manager Agent aren't showing up on the dashboard. Need full visibility into:
- What each agent is currently working on
- All tasks in the queue
- Task status and progress
- Task routing through dashboard

## Solution: Integrated Task System

### 1. Agent → Dashboard Task Integration

**When an agent receives a task** (from Manager or any source):

```javascript
// Agent receives task
const task = {
  task_name: "Build feature X",
  assigned_to_agent_id: agentId,
  task_payload: { /* details */ },
  priority: 5
};

// POST to orchestration task queue
await fetch('https://backend.../api/orchestration/tasks', {
  method: 'POST',
  body: JSON.stringify(task)
});
```

**This creates task in `task_queue` table** → Shows up in dashboard automatically

### 2. Update Current Task on Agent

**When agent starts working:**

```javascript
//Start task in orchestration system
await fetch(`https://backend.../api/orchestration/tasks/${taskId}/start`, {
  method: 'POST'
});

// This updates agents.current_task_id → Shows on agent card
```

**When agent completes:**

```javascript
await fetch(`https://backend.../api/orchestration/tasks/${taskId}/complete`, {
  method: 'POST',
  body: JSON.stringify({ result: { output: "..." } })
});

// Clears current_task_id, marks complete
```

### 3. Dashboard Views

**Pipeline Tab - Agent Cards:**
- Show current task name
- Show status (In Progress, Pending, etc.)
- Time elapsed on current task

**Task Queue Tab:**
- All pending tasks
- All in-progress tasks
- Recently completed tasks
- Filter by agent

### 4. Manager Agent Integration

**Update `WAITING_ON_TONY.md` reminder script:**

```javascript
// When creating task via conversation
async function createTask(taskDescription) {
  // Parse task from conversation
  const task = {
    task_name: taskDescription,
    task_type: 'manual',
    assigned_to_agent_id: determineAgent(taskDescription),
    task_payload: {
      description: taskDescription,
      created_by: 'manager',
      source: 'conversation'
    },
    priority: 5
  };

  // Create in orchestration system
  const response = await fetch('.../api/orchestration/tasks', {
    method: 'POST',
    body: JSON.stringify(task)
  });

  // Log to WAITING_ON_TONY if needed
  if (requiresUserApproval(task)) {
    await logToWaitingFile(task);
  }

  return response.data.task;
}
```

### 5. Heartbeat Integration

**Agents send current task in heartbeat:**

```javascript
// Every 30 seconds
await fetch(`.../api/orchestration/agents/${agentId}/heartbeat`, {
  method: 'POST',
  body: JSON.stringify({
    status: 'active',
    current_task: getCurrentTaskName(),  // ← Include task info
    cpu_usage: getCPU(),
    memory_usage_mb: getMemory()
  })
});
```

**This updates agent card** → Shows "Working on: [task name]"

---

## Implementation Steps

### ✅ Step 1: Backend (Already Done!)
- Task queue API exists: `/api/orchestration/tasks`
- Agent heartbeat API exists: `/api/orchestration/agents/:id/heartbeat`
- Current task tracking: `agents.current_task_id` field
- Views already built: `agent_overview` includes current task

### 🔨 Step 2: Frontend Display (To Do)

**Agent cards need to show:**
```tsx
{agent.current_task_name && (
  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
    <div className="font-medium text-blue-900">
      Working on: {agent.current_task_name}
    </div>
    <div className="text-blue-600">
      Status: {agent.current_task_status}
    </div>
  </div>
)}
```

Already implemented in AgentOrgChart! Just need data.

### 🔨 Step 3: Agent Integration (To Do)

**Each agent needs to:**

1. **Post tasks** when they receive work:
   ```javascript
   // In agent code
   const createTask = async (taskName, payload) => {
     await api.post('/orchestration/tasks', {
       task_name: taskName,
       assigned_to_agent_id: AGENT_ID,
       task_payload: payload
     });
   };
   ```

2. **Claim tasks** from queue:
   ```javascript
   const claimTask = async () => {
     const response = await api.post('/orchestration/tasks/claim-next', {
       agent_id: AGENT_ID
     });
     return response.data.task;
   };
   ```

3. **Update task status:**
   ```javascript
   await api.post(`/orchestration/tasks/${taskId}/start`);
   // ... do work ...
   await api.post(`/orchestration/tasks/${taskId}/complete`, {
     result: { output: "..." }
   });
   ```

4. **Include in heartbeat:**
   ```javascript
   await api.post(`/orchestration/agents/${AGENT_ID}/heartbeat`, {
     current_task: currentTaskName,
     status: 'active'
   });
   ```

### 🔨 Step 4: Manager Integration (To Do)

**Update Manager Agent to route tasks through orchestration:**

File: Agent's task handler

```javascript
// When user says "create task"
async function handleTaskCreation(userMessage) {
  // Extract task details
  const taskInfo = parseTaskFromMessage(userMessage);

  // Create in orchestration system
  const task = await createOrchestrationTask({
    task_name: taskInfo.name,
    assigned_to_agent_id: taskInfo.agent,
    task_payload: taskInfo,
    priority: taskInfo.priority || 5
  });

  // Send confirmation
  return `✅ Task created: "${task.task_name}" assigned to ${getAgentName(task.assigned_to_agent_id)}. Track progress at dashboard.`;
}
```

---

## Quick Win: Enable Task Display NOW

The infrastructure is already there! Just need to:

### 1. Test with Manual Task

```bash
# Create a test task via API
curl -X POST https://backend.../api/orchestration/tasks \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_name": "Test task for visibility",
    "assigned_to_agent_id": 1,
    "task_payload": {"test": true},
    "priority": 5
  }'

# Start the task
curl -X POST https://backend.../api/orchestration/tasks/1/start

# Check agent card - should show current task!
```

### 2. Agent Cards Already Support It

Look at `AgentOrgChart.tsx` - it already renders:

```tsx
{agent.current_task_name && (
  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
    <div className="font-medium text-blue-900 line-clamp-1">
      {agent.current_task_name}
    </div>
    <div className="text-blue-600">
      {agent.current_task_status}
    </div>
  </div>
)}
```

**It's already built!** Just need agents to populate the data.

---

## For Your Agents to Show Tasks

### Option A: Manual Integration (Quick)

Each agent adds this to their main loop:

```javascript
// At startup
const AGENT_ID = 1; // Your agent's ID from database

// When you get a task
async function recordTask(taskName, details) {
  const task = await fetch('.../api/orchestration/tasks', {
    method: 'POST',
    body: JSON.stringify({
      task_name: taskName,
      assigned_to_agent_id: AGENT_ID,
      task_payload: details
    })
  }).then(r => r.json());

  // Start it
  await fetch(`.../api/orchestration/tasks/${task.task.id}/start`, {
    method: 'POST'
  });

  return task.task.id;
}

// When you finish
async function completeTask(taskId, result) {
  await fetch(`.../api/orchestration/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ result })
  });
}
```

### Option B: Automatic (via Heartbeat)

Include current work in heartbeat:

```javascript
setInterval(async () => {
  await fetch(`.../api/orchestration/agents/${AGENT_ID}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({
      status: 'active',
      current_task: whatAmIDoingNow(), // ← Your current work
      cpu_usage: getCPU(),
      memory_usage_mb: getMemory()
    })
  });
}, 30000);
```

---

## Manager Agent Task Routing

### Integration Points

1. **When Manager creates a task** → POST to `/api/orchestration/tasks`
2. **When Manager assigns work** → Set `assigned_to_agent_id`
3. **When Manager checks status** → GET `/api/orchestration/tasks?agent_id=X`
4. **When Manager escalates** → Use `/api/orchestration/collaborate`

### Example: Manager Conversation

**User:** "Have the Marketing Agent create a Twitter thread about risk management"

**Manager Agent:**
1. Creates task in orchestration system
2. Assigns to Marketing Agent (agent_id = 1)
3. Sets priority based on context
4. Responds: "✅ Task created and assigned to Marketing Agent. You can track progress on the dashboard."

**Marketing Agent:**
1. Polls task queue (or gets notification)
2. Claims task via `/api/orchestration/tasks/claim-next`
3. Starts task via `/api/orchestration/tasks/:id/start`
4. **Shows on dashboard:** "Working on: Create Twitter thread about risk management"
5. Completes and marks done

**User sees:**
- Task appears in Task Queue tab
- Marketing Agent card shows current task
- Task moves through statuses
- Completion notification

---

## Summary

**Infrastructure:** ✅ Already built
**Frontend:** ✅ Already displays tasks (when data exists)
**Needed:** 🔨 Agent integration to populate task data

**Quick Test:**
1. Create manual task via API (see example above)
2. Refresh dashboard
3. See task appear!

**Full Solution:**
Integrate task creation/updates into all agent workflows. Then dashboard becomes central command center with full visibility.
