import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// ============================================================================
// SEND TO SOCIAL SENDER AGENT
// Simple Discord message trigger
// ============================================================================

/**
 * POST /api/social-leads/:id/send
 * Sends lead to Social Sender Agent via Discord
 */
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