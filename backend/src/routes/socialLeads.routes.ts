import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// ============================================================================
// GET ALL LEADS
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, platform, timeRange } = req.query;
    
    let query = 'SELECT * FROM social_leads WHERE 1=1';
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    if (platform) {
      params.push(platform);
      query += ` AND platform = $${params.length}`;
    }
    
    if (timeRange === 'daily') {
      query += ` AND created_at >= NOW() - INTERVAL '24 hours'`;
    } else if (timeRange === 'weekly') {
      query += ` AND created_at >= NOW() - INTERVAL '7 days'`;
    }
    
    query += ' ORDER BY created_at DESC LIMIT 1000';
    
    const result = await pool.query(query, params);
    
    return res.json(result.rows);
    
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET ONE LEAD
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    
    const result = await pool.query(
      'SELECT * FROM social_leads WHERE id = $1',
      [leadId]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    return res.json(result.rows[0]);
    
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// UPDATE LEAD
// ============================================================================

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const updates = req.body;
    
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    values.push(leadId);
    
    const query = `
      UPDATE social_leads 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $${values.length}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    return res.json(result.rows[0]);
    
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ARCHIVE LEAD
// ============================================================================

router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const { reason } = req.body;
    
    const result = await pool.query(
      `UPDATE social_leads 
       SET status = 'ARCHIVED', 
           archived_at = NOW(), 
           archive_reason = $1,
           updated_at = NOW() 
       WHERE id = $2
       RETURNING *`,
      [reason || 'Archived by user', leadId]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    return res.json({ success: true, lead: result.rows[0] });
    
  } catch (error: any) {
    console.error('Error archiving lead:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SEND TO SOCIAL SENDER AGENT
// ============================================================================

router.post('/:id/send', async (req: Request, res: Response) => {
  const leadId = parseInt(req.params.id);
  
  try {
    console.log(`[SEND] Lead ${leadId} - Starting...`);
    
    // 1. Get lead from database
    const result = await pool.query(
      `SELECT id, platform, post_url, stage6_final_reply 
       FROM social_leads 
       WHERE id = $1`,
      [leadId]
    );
    
    if (!result.rows[0]) {
      console.log(`[SEND] Lead ${leadId} - NOT FOUND`);
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const lead = result.rows[0];
    console.log(`[SEND] Lead ${leadId} - Platform: ${lead.platform}, URL: ${lead.post_url}`);
    
    // 2. Validate required fields
    if (!lead.platform || !lead.post_url || !lead.stage6_final_reply) {
      console.log(`[SEND] Lead ${leadId} - MISSING FIELDS`);
      return res.status(400).json({ 
        error: 'Lead missing required fields',
        missing: {
          platform: !lead.platform,
          post_url: !lead.post_url,
          reply: !lead.stage6_final_reply
        }
      });
    }
    
    // 3. Format Discord message
    const discordMessage = `🚀 NEW LEAD TO POST

Platform: ${lead.platform}
Post URL: ${lead.post_url}
Lead ID: ${lead.id}

POST THIS EXACTLY:
---
${lead.stage6_final_reply}
---`;
    
    console.log(`[SEND] Lead ${leadId} - Discord message formatted (${discordMessage.length} chars)`);
    
    // 4. Send to Discord
    const WEBHOOK = 'https://discord.com/api/webhooks/1482413401111265332/hG20sp7JEDqGTTIyTM8taCkFNxRrxIW02zPoeR2ONb-IQd80-A0FC4piuLWgd5WTM2y9';
    
    const discordResponse = await axios.post(WEBHOOK, { content: discordMessage });
    
    if (discordResponse.status !== 204 && discordResponse.status !== 200) {
      console.log(`[SEND] Lead ${leadId} - Discord FAILED: ${discordResponse.status}`);
      throw new Error(`Discord returned ${discordResponse.status}`);
    }
    
    console.log(`[SEND] Lead ${leadId} - Discord message sent!`);
    
    // 5. Update lead status to SENT
    await pool.query(
      `UPDATE social_leads 
       SET status = 'SENT', triggered_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [leadId]
    );
    
    console.log(`[SEND] Lead ${leadId} - Status updated to SENT`);
    
    // 6. Success!
    return res.json({
      success: true,
      message: 'Sent to Social Sender Agent!',
      leadId: leadId,
      platform: lead.platform,
      postUrl: lead.post_url
    });
    
  } catch (error: any) {
    console.error(`[SEND] Lead ${leadId} - ERROR:`, error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      leadId: leadId
    });
  }
});

export default router;