// Force rebuild: 2026-03-14 13:49:49
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';

    }

    const lead = result.rows[0];

    // Validate required fields
    if (!lead.platform) {
      return res.status(400).json({
        success: false,
        error: 'Lead has no platform specified'
      });
    }

    if (!lead.post_url) {
      return res.status(400).json({
        success: false,
        error: 'Lead has no post URL'
      });
    }

    if (!lead.stage6_final_reply) {
      return res.status(400).json({
        success: false,
        error: 'Lead has no reply text (stage6_final_reply is empty)'
      });
    }

    console.log(`   Platform: ${lead.platform}`);
    console.log(`   Post URL: ${lead.post_url}`);
    console.log(`   Reply length: ${lead.stage6_final_reply.length} chars`);

    // Format Discord message
    const discordMessage = formatPostingMessage(lead);

    console.log(`\n📨 Sending to Discord channel...`);

    // Send to Discord
    const sendResult = await sendToDiscord(discordMessage);

    if (sendResult.success) {
      // Mark as triggered
      await pool.query(
        `UPDATE social_leads SET status = 'SENT', triggered_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [leadId]
      );

      console.log(`✅ Lead ${leadId} sent to Social Sender Agent`);

      return res.json({
        success: true,
        message: `Posted to Discord! Social Sender Agent will reply to ${lead.post_url}`
      });
    } else {
      console.error(`❌ Failed to send to Discord:`, sendResult.error);

      return res.status(500).json({
        success: false,
        error: `Failed to send to Discord: ${sendResult.error}`
      });
    }

  } catch (error: any) {
    console.error('Error in auto-send:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Discord webhook URL

// Format message for Discord
function formatPostingMessage(lead: any) {
  return `🚀 NEW LEAD TO POST

Platform: ${lead.platform}
Post URL: ${lead.post_url}
Lead ID: ${lead.id}

POST THIS EXACTLY:
---
${lead.stage6_final_reply}
---`;
}

// Send to Discord using axios
async function sendToDiscord(message: string) {
  try {
    await axios.post(DISCORD_WEBHOOK, { content: message });
    return { success: true };
  } catch (error: any) {
    console.error('Discord send error:', error.message);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// SEND TO SOCIAL SENDER AGENT
// Simple Discord message trigger - rebuilt from scratch
// ============================================================================

/**
 * POST /api/leads/:id/send
 * Sends lead to Social Sender Agent via Discord
 * This is the ONLY auto-send code - keep it simple!
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

