import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/tasks
 * List tasks with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, project_id, assigned_to } = req.query;
    
    let query = 'SELECT t.*, p.name as project_name, a.name as agent_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN agents a ON t.agent_id = a.id WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (project_id) {
      query += ` AND t.project_id = $${paramIndex++}`;
      params.push(project_id);
    }
    
    if (assigned_to) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(assigned_to);
    }
    
    query += ' ORDER BY t.priority ASC, t.created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, tasks: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks
 * Create new task
 */
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      phase_id,
      title,
      description,
      priority,
      assigned_to,
      agent_id,
      estimated_hours,
      due_date
    } = req.body;
    
    if (!project_id || !title) {
      return res.status(400).json({ error: 'project_id and title are required' });
    }
    
    const result = await db.query(`
      INSERT INTO tasks (project_id, phase_id, title, description, priority, assigned_to, agent_id, estimated_hours, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [project_id, phase_id, title, description, priority || 2, assigned_to, agent_id, estimated_hours, due_date]);
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (project_id, task_id, activity_type, description, agent_name)
      VALUES ($1, $2, 'task_created', $3, $4)
    `, [project_id, result.rows[0].id, `Task created: ${title}`, assigned_to]);
    
    // Broadcast
    broadcast({ type: 'task_created', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If marking complete, set completed_at
    if (updates.status === 'complete' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    
    const result = await db.query(`
      UPDATE tasks
      SET ${setClause}
      WHERE id = $${fields.length + 1}
      RETURNING *
    `, [...values, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Log activity
    const activityType = updates.status === 'complete' ? 'task_completed' : 'task_updated';
    await db.query(`
      INSERT INTO activity_log (project_id, task_id, activity_type, description, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [result.rows[0].project_id, id, activityType, `Task updated: ${result.rows[0].title}`, JSON.stringify(updates)]);
    
    broadcast({ type: 'task_updated', task: result.rows[0] });
    
    res.json({ success: true, task: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    broadcast({ type: 'task_deleted', task_id: id });
    
    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
