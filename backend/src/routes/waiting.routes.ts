import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/waiting
 * Get all items waiting on Tony (including social pipeline leads)
 */
router.get('/', async (req, res) => {
  try {
    // Get traditional blockers
    const blockersResult = await db.query(`
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

    // Get social pipeline leads pending approval
    const leadsResult = await db.query(`
      SELECT 
        id,
        platform,
        username,
        post_url,
        post_text as original_message,
        post_excerpt,
        stage2_score,
        stage2_tier,
        stage2_pain_category,
        stage2_pain_summary,
        stage3_final_route,
        stage3_landing_page_title,
        stage3_root_pain,
        stage4_reply_text as planned_response,
        stage6_bitly_short_url,
        stage6_final_reply_text,
        scanned_at as created_at,
        'social_lead' as item_type
      FROM social_leads
      WHERE stage6_ready_for_dashboard = true
        AND approved_at IS NULL
        AND stage5_final_status = 'APPROVED'
      ORDER BY stage2_score DESC, scanned_at DESC
      LIMIT 50
    `);

    // Combine both types
    const items = [
      ...blockersResult.rows.map(b => ({ ...b, item_type: 'blocker' })),
      ...leadsResult.rows
    ];

    res.json({ success: true, items });
  } catch (error: any) {
    console.error('Error fetching waiting items:', error);
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

/**
 * PUT /api/waiting/social-lead/:id/approve
 * Approve a social pipeline lead
 */
router.put('/social-lead/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { edited_reply } = req.body;

    // Update the lead
    const result = await db.query(`
      UPDATE social_leads
      SET 
        approved_at = NOW(),
        approved_by = 1,
        stage6_final_reply_text = COALESCE($2, stage6_final_reply_text),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, edited_reply]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Log activity
    await db.query(`
      INSERT INTO activity_log (
        project_id,
        activity_type,
        description
      )
      VALUES (NULL, 'social_lead_approved', $1)
    `, [
      `Tony approved social lead: ${result.rows[0].platform} - @${result.rows[0].username}`
    ]);

    broadcast({ type: 'social_lead_approved', lead: result.rows[0] });

    res.json({ success: true, lead: result.rows[0] });
  } catch (error: any) {
    console.error('Error approving lead:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/waiting/social-lead/:id/reject
 * Reject a social pipeline lead
 */
router.put('/social-lead/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(`
      UPDATE social_leads
      SET 
        stage5_final_status = 'REJECTED',
        stage5_block_reason = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, reason || 'Rejected by Tony']);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    broadcast({ type: 'social_lead_rejected', lead: result.rows[0] });

    res.json({ success: true, lead: result.rows[0] });
  } catch (error: any) {
    console.error('Error rejecting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/waiting/social-lead/:id/edit
 * Edit the reply for a social pipeline lead
 */
router.put('/social-lead/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text) {
      return res.status(400).json({ error: 'reply_text is required' });
    }

    const result = await db.query(`
      UPDATE social_leads
      SET 
        stage6_final_reply_text = $2,
        stage4_reply_text = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, reply_text]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, lead: result.rows[0] });
  } catch (error: any) {
    console.error('Error editing lead reply:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
