import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../server';

const router = express.Router();

// Configure multer for statement uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/financials');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * GET /api/financials/overview
 * Get financial overview with latest metrics
 */
router.get('/overview', async (req, res) => {
  try {
    // Get current month metrics
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const currentMonth = await db.query(
      'SELECT * FROM monthly_metrics WHERE period = $1',
      [currentPeriod]
    );

    // Get last 6 months for trends
    const last6Months = await db.query(`
      SELECT * FROM monthly_metrics
      ORDER BY period DESC
      LIMIT 6
    `);

    // Get recent statements
    const recentStatements = await db.query(`
      SELECT id, statement_type, statement_period, file_name, uploaded_at, status
      FROM financial_statements
      ORDER BY uploaded_at DESC
      LIMIT 5
    `);

    // Calculate YTD totals
    const ytdYear = new Date().getFullYear();
    const ytd = await db.query(`
      SELECT 
        SUM(revenue_total) as ytd_revenue,
        SUM(expenses_total) as ytd_expenses,
        SUM(net_profit) as ytd_profit
      FROM monthly_metrics
      WHERE period LIKE $1
    `, [`${ytdYear}%`]);

    res.json({
      success: true,
      current_month: currentMonth.rows[0] || null,
      last_6_months: last6Months.rows,
      recent_statements: recentStatements.rows,
      ytd: ytd.rows[0]
    });
  } catch (error: any) {
    console.error('Overview fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financials/metrics/:period
 * Get metrics for a specific period (YYYY-MM)
 */
router.get('/metrics/:period', async (req, res) => {
  try {
    const { period } = req.params;
    
    const result = await db.query(
      'SELECT * FROM monthly_metrics WHERE period = $1',
      [period]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Period not found' });
    }

    res.json({ success: true, metrics: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/financials/metrics
 * Create or update monthly metrics
 */
router.post('/metrics', async (req, res) => {
  try {
    const {
      period, revenue_total, revenue_subscriptions, revenue_one_time,
      expenses_total, expenses_payroll, expenses_marketing, expenses_software,
      expenses_other, mrr, arr, active_subscribers, churn_rate
    } = req.body;

    const net_profit = (revenue_total || 0) - (expenses_total || 0);
    const profit_margin = revenue_total > 0 ? (net_profit / revenue_total) * 100 : 0;

    const result = await db.query(`
      INSERT INTO monthly_metrics (
        period, revenue_total, revenue_subscriptions, revenue_one_time,
        expenses_total, expenses_payroll, expenses_marketing, expenses_software, expenses_other,
        net_profit, profit_margin, mrr, arr, active_subscribers, churn_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (period) DO UPDATE SET
        revenue_total = $2, revenue_subscriptions = $3, revenue_one_time = $4,
        expenses_total = $5, expenses_payroll = $6, expenses_marketing = $7,
        expenses_software = $8, expenses_other = $9, net_profit = $10,
        profit_margin = $11, mrr = $12, arr = $13, active_subscribers = $14,
        churn_rate = $15, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      period, revenue_total, revenue_subscriptions, revenue_one_time,
      expenses_total, expenses_payroll, expenses_marketing, expenses_software, expenses_other,
      net_profit, profit_margin, mrr, arr, active_subscribers, churn_rate
    ]);

    res.json({ success: true, metrics: result.rows[0] });
  } catch (error: any) {
    console.error('Metrics save error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/financials/upload
 * Upload financial statement
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { statement_type, statement_period } = req.body;

    const result = await db.query(`
      INSERT INTO financial_statements (
        statement_type, statement_period, file_name, file_path, file_size
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      statement_type || 'bank',
      statement_period || new Date().toISOString().slice(0, 7),
      req.file.originalname,
      req.file.path,
      req.file.size
    ]);

    res.json({ success: true, statement: result.rows[0] });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financials/statements
 * List all financial statements
 */
router.get('/statements', async (req, res) => {
  try {
    const { type, period } = req.query;
    
    let query = 'SELECT * FROM financial_statements WHERE 1=1';
    const params: any[] = [];
    
    if (type) {
      params.push(type);
      query += ` AND statement_type = $${params.length}`;
    }
    
    if (period) {
      params.push(period);
      query += ` AND statement_period = $${params.length}`;
    }
    
    query += ' ORDER BY uploaded_at DESC';

    const result = await db.query(query, params);

    res.json({ success: true, statements: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/financials/statements/:id
 * Delete a financial statement
 */
router.delete('/statements/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get file path before deleting
    const statement = await db.query(
      'SELECT file_path FROM financial_statements WHERE id = $1',
      [id]
    );

    if (statement.rows.length > 0) {
      // Delete file
      try {
        fs.unlinkSync(statement.rows[0].file_path);
      } catch (err) {
        console.error('File delete error:', err);
      }
    }

    // Delete from database
    await db.query('DELETE FROM financial_statements WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/financials/trends
 * Get financial trends (last 12 months)
 */
router.get('/trends', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        period,
        revenue_total,
        expenses_total,
        net_profit,
        profit_margin,
        mrr,
        active_subscribers
      FROM monthly_metrics
      ORDER BY period DESC
      LIMIT 12
    `);

    // Reverse to get chronological order
    const trends = result.rows.reverse();

    res.json({ success: true, trends });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
