import { Router, Request, Response } from 'express';
import { db } from '../server';

const router = Router();

// Get all consoles
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT a.id) as agent_count
      FROM consoles c
      LEFT JOIN agents a ON c.id = a.console_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    
    res.json({ success: true, consoles: result.rows });
  } catch (error) {
    console.error('Get consoles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch consoles' });
  }
});

// Get console by ID with agents
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get console
    const consoleResult = await db.query('SELECT * FROM consoles WHERE id = $1', [id]);
    if (consoleResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Console not found' });
    }
    
    // Get agents on this console
    const agentsResult = await db.query(
      'SELECT * FROM agents WHERE console_id = $1 ORDER BY name',
      [id]
    );
    
    res.json({
      success: true,
      console: consoleResult.rows[0],
      agents: agentsResult.rows
    });
  } catch (error) {
    console.error('Get console error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch console' });
  }
});

// Create console
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, description, connection_info, capabilities } = req.body;
    
    const result = await db.query(
      `INSERT INTO consoles (name, type, description, connection_info, capabilities)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, type || null, description || null, connection_info || null, capabilities || []]
    );
    
    res.json({ success: true, console: result.rows[0] });
  } catch (error) {
    console.error('Create console error:', error);
    res.status(500).json({ success: false, error: 'Failed to create console' });
  }
});

// Update console
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, description, status, connection_info, capabilities, last_heartbeat } = req.body;
    
    const result = await db.query(
      `UPDATE consoles 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           connection_info = COALESCE($5, connection_info),
           capabilities = COALESCE($6, capabilities),
           last_heartbeat = COALESCE($7, last_heartbeat),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, type, description, status, connection_info, capabilities, last_heartbeat, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Console not found' });
    }
    
    res.json({ success: true, console: result.rows[0] });
  } catch (error) {
    console.error('Update console error:', error);
    res.status(500).json({ success: false, error: 'Failed to update console' });
  }
});

// Delete console
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM consoles WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete console error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete console' });
  }
});

// Heartbeat endpoint (for consoles to ping in)
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, capabilities } = req.body;
    
    await db.query(
      `UPDATE consoles 
       SET last_heartbeat = CURRENT_TIMESTAMP,
           status = COALESCE($1, status),
           capabilities = COALESCE($2, capabilities)
       WHERE id = $3`,
      [status, capabilities, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, error: 'Failed to update heartbeat' });
  }
});

export default router;
