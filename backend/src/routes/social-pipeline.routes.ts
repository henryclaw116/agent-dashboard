import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function createSocialPipelineRouter(pool: Pool): Router {
  const router = Router();

  // Get dashboard summary (for main dashboard cards)
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM social_pipeline_summary');
      res.json(result.rows[0] || {});
    } catch (error) {
      console.error('Error fetching social pipeline summary:', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // Get leads pending approval
  router.get('/leads/pending', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT * FROM leads_ready_for_approval
        ORDER BY stage2_score DESC
        LIMIT 50
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching pending leads:', error);
      res.status(500).json({ error: 'Failed to fetch pending leads' });
    }
  });

  // Get leads by status
  router.get('/leads/by-status/:status', async (req: Request, res: Response) => {
    try {
      const { status } = req.params;
      const result = await pool.query(`
        SELECT 
          id,
          platform,
          username,
          post_url,
          post_excerpt,
          stage2_score,
          stage2_tier,
          stage2_pain_category,
          stage6_final_reply_text,
          scanned_at,
          approved_at,
          sent_at
        FROM social_leads
        WHERE stage5_final_status = $1
        ORDER BY scanned_at DESC
        LIMIT 100
      `, [status]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leads by status:', error);
      res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  // Get performance metrics
  router.get('/performance', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM pipeline_performance');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch performance' });
    }
  });

  // Get daily stats (for charts)
  router.get('/stats/daily', async (req: Request, res: Response) => {
    try {
      const { days = 30 } = req.query;
      const result = await pool.query(`
        SELECT * FROM pipeline_stats_daily
        WHERE stat_date >= CURRENT_DATE - $1::INTEGER
        ORDER BY stat_date DESC
      `, [days]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      res.status(500).json({ error: 'Failed to fetch daily stats' });
    }
  });

  // Approve a lead
  router.post('/leads/:id/approve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approved_by = 1 } = req.body; // Default to agent ID 1 (Tony)
      
      const result = await pool.query(`
        UPDATE social_leads
        SET 
          approved_at = NOW(),
          approved_by = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id, approved_by]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json({ success: true, lead: result.rows[0] });
    } catch (error) {
      console.error('Error approving lead:', error);
      res.status(500).json({ error: 'Failed to approve lead' });
    }
  });

  // Reject a lead
  router.post('/leads/:id/reject', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        UPDATE social_leads
        SET 
          stage5_final_status = 'REJECTED',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      res.json({ success: true, lead: result.rows[0] });
    } catch (error) {
      console.error('Error rejecting lead:', error);
      res.status(500).json({ error: 'Failed to reject lead' });
    }
  });

  // Edit lead reply
  router.put('/leads/:id/reply', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reply_text } = req.body;
      
      const result = await pool.query(`
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
    } catch (error) {
      console.error('Error updating reply:', error);
      res.status(500).json({ error: 'Failed to update reply' });
    }
  });

  // Get crawl schedule
  router.get('/crawl-schedule', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT * FROM crawl_schedule
        WHERE active = true
        ORDER BY tier ASC, platform ASC, location ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching crawl schedule:', error);
      res.status(500).json({ error: 'Failed to fetch crawl schedule' });
    }
  });

  return router;
}
