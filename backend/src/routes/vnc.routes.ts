/**
 * VNC WebSocket Proxy Routes
 * Proxies VNC traffic from browser (noVNC) to VNC server
 */

import { Router } from 'express';
import { db } from '../server';

const router = Router();

/**
 * GET /api/vnc/console/:id/info
 * Get VNC connection info for a console
 */
router.get('/console/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT id, name, vnc_host, vnc_port, vnc_enabled FROM consoles WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Console not found' });
    }
    
    const console = result.rows[0];
    
    if (!console.vnc_enabled) {
      return res.status(403).json({ error: 'VNC not enabled for this console' });
    }
    
    res.json({
      success: true,
      console: {
        id: console.id,
        name: console.name,
        vnc_host: console.vnc_host,
        vnc_port: console.vnc_port
      }
    });
  } catch (error: any) {
    console.error('Error fetching VNC info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/vnc/console/:id/last-connected
 * Update last connected timestamp
 */
router.put('/console/:id/last-connected', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query(
      'UPDATE consoles SET vnc_last_connected = NOW() WHERE id = $1',
      [id]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating last connected:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
