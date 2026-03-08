import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/viral-content/ideas
 * Get viral content ideas researched by agent
 */
router.get('/ideas', async (req, res) => {
  try {
    const { status, platform } = req.query;
    
    let query = 'SELECT * FROM viral_ideas WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (platform) {
      query += ` AND platform = $${paramIndex++}`;
      params.push(platform);
    }
    
    query += ' ORDER BY priority ASC, researched_at DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, ideas: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/viral-content/ideas
 * Agent submits viral content idea
 */
router.post('/ideas', async (req, res) => {
  try {
    const {
      platform,
      source_url,
      title,
      description,
      why_viral,
      engagement_metrics,
      rlt_angle,
      suggested_format,
      estimated_effort,
      priority,
      researched_by,
      tags,
      trending_topic
    } = req.body;
    
    if (!platform || !title || !rlt_angle) {
      return res.status(400).json({ error: 'platform, title, and rlt_angle are required' });
    }
    
    const result = await db.query(`
      INSERT INTO viral_ideas (
        platform, source_url, title, description, why_viral,
        engagement_metrics, rlt_angle, suggested_format, estimated_effort,
        priority, researched_by, tags, trending_topic
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      platform, source_url, title, description, why_viral,
      engagement_metrics ? JSON.stringify(engagement_metrics) : null,
      rlt_angle, suggested_format, estimated_effort, priority || 2,
      researched_by, tags, trending_topic
    ]);
    
    // Create notification for Tony
    await db.query(`
      INSERT INTO notifications (
        notification_type, title, message, priority
      )
      VALUES ('viral_idea', $1, $2, $3)
    `, [
      `New viral content idea: ${title}`,
      `${platform} - ${rlt_angle}`,
      priority || 2
    ]);
    
    broadcast({ type: 'viral_idea_submitted', idea: result.rows[0] });
    
    res.json({ success: true, idea: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/viral-content/ideas/:id/review
 * Tony approves or rejects viral idea
 */
router.put('/ideas/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body; // 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    
    const result = await db.query(`
      UPDATE viral_ideas
      SET status = $1,
          reviewed_by = 'tony',
          reviewed_at = NOW(),
          review_notes = $2
      WHERE id = $3
      RETURNING *
    `, [status, review_notes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    
    broadcast({ type: 'viral_idea_reviewed', idea: result.rows[0] });
    
    res.json({ success: true, idea: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/viral-content/schedule
 * Get posting schedule
 */
router.get('/schedule', async (req, res) => {
  try {
    const { status, platform, date_from, date_to } = req.query;
    
    let query = `
      SELECT ps.*, sc.title, sc.content_type
      FROM posting_schedule ps
      LEFT JOIN social_content sc ON ps.content_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND ps.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (platform) {
      query += ` AND ps.platform = $${paramIndex++}`;
      params.push(platform);
    }
    
    if (date_from) {
      query += ` AND ps.scheduled_for >= $${paramIndex++}`;
      params.push(date_from);
    }
    
    if (date_to) {
      query += ` AND ps.scheduled_for <= $${paramIndex++}`;
      params.push(date_to);
    }
    
    query += ' ORDER BY ps.scheduled_for ASC';
    
    const result = await db.query(query, params);
    res.json({ success: true, schedule: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/viral-content/schedule
 * Agent schedules a post
 */
router.post('/schedule', async (req, res) => {
  try {
    const {
      content_id,
      platform,
      scheduled_for,
      caption,
      hashtags,
      mentions,
      location,
      scheduled_by
    } = req.body;
    
    if (!content_id || !platform || !scheduled_for) {
      return res.status(400).json({ error: 'content_id, platform, and scheduled_for are required' });
    }
    
    const result = await db.query(`
      INSERT INTO posting_schedule (
        content_id, platform, scheduled_for, caption, hashtags,
        mentions, location, scheduled_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      content_id, platform, scheduled_for, caption, hashtags,
      mentions, location, scheduled_by
    ]);
    
    broadcast({ type: 'post_scheduled', schedule: result.rows[0] });
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/viral-content/schedule/:id/approve
 * Tony approves scheduled post
 */
router.put('/schedule/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      UPDATE posting_schedule
      SET status = 'approved',
          approved_by = 'tony',
          approved_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled post not found' });
    }
    
    broadcast({ type: 'post_approved', schedule: result.rows[0] });
    
    res.json({ success: true, schedule: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/viral-content/daily-plan
 * Get daily posting plans
 */
router.get('/daily-plan', async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let query = 'SELECT * FROM daily_posting_plan WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (date) {
      query += ` AND plan_date = $${paramIndex++}`;
      params.push(date);
    }
    
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    
    query += ' ORDER BY plan_date DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, plans: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/viral-content/daily-plan
 * Agent creates daily posting plan
 */
router.post('/daily-plan', async (req, res) => {
  try {
    const {
      plan_date,
      total_posts,
      platforms,
      created_by,
      notes,
      scheduled_post_ids // Array of posting_schedule IDs
    } = req.body;
    
    if (!plan_date) {
      return res.status(400).json({ error: 'plan_date is required' });
    }
    
    // Create plan
    const planResult = await db.query(`
      INSERT INTO daily_posting_plan (
        plan_date, total_posts, platforms, created_by, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending_approval')
      RETURNING *
    `, [
      plan_date, total_posts, JSON.stringify(platforms),
      created_by, notes
    ]);
    
    const plan = planResult.rows[0];
    
    // Link scheduled posts
    if (scheduled_post_ids && scheduled_post_ids.length > 0) {
      for (let i = 0; i < scheduled_post_ids.length; i++) {
        await db.query(`
          INSERT INTO plan_posts (plan_id, scheduled_post_id, post_order)
          VALUES ($1, $2, $3)
        `, [plan.id, scheduled_post_ids[i], i + 1]);
      }
    }
    
    // Notify Tony
    await db.query(`
      INSERT INTO notifications (
        notification_type, title, message, priority
      )
      VALUES ('daily_plan', $1, $2, 2)
    `, [
      `Daily posting plan for ${plan_date}`,
      `${total_posts} posts across ${Object.keys(platforms || {}).length} platforms`
    ]);
    
    broadcast({ type: 'daily_plan_submitted', plan });
    
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/viral-content/daily-plan/:id/approve
 * Tony approves daily plan
 */
router.put('/daily-plan/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      UPDATE daily_posting_plan
      SET status = 'approved',
          approved_by = 'tony',
          approved_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    // Also approve all scheduled posts in the plan
    await db.query(`
      UPDATE posting_schedule
      SET status = 'approved',
          approved_by = 'tony',
          approved_at = NOW()
      WHERE id IN (
        SELECT scheduled_post_id FROM plan_posts WHERE plan_id = $1
      )
      AND status = 'scheduled'
    `, [id]);
    
    broadcast({ type: 'daily_plan_approved', plan: result.rows[0] });
    
    res.json({ success: true, plan: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/viral-content/trending
 * Get trending topics
 */
router.get('/trending', async (req, res) => {
  try {
    const { platform, status = 'active' } = req.query;
    
    let query = 'SELECT * FROM trending_topics WHERE status = $1';
    const params: any[] = [status];
    
    if (platform) {
      query += ' AND platform = $2';
      params.push(platform);
    }
    
    query += ' ORDER BY relevance_to_rlt DESC, trend_score DESC';
    
    const result = await db.query(query, params);
    res.json({ success: true, trending: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
