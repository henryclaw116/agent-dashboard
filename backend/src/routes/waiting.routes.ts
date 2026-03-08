import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/waiting
 * Get all items waiting on Tony
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM blockers
      WHERE blocker_type = 'waiting_on_tony' AND status = 'open'
      ORDER BY
        CASE
          WHEN priority = 1 THEN 1
          WHEN priority = 2 THEN 2
          ELSE 3
        END,
        created_at ASC
    `);

    res.json({ success: true, items: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/waiting
 * Add new item waiting on Tony
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      project_id,
      priority = 2,
      eta
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const result = await db.query(`
      INSERT INTO blockers (
        project_id,
        title,
        description,
        blocker_type,
        metadata
      )
      VALUES ($1, $2, $3, 'waiting_on_tony', $4)
      RETURNING *
    `, [
      project_id,
      title,
      description,
      JSON.stringify({ priority, eta })
    ]);

    // Create notification for Tony
    await db.query(`
      INSERT INTO notifications (
        notification_type,
        title,
        message,
        project_id,
        priority
      )
      VALUES ('blocker', $1, $2, $3, $4)
    `, [
      `Waiting on you: ${title}`,
      description,
      project_id,
      priority
    ]);

    // Broadcast update
    broadcast({ type: 'waiting_on_tony_added', item: result.rows[0] });

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/waiting/:id/complete
 * Mark item as complete
 */
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE blockers
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = $1 AND blocker_type = 'waiting_on_tony'
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Log activity
    await db.query(`
      INSERT INTO activity_log (
        project_id,
        activity_type,
        description
      )
      VALUES ($1, 'waiting_on_tony_completed', $2)
    `, [
      result.rows[0].project_id,
      `Tony completed: ${result.rows[0].title}`
    ]);

    broadcast({ type: 'waiting_on_tony_completed', item: result.rows[0] });

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
