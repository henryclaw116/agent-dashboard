import express, { Request, Response } from 'express';
import pool from '../db';

const router = express.Router();

// GET /api/settings/:key - Get a setting value
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      'SELECT value FROM system_settings WHERE key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, value: null });
    }
    
    res.json({ 
      success: true, 
      value: result.rows[0].value 
    });
  } catch (error: any) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting', details: error.message });
  }
});

// PUT /api/settings/:key - Update a setting value
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, updated_by } = req.body;
    
    const result = await pool.query(`
      INSERT INTO system_settings (key, value, updated_by, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = $2,
        updated_by = $3,
        updated_at = NOW()
      RETURNING *
    `, [key, value, updated_by || 'user']);
    
    res.json({ 
      success: true, 
      setting: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting', details: error.message });
  }
});

export default router;
