/**
 * Wire All Agents to Task System
 * Integrates existing agents with orchestration task tracking
 */

import { Pool } from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const API_BASE = process.env.API_BASE || 'https://backend-production-a8dd.up.railway.app';

async function wireAgentsToTasks() {
  console.log('🔗 Wiring Agents to Task System\n');

  // Get all agents
  const agents = await db.query('SELECT id, name, role FROM agents ORDER BY id');

  console.log(`📊 Found ${agents.rows.length} agents to wire up:\n`);

  // Create integration guide for each agent type
  const integrationCode = `
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
`;

  // Write integration code to file
  const integrationPath = path.join(__dirname, '../../AGENT_INTEGRATION_CODE.js');
  fs.writeFileSync(integrationPath, integrationCode);

  console.log(`📝 Integration code written to: AGENT_INTEGRATION_CODE.js\n`);

  // Create specific integration for social media pipeline
  console.log('🎯 Creating Social Media Pipeline Integration...\n');

  const socialAgents = agents.rows.filter(a => a.name.includes('Social'));

  for (const agent of socialAgents) {
    console.log(`  Setting up: ${agent.name} (ID: ${agent.id})`);

    // Create example task for each social agent
    try {
      const taskName = getTaskNameForAgent(agent.name);
      const response = await axios.post(`${API_BASE}/api/orchestration/tasks`, {
        task_name: taskName,
        task_type: 'example',
        assigned_to_agent_id: agent.id,
        task_payload: {
          example: true,
          agent_role: agent.role,
          instructions: getInstructionsForAgent(agent.name)
        },
        priority: 5,
        tags: ['social', 'pipeline', 'example']
      });

      console.log(`    ✓ Example task created: "${taskName}"`);
    } catch (error: any) {
      console.error(`    ✗ Failed: ${error.message}`);
    }
  }

  console.log('\n✅ Agent Wiring Complete!\n');
  console.log('📖 Next Steps:');
  console.log('  1. Each agent needs to add TaskTracker to their code');
  console.log('  2. See AGENT_INTEGRATION_CODE.js for copy-paste examples');
  console.log('  3. Refresh dashboard to see example tasks\n');
  console.log('🌐 Dashboard: https://rlt-agent-dashboard.vercel.app/pipeline\n');

  process.exit(0);
}

function getTaskNameForAgent(agentName: string): string {
  const tasks: { [key: string]: string } = {
    'Social Scanner': 'Scan Brand24 alerts for trading frustration posts',
    'Social Scorer': 'Score filtered leads (target: 70+ scores)',
    'Social Router': 'Analyze pain points and route to landing pages',
    'Social Writer': 'Craft helpful 4-sentence replies',
    'Social Dedup': 'Check 30-day contact history',
    'Social Tracker': 'Generate Bitly links with UTM tracking'
  };

  return tasks[agentName] || `Process ${agentName} workflow`;
}

function getInstructionsForAgent(agentName: string): string {
  const instructions: { [key: string]: string } = {
    'Social Scanner': 'Use phi3:mini to filter 80% noise, pass KEEP leads to Scorer',
    'Social Scorer': 'Score 0-100 with llama3.1:8b, only 70+ pass to Router',
    'Social Router': 'Use Claude Sonnet for pain analysis, determine landing page',
    'Social Writer': 'Use Claude Sonnet for natural replies with [LINK] placeholder',
    'Social Dedup': 'Check embeddings for duplicate content, block 30-day repeats',
    'Social Tracker': 'Generate rlt.to Bitly links with full UTM attribution'
  };

  return instructions[agentName] || 'Process according to agent role';
}

wireAgentsToTasks().catch(console.error);
