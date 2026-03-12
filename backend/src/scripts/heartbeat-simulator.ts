/**
 * Heartbeat Simulator for Testing
 * Simulates heartbeats from all agents
 * Run: npx ts-node src/scripts/heartbeat-simulator.ts
 */

import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE || 'https://backend-production-a8dd.up.railway.app';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface Agent {
  id: number;
  name: string;
  status: string;
}

// Simulate resource usage
const getRandomCPU = () => Math.random() * 60 + 10; // 10-70%
const getRandomMemory = () => Math.floor(Math.random() * 1024) + 256; // 256-1280 MB

async function sendHeartbeat(agent: Agent) {
  try {
    const heartbeat = {
      status: agent.status,
      current_task: Math.random() > 0.7 ? 'Processing task...' : undefined,
      cpu_usage: getRandomCPU(),
      memory_usage_mb: getRandomMemory(),
      healthy: true,
      message: 'Simulated heartbeat'
    };

    await axios.post(`${API_BASE}/api/orchestration/agents/${agent.id}/heartbeat`, heartbeat);
    
    console.log(`✓ ${agent.name} (${agent.id}) - CPU: ${heartbeat.cpu_usage.toFixed(1)}% | Mem: ${heartbeat.memory_usage_mb}MB`);
  } catch (error: any) {
    console.error(`✗ ${agent.name} (${agent.id}) - ${error.message}`);
  }
}

async function simulateHeartbeats() {
  try {
    console.log('🔗 Connecting to database...');
    await db.query('SELECT NOW()');
    console.log('✅ Connected\n');

    // Get all agents
    const result = await db.query('SELECT id, name, status FROM agents ORDER BY id');
    const agents: Agent[] = result.rows;

    console.log(`📊 Simulating heartbeats for ${agents.length} agents\n`);

    // Send initial heartbeats
    for (const agent of agents) {
      await sendHeartbeat(agent);
    }

    console.log('\n✅ Initial heartbeats sent');
    console.log('🔄 Starting continuous heartbeat simulation (every 30 seconds)');
    console.log('Press Ctrl+C to stop\n');

    // Send heartbeats every 30 seconds
    setInterval(async () => {
      console.log(`\n⏰ Sending heartbeats - ${new Date().toLocaleTimeString()}`);
      for (const agent of agents) {
        await sendHeartbeat(agent);
      }
    }, 30000);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping heartbeat simulator...');
  process.exit(0);
});

simulateHeartbeats();
