import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /api/social-leads - Create new lead (called by tower scanner)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      platform,
      platform_id,
      post_url,
      author_username,
      author_url,
      post_content,
      post_timestamp,
      lead_score,
      category,
      intent,
      red_flags,
      key_phrases,
      experience_level,
      draft_response
    } = req.body;

    // Validation
    if (!platform || !platform_id || !post_url || !post_content) {
      return res.status(400).json({ 
        error: 'Missing required fields: platform, platform_id, post_url, post_content' 
      });
    }

    const result = await pool.query(`
      INSERT INTO social_leads (
        platform, platform_id, post_url, author_username, author_url,
        post_content, post_timestamp, lead_score, category, intent,
        red_flags, key_phrases, experience_level, draft_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (platform_id) DO UPDATE SET
        lead_score = EXCLUDED.lead_score,
        draft_response = EXCLUDED.draft_response,
        updated_at = NOW()
      RETURNING *
    `, [
      platform, platform_id, post_url, author_username, author_url,
      post_content, post_timestamp, lead_score, category, intent,
      red_flags, key_phrases, experience_level, draft_response
    ]);

    res.status(201).json({ success: true, lead: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead', details: error.message });
  }
});

// GET /api/social-leads - List all leads with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,        // Filter by response_status
      min_score,     // Minimum lead_score
      platform,      // Filter by platform
      limit = 50,    // Results per page
      offset = 0     // Pagination offset
    } = req.query;

    let query = 'SELECT * FROM social_leads WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND response_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (min_score) {
      query += ` AND lead_score >= $${paramIndex}`;
      params.push(Number(min_score));
      paramIndex++;
    }

    if (platform) {
      query += ` AND platform = $${paramIndex}`;
      params.push(platform);
      paramIndex++;
    }

    query += ` ORDER BY lead_score DESC, discovered_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM social_leads WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND response_status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (min_score) {
      countQuery += ` AND lead_score >= $${countParamIndex}`;
      countParams.push(Number(min_score));
      countParamIndex++;
    }

    if (platform) {
      countQuery += ` AND platform = $${countParamIndex}`;
      countParams.push(platform);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      leads: result.rows,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + result.rows.length < total
      }
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads', details: error.message });
  }
});

// GET /api/social-leads/stats - Get summary statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE response_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE response_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE response_status = 'sent') as sent,
        COUNT(*) FILTER (WHERE response_status = 'archived') as archived,
        COUNT(*) FILTER (WHERE lead_score >= 80) as high_priority,
        COUNT(*) FILTER (WHERE lead_score >= 60 AND lead_score < 80) as medium_priority,
        COUNT(*) FILTER (WHERE converted_to_trial = true) as converted,
        ROUND(AVG(lead_score)) as avg_score,
        COUNT(DISTINCT platform) as platforms_monitored
      FROM social_leads
    `);

    res.json({ success: true, stats: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// GET /api/social-leads/:id - Get single lead by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM social_leads WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, lead: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead', details: error.message });
  }
});

// PATCH /api/social-leads/:id - Update lead (approve response, mark as sent, etc.)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'approved_response',
      'response_status',
      'response_sent_at',
      'response_error',
      'engagement_score',
      'has_follow_up',
      'follow_up_count',
      'converted_to_trial',
      'converted_at',
      'assigned_to',
      'reviewed_by',
      'reviewed_at',
      'archived_reason'
    ];

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id); // Add ID as last parameter
    const query = `
      UPDATE social_leads 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, lead: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead', details: error.message });
  }
});

// POST /api/social-leads/:id/approve - Approve draft response for posting
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved_response, reviewed_by } = req.body;

    const result = await pool.query(`
      UPDATE social_leads
      SET 
        approved_response = $1,
        response_status = 'approved',
        reviewed_by = $2,
        reviewed_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [approved_response || null, reviewed_by || 'Tony', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ 
      success: true, 
      message: 'Response approved and ready for posting',
      lead: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error approving lead:', error);
    res.status(500).json({ error: 'Failed to approve lead', details: error.message });
  }
});

// POST /api/social-leads/:id/sent - Mark response as successfully sent
router.post('/:id/sent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { engagement_score } = req.body;

    const result = await pool.query(`
      UPDATE social_leads
      SET 
        response_status = 'sent',
        response_sent_at = NOW(),
        engagement_score = COALESCE($1, 0)
      WHERE id = $2
      RETURNING *
    `, [engagement_score, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ 
      success: true, 
      message: 'Lead marked as sent',
      lead: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error marking lead as sent:', error);
    res.status(500).json({ error: 'Failed to mark lead as sent', details: error.message });
  }
});

// POST /api/social-leads/:id/archive - Archive a lead
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE social_leads
      SET 
        response_status = 'archived',
        archived_reason = $1
      WHERE id = $2
      RETURNING *
    `, [reason || 'Archived by user', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ 
      success: true, 
      message: 'Lead archived',
      lead: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error archiving lead:', error);
    res.status(500).json({ error: 'Failed to archive lead', details: error.message });
  }
});

// DELETE /api/social-leads/:id - Delete a lead (hard delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM social_leads WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead', details: error.message });
  }
});

export default router;
