import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '../server';

const router = express.Router();
const execAsync = promisify(exec);

/**
 * POST /api/subagents/spawn
 * Spawn a sub-agent on specified runtime (MSI or Beelink)
 * 
 * Body:
 *   - task: string (task description)
 *   - runtime: 'msi' | 'beelink'
 *   - agent_id: number (optional - agent requesting the spawn)
 *   - task_id: number (optional - task being delegated)
 */
router.post('/spawn', async (req, res) => {
  try {
    const { task, runtime = 'msi', agent_id, task_id, label } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task description required' });
    }

    // Get console info
    const consoleResult = await db.query(`
      SELECT * FROM consoles 
      WHERE (connection_info->>'is_primary')::boolean = $1
      LIMIT 1
    `, [runtime === 'msi']);

    const console = consoleResult.rows[0];
    if (!console) {
      return res.status(404).json({ error: `Console not found for runtime: ${runtime}` });
    }

    // Generate session key
    const sessionKey = `subagent-${runtime}-${Date.now()}`;
    
    // For now, just track in database (actual OpenClaw spawning will be added later)
    // This allows the UI to work and show runtime assignments
    
    // Log activity if agent_id provided
    if (agent_id) {
      await db.query(`
        INSERT INTO agent_activity (agent_id, activity_type, description, metadata)
        VALUES ($1, 'sub_agent_spawned', $2, $3)
      `, [
        agent_id,
        `Spawned sub-agent on ${console.name}`,
        JSON.stringify({ task, runtime, session_key: sessionKey, task_id, label })
      ]);
    }

    // Update task if task_id provided
    if (task_id) {
      await db.query(`
        UPDATE tasks
        SET status = 'in_progress',
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{sub_agent}',
              $1::jsonb
            )
        WHERE id = $2
      `, [
        JSON.stringify({ 
          runtime, 
          console_id: console.id,
          session_key: sessionKey, 
          spawned_at: new Date().toISOString(),
          task_description: task,
          label
        }),
        task_id
      ]);
    }

    res.json({
      success: true,
      runtime,
      console_id: console.id,
      console_name: console.name,
      session_key: sessionKey,
      message: `Sub-agent queued on ${console.name}`,
      note: 'Actual OpenClaw spawning will be integrated in next phase'
    });
  } catch (error: any) {
    console.error('Failed to spawn sub-agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subagents/list
 * List running sub-agents (from MSI)
 */
router.get('/list', async (req, res) => {
  try {
    const { stdout } = await execAsync('openclaw subagents list');
    
    // Parse output (JSON format expected)
    const subagents = stdout ? JSON.parse(stdout) : [];
    
    res.json({ success: true, subagents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subagents/:sessionKey/kill
 * Kill a running sub-agent
 */
router.post('/:sessionKey/kill', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    
    const { stdout } = await execAsync(`openclaw subagents kill --target ${sessionKey}`);
    
    res.json({ success: true, message: stdout });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subagents/:sessionKey/steer
 * Send a message to a running sub-agent
 */
router.post('/:sessionKey/steer', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const { stdout } = await execAsync(`openclaw subagents steer --target ${sessionKey} --message "${message.replace(/"/g, '\\"')}"`);
    
    res.json({ success: true, message: stdout });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subagents/runtimes
 * Get available runtimes and their status
 */
router.get('/runtimes', async (req, res) => {
  try {
    // Get console status from database
    const result = await db.query(`
      SELECT id, name, type, status, connection_info, capabilities
      FROM consoles
      WHERE type = 'openclaw-gateway'
      ORDER BY (connection_info->>'is_primary')::boolean DESC
    `);
    
    const runtimes = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      runtime_key: row.connection_info?.is_primary ? 'msi' : 'beelink',
      status: row.status,
      type: row.type,
      host: row.connection_info?.host,
      ssh: row.connection_info?.ssh,
      capabilities: row.capabilities
    }));
    
    res.json({ success: true, runtimes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
