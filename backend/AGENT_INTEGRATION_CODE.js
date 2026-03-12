
// ============================================
// AGENT TASK INTEGRATION CODE
// ============================================
// Add this to your agent's main file

import { TaskTracker } from './middleware/task-tracker';

// Initialize task tracker
const tracker = new TaskTracker(AGENT_ID); // Replace AGENT_ID with your agent's ID

// ============================================
// EXAMPLE 1: Track a simple task
// ============================================
async function doWork() {
  // Start task
  const taskId = await tracker.startTask({
    agent_id: AGENT_ID,
    task_name: "Process social media leads",
    task_payload: { source: "brand24", count: 50 },
    priority: 5,
    tags: ['social', 'leads']
  });

  try {
    // Do your work here
    const result = await processLeads();

    // Complete task
    await tracker.completeTask(result);
  } catch (error) {
    // Fail task
    await tracker.failTask(error.message, true); // true = retry
  }
}

// ============================================
// EXAMPLE 2: Track task with heartbeat
// ============================================
async function workWithHeartbeat() {
  const taskId = await tracker.startTask({
    agent_id: AGENT_ID,
    task_name: "Generate content",
    priority: 3
  });

  // Start heartbeat interval
  const heartbeatInterval = setInterval(async () => {
    await tracker.sendHeartbeat({
      status: 'active',
      current_task: 'Generating content...',
      cpu_usage: getCPUUsage(),
      memory_usage_mb: getMemoryMB()
    });
  }, 30000); // Every 30 seconds

  try {
    const content = await generateContent();
    await tracker.completeTask({ content });
  } catch (error) {
    await tracker.failTask(error.message);
  } finally {
    clearInterval(heartbeatInterval);
  }
}

// ============================================
// EXAMPLE 3: Use helper wrapper
// ============================================
import { trackTask } from './middleware/task-tracker';

async function quickTask() {
  return await trackTask(
    tracker,
    "Quick analysis task",
    async () => {
      // Your work here
      return await analyzeData();
    },
    {
      agentId: AGENT_ID,
      priority: 7,
      tags: ['analysis']
    }
  );
}
