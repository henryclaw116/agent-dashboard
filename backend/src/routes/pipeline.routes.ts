import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function createPipelineRouter(pool: Pool): Router {
  const router = Router();

  // Get active tasks (in progress, queued, blocked)
  router.get('/active-tasks', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM active_tasks');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching active tasks:', error);
      res.status(500).json({ error: 'Failed to fetch active tasks' });
    }
  });

  // Get agent health summary
  router.get('/agent-health', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM agent_health_summary');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching agent health:', error);
      res.status(500).json({ error: 'Failed to fetch agent health' });
    }
  });

  // Get recurring tasks schedule
  router.get('/recurring-tasks', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT ON (task_name) *
        FROM recurring_tasks_schedule
        ORDER BY task_name, last_run DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching recurring tasks:', error);
      res.status(500).json({ error: 'Failed to fetch recurring tasks' });
    }
  });

  // Get task bottlenecks
  router.get('/bottlenecks', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM task_bottlenecks LIMIT 10');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching bottlenecks:', error);
      res.status(500).json({ error: 'Failed to fetch bottlenecks' });
    }
  });

  // Get today's pipeline summary
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM today_pipeline_summary');
      res.json(result.rows[0] || {});
    } catch (error) {
      console.error('Error fetching pipeline summary:', error);
      res.status(500).json({ error: 'Failed to fetch pipeline summary' });
    }
  });

  // Get task timeline (for calendar view)
  router.get('/timeline', async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query;
      
      const query = `
        SELECT 
          id,
          task_name,
          agent_name,
          status,
          priority,
          started_at,
          completed_at,
          expected_completion,
          progress_percent,
          is_recurring,
          recurrence_pattern
        FROM task_execution
        WHERE 
          (started_at >= $1 OR expected_completion >= $1)
          AND (started_at <= $2 OR expected_completion <= $2)
        ORDER BY started_at ASC
      `;
      
      const result = await pool.query(query, [
        start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ error: 'Failed to fetch timeline' });
    }
  });

  // Update task status
  router.put('/tasks/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, progress_percent, blocked_reason } = req.body;

      const result = await pool.query(`
        UPDATE task_execution
        SET 
          status = COALESCE($1, status),
          progress_percent = COALESCE($2, progress_percent),
          blocked_reason = COALESCE($3, blocked_reason),
          updated_at = NOW(),
          completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
        WHERE id = $4
        RETURNING *
      `, [status, progress_percent, blocked_reason, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ success: true, task: result.rows[0] });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ error: 'Failed to update task status' });
    }
  });

  // Create new task
  router.post('/tasks', async (req: Request, res: Response) => {
    try {
      const {
        task_name,
        agent_id,
        agent_name,
        priority = 'medium',
        expected_completion,
        is_recurring = false,
        recurrence_pattern,
        metadata
      } = req.body;

      const result = await pool.query(`
        INSERT INTO task_execution (
          task_name,
          agent_id,
          agent_name,
          status,
          priority,
          expected_completion,
          is_recurring,
          recurrence_pattern,
          metadata
        ) VALUES ($1, $2, $3, 'queued', $4, $5, $6, $7, $8)
        RETURNING *
      `, [task_name, agent_id, agent_name, priority, expected_completion, is_recurring, recurrence_pattern, metadata]);

      res.json({ success: true, task: result.rows[0] });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update agent status
  router.put('/agents/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, current_task_id, health_score } = req.body;

      const result = await pool.query(`
        INSERT INTO agent_status (
          agent_id,
          agent_name,
          status,
          current_task_id,
          last_heartbeat,
          health_score,
          updated_at
        ) VALUES (
          $1,
          (SELECT name FROM agents WHERE id = $1),
          COALESCE($2, 'idle'),
          $3,
          NOW(),
          COALESCE($4, 100),
          NOW()
        )
        ON CONFLICT (agent_id) DO UPDATE SET
          status = COALESCE($2, agent_status.status),
          current_task_id = COALESCE($3, agent_status.current_task_id),
          last_heartbeat = NOW(),
          health_score = COALESCE($4, agent_status.health_score),
          last_activity = NOW(),
          updated_at = NOW()
        RETURNING *
      `, [id, status, current_task_id, health_score]);

      res.json({ success: true, agent: result.rows[0] });
    } catch (error) {
      console.error('Error updating agent status:', error);
      res.status(500).json({ error: 'Failed to update agent status' });
    }
  });

  return router;
}
