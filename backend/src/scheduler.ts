/**
 * Agent Scheduler
 * Runs every minute and spawns agents based on their schedule configurations
 * This makes agents with time-based workflows (like "5:30 AM") actually run automatically
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

async function checkAndSpawnAgents() {
  try {
    console.log(`[${new Date().toISOString()}] Checking for scheduled agents...`);
    
    const response = await axios.post(`${BACKEND_URL}/api/agents/scheduler/run`);
    
    if (response.data.success) {
      const { checked, spawned, agent_names } = response.data;
      
      if (spawned > 0) {
        console.log(`✅ Spawned ${spawned} agent(s): ${agent_names.join(', ')}`);
      } else {
        console.log(`⏳ Checked ${checked} agent(s), none scheduled for now`);
      }
    }
  } catch (error: any) {
    console.error('❌ Scheduler error:', error.message);
  }
}

// Start the scheduler
console.log('🕐 Agent Scheduler starting...');
console.log(`   Checking every ${CHECK_INTERVAL_MS / 1000} seconds`);
console.log(`   Backend URL: ${BACKEND_URL}`);

// Run immediately on start
checkAndSpawnAgents();

// Then run every minute
setInterval(checkAndSpawnAgents, CHECK_INTERVAL_MS);

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Agent Scheduler shutting down...');
  process.exit(0);
});
