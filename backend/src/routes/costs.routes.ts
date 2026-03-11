import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function createCostsRouter(pool: Pool): Router {
  const router = Router();

  // Get today's total cost
  router.get('/today', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          COALESCE(SUM(cost_usd), 0) as total_cost,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COUNT(*) as request_count
        FROM token_usage
        WHERE DATE(timestamp) = CURRENT_DATE
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching today costs:', error);
      res.status(500).json({ error: 'Failed to fetch today costs' });
    }
  });

  // Get this month's total cost
  router.get('/month', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          COALESCE(SUM(cost_usd), 0) as total_cost,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COUNT(*) as request_count
        FROM token_usage
        WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching month costs:', error);
      res.status(500).json({ error: 'Failed to fetch month costs' });
    }
  });

  // Get cost breakdown by agent (today)
  router.get('/by-agent/today', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          agent_name,
          agent_id,
          COALESCE(SUM(cost_usd), 0) as cost_today,
          COALESCE(SUM(total_tokens), 0) as tokens_today,
          COUNT(*) as requests_today
        FROM token_usage
        WHERE DATE(timestamp) = CURRENT_DATE
        GROUP BY agent_name, agent_id
        ORDER BY cost_today DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching agent costs (today):', error);
      res.status(500).json({ error: 'Failed to fetch agent costs' });
    }
  });

  // Get cost breakdown by agent (this month)
  router.get('/by-agent/month', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          agent_name,
          agent_id,
          COALESCE(SUM(cost_usd), 0) as cost_month,
          COALESCE(SUM(total_tokens), 0) as tokens_month,
          COUNT(*) as requests_month
        FROM token_usage
        WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY agent_name, agent_id
        ORDER BY cost_month DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching agent costs (month):', error);
      res.status(500).json({ error: 'Failed to fetch agent costs' });
    }
  });

  // Get all-time cost by agent
  router.get('/by-agent/all-time', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT 
          agent_name,
          agent_id,
          COALESCE(SUM(cost_usd), 0) as total_cost,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COUNT(*) as total_requests,
          MAX(timestamp) as last_activity
        FROM token_usage
        GROUP BY agent_name, agent_id
        ORDER BY total_cost DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching all-time agent costs:', error);
      res.status(500).json({ error: 'Failed to fetch agent costs' });
    }
  });

  // Record token usage (called by agents or monitoring service)
  router.post('/record', async (req: Request, res: Response) => {
    try {
      const {
        agent_id,
        agent_name,
        session_key,
        model,
        input_tokens,
        output_tokens,
        cost_usd
      } = req.body;

      const total_tokens = input_tokens + output_tokens;

      await pool.query(`
        INSERT INTO token_usage (
          agent_id,
          agent_name,
          session_key,
          model,
          input_tokens,
          output_tokens,
          total_tokens,
          cost_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [agent_id, agent_name, session_key, model, input_tokens, output_tokens, total_tokens, cost_usd]);

      res.json({ success: true, message: 'Token usage recorded' });
    } catch (error) {
      console.error('Error recording token usage:', error);
      res.status(500).json({ error: 'Failed to record token usage' });
    }
  });

  // Get cost history (daily for last N days)
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      
      const result = await pool.query(`
        SELECT 
          DATE(timestamp) as date,
          COALESCE(SUM(cost_usd), 0) as total_cost,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COUNT(*) as request_count
        FROM token_usage
        WHERE timestamp >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching cost history:', error);
      res.status(500).json({ error: 'Failed to fetch cost history' });
    }
  });

  return router;
}
