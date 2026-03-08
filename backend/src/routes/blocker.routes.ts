import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/blockers
 * List all blockers (defaults to open)
 */
router.get('/', async (req, res) => {
  try {
    const { status, blocker_type } = req.query;
    
    let query = `
      SELECT b.*, p.name as project_name, t.title as task_title
      FROM blockers b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN tasks t ON b.task_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    } else {
      query += ` AND b.status = 'open'`;
    }
    
    if (blocker_type) {
      query += ` AND b.blocker_type = $${paramIndex++}`;
      params.push(blocker_type);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, blockers: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/blockers
 * Create new blocker
 */
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      task_id,
      title,
      description,
      blocker_type
    } = req.body;
    
    if (!project_id || !title) {
      return res.status(400).json({ error: 'project_id and title are required' });
    }
    
    const result = await db.query(`
      INSERT INTO blockers (project_id, task_id, title, description, blocker_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [project_id, task_id, title, description, blocker_type]);
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (project_id, task_id, activity_type, description)
      VALUES ($1, $2, 'blocker_added', $3)
    `, [project_id, task_id, `Blocker added: ${title}`]);
    
    // Create notification for Tony
    await db.query(`
      INSERT INTO notifications (notification_type, title, message, project_id, priority)
      VALUES ('blocker', $1, $2, $3, 1)
    `, [
      `New blocker: ${title}`,
      description,
      project_id
    ]);
    
    broadcast({ type: 'blocker_created', blocker: result.rows[0] });
    
    res.json({ success: true, blocker: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/blockers/:id/resolve
 * Mark blocker as resolved
 */
router.put('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      UPDATE blockers
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blocker not found' });
    }
    
    // Log activity
    await db.query(`
      INSERT INTO activity_log (project_id, activity_type, description)
      VALUES ($1, 'blocker_resolved', $2)
    `, [result.rows[0].project_id, `Blocker resolved: ${result.rows[0].title}`]);
    
    broadcast({ type: 'blocker_resolved', blocker: result.rows[0] });
    
    res.json({ success: true, blocker: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/blockers/:id
 * Delete blocker
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM blockers WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blocker not found' });
    }
    
    broadcast({ type: 'blocker_deleted', blocker_id: id });
    
    res.json({ success: true, message: 'Blocker deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
