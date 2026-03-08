import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM projects';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY priority ASC, created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, projects: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get project details with phases and tasks
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get project
    const project = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get phases
    const phases = await db.query(`
      SELECT * FROM project_phases
      WHERE project_id = $1
      ORDER BY phase_number ASC
    `, [id]);
    
    // Get tasks
    const tasks = await db.query(`
      SELECT * FROM tasks
      WHERE project_id = $1
      ORDER BY status ASC, priority ASC
    `, [id]);
    
    // Get blockers
    const blockers = await db.query(`
      SELECT * FROM blockers
      WHERE project_id = $1 AND status = 'open'
    `, [id]);
    
    // Get recent activity
    const activity = await db.query(`
      SELECT * FROM activity_log
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]);
    
    res.json({
      success: true,
      project: project.rows[0],
      phases: phases.rows,
      tasks: tasks.rows,
      blockers: blockers.rows,
      activity: activity.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      start_date,
      target_date,
      priority
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const result = await db.query(`
      INSERT INTO projects (name, description, start_date, target_date, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, start_date, target_date, priority || 2]);
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (project_id, activity_type, description)
      VALUES ($1, 'project_created', $2)
    `, [result.rows[0].id, `Project "${name}" created`]);
    
    // Broadcast update
    broadcast({ type: 'project_created', project: result.rows[0] });
    
    res.json({ success: true, project: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    
    const result = await db.query(`
      UPDATE projects
      SET ${setClause}
      WHERE id = $${fields.length + 1}
      RETURNING *
    `, [...values, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (project_id, activity_type, description, metadata)
      VALUES ($1, 'project_updated', $2, $3)
    `, [id, 'Project updated', JSON.stringify(updates)]);
    
    // Broadcast update
    broadcast({ type: 'project_updated', project: result.rows[0] });
    
    res.json({ success: true, project: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project (cascade deletes phases, tasks, etc.)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      DELETE FROM projects WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Broadcast update
    broadcast({ type: 'project_deleted', project_id: id });
    
    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
