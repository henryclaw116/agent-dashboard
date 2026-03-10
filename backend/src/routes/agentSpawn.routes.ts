import express from 'express';
import { db } from '../server';
import { AgentOrchestratorService } from '../services/agentOrchestrator.service';

const router = express.Router();

// Create orchestrator instance with db connection
const getOrchestrator = () => new AgentOrchestratorService(db);

/**
 * POST /api/agents/:id/spawn
 * Spawn an agent as a live OpenClaw session
 * This makes dashboard agents actually RUN instead of just being config
 */
router.post('/:id/spawn', async (req, res) => {
  try {
    const agentId = parseInt(req.params.id);

    if (isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    const orchestrator = getOrchestrator();
    const result = await orchestrator.spawnAgent(agentId);

    if (result.success) {
      res.json({
        success: true,
        session_key: result.sessionKey,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message
      });
    }
  } catch (error: any) {
    console.error('Spawn agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agents/scheduled
 * Get all agents that have schedules and should be monitored
 */
router.get('/scheduled', async (req, res) => {
  try {
    const orchestrator = getOrchestrator();
    const agents = await orchestrator.getScheduledAgents();
    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agents/scheduler/run
 * Check all scheduled agents and spawn those that should run now
 * This endpoint should be called by a cron job every minute
 */
router.post('/scheduler/run', async (req, res) => {
  try {
    const orchestrator = getOrchestrator();
    const agents = await orchestrator.getScheduledAgents();
    const spawned: string[] = [];

    for (const agent of agents) {
      if (orchestrator.shouldRunNow(agent)) {
        // Check if already spawned today
        const lastSpawn = await db.query(`
          SELECT created_at FROM agent_activity
          WHERE agent_id = $1 
            AND activity_type = 'agent_spawned'
            AND created_at > CURRENT_DATE
          ORDER BY created_at DESC
          LIMIT 1
        `, [agent.id]);

        // Only spawn if hasn't run today yet
        if (lastSpawn.rows.length === 0) {
          const result = await orchestrator.spawnAgent(agent.id);
          if (result.success) {
            spawned.push(agent.name);
          }
        }
      }
    }

    res.json({
      success: true,
      checked: agents.length,
      spawned: spawned.length,
      agent_names: spawned
    });
  } catch (error: any) {
    console.error('Scheduler run error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
