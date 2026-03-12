import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

// ============================================
// AGENT CONTROL
// ============================================

/**
 * GET /api/orchestration/agents
 * Get all agents with orchestration data
 */
router.get('/agents', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM agent_overview
      ORDER BY hierarchy_level ASC, name ASC
    `);
    
    res.json({ success: true, agents: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orchestration/agents/:id
 * Get single agent with full details
 */
router.get('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [agent, tasks, logs, alerts] = await Promise.all([
      db.query('SELECT * FROM agent_overview WHERE id = $1', [id]),
      db.query(`
        SELECT * FROM task_queue_overview 
        WHERE assigned_to_agent_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `, [id]),
      db.query(`
        SELECT * FROM agent_logs 
        WHERE agent_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 100
      `, [id]),
      db.query(`
        SELECT * FROM agent_alerts 
        WHERE agent_id = $1 AND status != 'resolved'
        ORDER BY created_at DESC
      `, [id])
    ]);
    
    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      success: true,
      agent: agent.rows[0],
      tasks: tasks.rows,
      logs: logs.rows,
      alerts: alerts.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/agents/:id/control
 * Control agent (start, stop, pause, restart)
 */
router.post('/agents/:id/control', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'start', 'stop', 'pause', 'restart'
    
    let newStatus: string;
    
    switch (action) {
      case 'start':
        newStatus = 'active';
        break;
      case 'stop':
        newStatus = 'offline';
        break;
      case 'pause':
        newStatus = 'paused';
        break;
      case 'restart':
        newStatus = 'active';
        // Cancel current task
        await db.query(`
          UPDATE task_queue 
          SET status = 'cancelled' 
          WHERE id = (SELECT current_task_id FROM agents WHERE id = $1)
        `, [id]);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    const result = await db.query(`
      UPDATE agents 
      SET status = $1, current_task_id = NULL
      WHERE id = $2
      RETURNING *
    `, [newStatus, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Log the action
    await db.query(`
      INSERT INTO agent_logs (agent_id, log_level, message, action)
      VALUES ($1, 'INFO', $2, $3)
    `, [id, `Agent ${action} command executed`, action]);
    
    broadcast({ type: 'agent_control', agent: result.rows[0], action });
    
    res.json({ success: true, agent: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/orchestration/agents/:id/position
 * Update agent position in org chart
 */
router.put('/agents/:id/position', async (req, res) => {
  try {
    const { id } = req.params;
    const { position_x, position_y, parent_agent_id, hierarchy_level } = req.body;
    
    const result = await db.query(`
      UPDATE agents 
      SET position_x = COALESCE($1, position_x),
          position_y = COALESCE($2, position_y),
          parent_agent_id = $3,
          hierarchy_level = COALESCE($4, hierarchy_level)
      WHERE id = $5
      RETURNING *
    `, [position_x, position_y, parent_agent_id, hierarchy_level, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    broadcast({ type: 'agent_position_updated', agent: result.rows[0] });
    
    res.json({ success: true, agent: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/agents/:id/task
 * Assign a new task to an agent
 */
router.post('/agents/:id/task', async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, task_payload, priority, deadline } = req.body;
    
    const result = await db.query(`
      INSERT INTO task_queue (
        task_name, 
        task_type, 
        assigned_to_agent_id, 
        task_payload, 
        priority,
        deadline,
        status
      )
      VALUES ($1, 'manual', $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [task_name, id, task_payload, priority || 5, deadline]);
    
    // Log task creation
    await db.query(`
      INSERT INTO agent_logs (agent_id, task_id, log_level, message, action)
      VALUES ($1, $2, 'INFO', $3, 'task_assigned')
    `, [id, result.rows[0].id, `New task assigned: ${task_name}`]);
    
    broadcast({ type: 'task_created', task: result.rows[0], agent_id: id });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEARTBEAT SYSTEM
// ============================================

/**
 * POST /api/orchestration/agents/:id/heartbeat
 * Agent sends heartbeat signal
 */
router.post('/agents/:id/heartbeat', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, current_task, cpu_usage, memory_usage_mb, healthy, message, metadata } = req.body;
    
    // Record heartbeat
    await db.query(`
      INSERT INTO agent_heartbeats (
        agent_id, 
        status, 
        current_task, 
        cpu_usage, 
        memory_usage_mb, 
        healthy, 
        message,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, status, current_task, cpu_usage, memory_usage_mb, healthy !== false, message, metadata]);
    
    // Update agent's last heartbeat and resource usage
    await db.query(`
      UPDATE agents 
      SET last_heartbeat = NOW(),
          cpu_usage = $1,
          memory_usage_mb = $2,
          status = COALESCE($3, status)
      WHERE id = $4
    `, [cpu_usage, memory_usage_mb, status, id]);
    
    // Clear any heartbeat_missed alerts
    await db.query(`
      UPDATE agent_alerts 
      SET status = 'resolved', resolved_at = NOW(), resolved_by = 'system'
      WHERE agent_id = $1 AND alert_type = 'heartbeat_missed' AND status = 'new'
    `, [id]);
    
    broadcast({ type: 'heartbeat', agent_id: parseInt(id), healthy });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orchestration/heartbeats/check
 * Check for missed heartbeats and create alerts
 */
router.get('/heartbeats/check', async (req, res) => {
  try {
    await db.query('SELECT check_missed_heartbeats()');
    
    const alerts = await db.query(`
      SELECT * FROM agent_alerts 
      WHERE alert_type = 'heartbeat_missed' AND status = 'new'
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, new_alerts: alerts.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TASK QUEUE
// ============================================

/**
 * GET /api/orchestration/tasks
 * Get tasks with filters
 */
router.get('/tasks', async (req, res) => {
  try {
    const { status, agent_id, priority } = req.query;
    
    let query = 'SELECT * FROM task_queue_overview WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (agent_id) {
      query += ` AND assigned_to_agent_id = $${paramIndex++}`;
      params.push(agent_id);
    }
    
    if (priority) {
      query += ` AND priority <= $${paramIndex++}`;
      params.push(priority);
    }
    
    query += ' ORDER BY priority ASC, created_at ASC LIMIT 100';
    
    const result = await db.query(query, params);
    res.json({ success: true, tasks: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/tasks
 * Create a new task
 */
router.post('/tasks', async (req, res) => {
  try {
    const {
      task_name,
      task_type,
      assigned_to_agent_id,
      delegated_by_agent_id,
      task_payload,
      priority,
      deadline,
      depends_on_task_id,
      tags
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO task_queue (
        task_name,
        task_type,
        assigned_to_agent_id,
        delegated_by_agent_id,
        task_payload,
        priority,
        deadline,
        depends_on_task_id,
        tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      task_name,
      task_type || 'manual',
      assigned_to_agent_id,
      delegated_by_agent_id,
      task_payload,
      priority || 5,
      deadline,
      depends_on_task_id,
      tags
    ]);
    
    broadcast({ type: 'task_created', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/tasks/:id/claim
 * Agent claims a task
 */
router.post('/tasks/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;
    
    const result = await db.query(`
      UPDATE task_queue
      SET status = 'claimed',
          assigned_to_agent_id = $1,
          claimed_at = NOW()
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `, [agent_id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or already claimed' });
    }
    
    await db.query(`
      UPDATE agents SET current_task_id = $1 WHERE id = $2
    `, [id, agent_id]);
    
    broadcast({ type: 'task_claimed', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/tasks/:id/start
 * Agent starts working on a task
 */
router.post('/tasks/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      UPDATE task_queue
      SET status = 'in_progress', started_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    broadcast({ type: 'task_started', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/tasks/:id/complete
 * Agent completes a task
 */
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { result: taskResult, next_task_payload } = req.body;
    
    const result = await db.query(`
      UPDATE task_queue
      SET status = 'completed',
          completed_at = NOW(),
          result = $1
      WHERE id = $2
      RETURNING *
    `, [taskResult, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = result.rows[0];
    
    // Clear agent's current task
    await db.query(`
      UPDATE agents SET current_task_id = NULL 
      WHERE current_task_id = $1
    `, [id]);
    
    // If there's a next task defined, create it
    if (task.next_task_id && next_task_payload) {
      await db.query(`
        INSERT INTO task_queue (task_name, task_type, task_payload, depends_on_task_id)
        VALUES ($1, 'delegated', $2, $3)
      `, [`Follow-up to ${task.task_name}`, next_task_payload, id]);
    }
    
    broadcast({ type: 'task_completed', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/tasks/:id/fail
 * Mark task as failed
 */
router.post('/tasks/:id/fail', async (req, res) => {
  try {
    const { id } = req.params;
    const { error_message, retry } = req.body;
    
    const result = await db.query(`
      UPDATE task_queue
      SET status = CASE 
            WHEN $3 = true AND retry_count < max_retries THEN 'pending'
            ELSE 'failed'
          END,
          retry_count = retry_count + 1,
          error_message = $1,
          completed_at = CASE 
            WHEN $3 = true AND retry_count < max_retries THEN NULL
            ELSE NOW()
          END
      WHERE id = $2
      RETURNING *
    `, [error_message, id, retry]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = result.rows[0];
    
    // Clear agent's current task
    await db.query(`
      UPDATE agents SET current_task_id = NULL 
      WHERE current_task_id = $1
    `, [id]);
    
    // Create alert if task permanently failed
    if (task.status === 'failed') {
      await db.query(`
        INSERT INTO agent_alerts (
          agent_id, 
          alert_type, 
          severity, 
          title, 
          message,
          metadata
        )
        VALUES ($1, 'task_failed', 'medium', $2, $3, $4)
      `, [
        task.assigned_to_agent_id,
        `Task failed: ${task.task_name}`,
        error_message,
        JSON.stringify({ task_id: id, retry_count: task.retry_count })
      ]);
    }
    
    broadcast({ type: 'task_failed', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/tasks/claim-next
 * Agent claims next available task
 */
router.post('/tasks/claim-next', async (req, res) => {
  try {
    const { agent_id } = req.body;
    
    const result = await db.query('SELECT * FROM claim_next_task($1)', [agent_id]);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, task: null, message: 'No tasks available' });
    }
    
    broadcast({ type: 'task_claimed', task: result.rows[0], agent_id });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHEDULING
// ============================================

/**
 * GET /api/orchestration/schedules
 * Get all schedules
 */
router.get('/schedules', async (req, res) => {
  try {
    const { agent_id } = req.query;
    
    let query = `
      SELECT s.*, a.name as agent_name
      FROM agent_schedules s
      JOIN agents a ON a.id = s.agent_id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (agent_id) {
      query += ' AND s.agent_id = $1';
      params.push(agent_id);
    }
    
    query += ' ORDER BY s.agent_id, s.schedule_name';
    
    const result = await db.query(query, params);
    res.json({ success: true, schedules: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/schedules
 * Create a new schedule
 */
router.post('/schedules', async (req, res) => {
  try {
    const {
      agent_id,
      schedule_name,
      schedule_type,
      cron_expression,
      interval_seconds,
      time_of_day,
      task_payload,
      enabled
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO agent_schedules (
        agent_id,
        schedule_name,
        schedule_type,
        cron_expression,
        interval_seconds,
        time_of_day,
        task_payload,
        enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      agent_id,
      schedule_name,
      schedule_type,
      cron_expression,
      interval_seconds,
      time_of_day,
      task_payload,
      enabled !== false
    ]);
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/orchestration/schedules/:id
 * Update a schedule
 */
router.put('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, cron_expression, interval_seconds, task_payload } = req.body;
    
    const result = await db.query(`
      UPDATE agent_schedules
      SET enabled = COALESCE($1, enabled),
          cron_expression = COALESCE($2, cron_expression),
          interval_seconds = COALESCE($3, interval_seconds),
          task_payload = COALESCE($4, task_payload)
      WHERE id = $5
      RETURNING *
    `, [enabled, cron_expression, interval_seconds, task_payload, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/orchestration/schedules/:id
 * Delete a schedule
 */
router.delete('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM agent_schedules WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COLLABORATION (Task Passing)
// ============================================

/**
 * POST /api/orchestration/collaborate
 * Agent passes task to another agent
 */
router.post('/collaborate', async (req, res) => {
  try {
    const {
      from_agent_id,
      to_agent_id,
      collaboration_type,
      message,
      payload,
      task_id
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO agent_collaborations (
        from_agent_id,
        to_agent_id,
        collaboration_type,
        message,
        payload,
        task_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [from_agent_id, to_agent_id, collaboration_type, message, payload, task_id]);
    
    // If delegation, create task for receiving agent
    if (collaboration_type === 'delegation' && payload) {
      await db.query(`
        INSERT INTO task_queue (
          task_name,
          task_type,
          assigned_to_agent_id,
          delegated_by_agent_id,
          task_payload,
          priority
        )
        VALUES ($1, 'delegated', $2, $3, $4, $5)
      `, [
        payload.task_name || 'Delegated task',
        to_agent_id,
        from_agent_id,
        payload,
        payload.priority || 5
      ]);
    }
    
    broadcast({ type: 'collaboration_created', collaboration: result.rows[0] });
    
    res.json({ success: true, collaboration: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orchestration/collaborate/:agent_id
 * Get collaborations for an agent
 */
router.get('/collaborate/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;
    const { direction } = req.query; // 'incoming' or 'outgoing'
    
    let query = `
      SELECT c.*, 
             fa.name as from_agent_name,
             ta.name as to_agent_name
      FROM agent_collaborations c
      JOIN agents fa ON fa.id = c.from_agent_id
      JOIN agents ta ON ta.id = c.to_agent_id
      WHERE 1=1
    `;
    const params: any[] = [agent_id];
    
    if (direction === 'incoming') {
      query += ' AND c.to_agent_id = $1';
    } else if (direction === 'outgoing') {
      query += ' AND c.from_agent_id = $1';
    } else {
      query += ' AND (c.from_agent_id = $1 OR c.to_agent_id = $1)';
    }
    
    query += ' ORDER BY c.created_at DESC LIMIT 50';
    
    const result = await db.query(query, params);
    res.json({ success: true, collaborations: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ALERTS
// ============================================

/**
 * GET /api/orchestration/alerts
 * Get all alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { status, severity, agent_id } = req.query;
    
    let query = `
      SELECT al.*, a.name as agent_name
      FROM agent_alerts al
      LEFT JOIN agents a ON a.id = al.agent_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND al.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (severity) {
      query += ` AND al.severity = $${paramIndex++}`;
      params.push(severity);
    }
    
    if (agent_id) {
      query += ` AND al.agent_id = $${paramIndex++}`;
      params.push(agent_id);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT 100';
    
    const result = await db.query(query, params);
    res.json({ success: true, alerts: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/orchestration/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      UPDATE agent_alerts
      SET status = 'acknowledged'
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ success: true, alert: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/orchestration/alerts/:id/resolve
 * Resolve an alert
 */
router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;
    
    const result = await db.query(`
      UPDATE agent_alerts
      SET status = 'resolved',
          resolved_at = NOW(),
          resolved_by = 'user',
          resolution_notes = $1
      WHERE id = $2
      RETURNING *
    `, [resolution_notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ success: true, alert: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOGS
// ============================================

/**
 * GET /api/orchestration/logs
 * Get agent logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { agent_id, task_id, log_level, limit } = req.query;
    
    let query = `
      SELECT l.*, a.name as agent_name
      FROM agent_logs l
      LEFT JOIN agents a ON a.id = l.agent_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (agent_id) {
      query += ` AND l.agent_id = $${paramIndex++}`;
      params.push(agent_id);
    }
    
    if (task_id) {
      query += ` AND l.task_id = $${paramIndex++}`;
      params.push(task_id);
    }
    
    if (log_level) {
      query += ` AND l.log_level = $${paramIndex++}`;
      params.push(log_level);
    }
    
    query += ` ORDER BY l.timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit ? parseInt(limit as string) : 200);
    
    const result = await db.query(query, params);
    res.json({ success: true, logs: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orchestration/logs
 * Create a log entry
 */
router.post('/logs', async (req, res) => {
  try {
    const { agent_id, task_id, log_level, message, action, duration_ms, metadata } = req.body;
    
    const result = await db.query(`
      INSERT INTO agent_logs (
        agent_id,
        task_id,
        log_level,
        message,
        action,
        duration_ms,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [agent_id, task_id, log_level, message, action, duration_ms, metadata]);
    
    broadcast({ type: 'log_created', log: result.rows[0] });
    
    res.json({ success: true, log: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATS & OVERVIEW
// ============================================

/**
 * GET /api/orchestration/stats
 * Get orchestration statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [agents, tasks, alerts, heartbeats] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'offline') as offline,
          COUNT(*) FILTER (WHERE status = 'paused') as paused
        FROM agents
      `),
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM task_queue
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'new') as new,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical
        FROM agent_alerts
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      db.query(`
        SELECT 
          COUNT(DISTINCT agent_id) as agents_reporting,
          AVG(cpu_usage) as avg_cpu,
          AVG(memory_usage_mb) as avg_memory
        FROM agent_heartbeats
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
      `)
    ]);
    
    res.json({
      success: true,
      stats: {
        agents: agents.rows[0],
        tasks: tasks.rows[0],
        alerts: alerts.rows[0],
        heartbeats: heartbeats.rows[0]
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
