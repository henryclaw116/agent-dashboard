import express from 'express';
import { db } from '../server';

const router = express.Router();

/**
 * GET /api/activity
 * Get activity log with filters
 */
router.get('/', async (req, res) => {
  try {
    const { project_id, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT a.*, p.name as project_name
      FROM activity_log a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (project_id) {
      query += ` AND a.project_id = $${paramIndex++}`;
      params.push(project_id);
    }
    
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM activity_log WHERE 1=1';
    const countParams: any[] = [];
    if (project_id) {
      countQuery += ' AND project_id = $1';
      countParams.push(project_id);
    }
    const countResult = await db.query(countQuery, countParams);
    
    res.json({
      success: true,
      activity: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/activity
 * Log new activity
 */
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      task_id,
      agent_name,
      activity_type,
      description,
      metadata
    } = req.body;
    
    if (!project_id || !activity_type) {
      return res.status(400).json({ error: 'project_id and activity_type are required' });
    }
    
    const result = await db.query(`
      INSERT INTO activity_log (project_id, task_id, agent_name, activity_type, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [project_id, task_id, agent_name, activity_type, description, metadata ? JSON.stringify(metadata) : null]);
    
    res.json({ success: true, activity: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
