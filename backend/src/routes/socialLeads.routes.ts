import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';


import OpenAI from 'openai';
import autoPostingService from '../services/autoPosting.service';

const router = Router();


const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      stage,         // Filter by pipeline stage
      min_score,     // Minimum lead_score
      platform,      // Filter by platform
      limit = 1000,    // Results per page
      offset = 0,    // Pagination offset
      timeRange = 'all'  // Time filter: daily, weekly, or all
    } = req.query;

    let query = 'SELECT * FROM social_leads WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Time range filtering
    if (timeRange === 'daily') {
      query += " AND created_at >= NOW() - INTERVAL '24 hours'";
    } else if (timeRange === 'weekly') {
      query += " AND created_at >= NOW() - INTERVAL '7 days'";
    }
    // 'all' = no time filter

    // Stage filtering
    if (stage && stage !== 'all') {
      switch (stage) {
        case 'scanner':
          query += ` AND stage1_status = 'KEEP'`;
          break;
        case 'scorer':
          query += ` AND stage2_score IS NOT NULL`;
          break;
        case 'router':
          query += ` AND stage3_landing_url IS NOT NULL`;
          break;
        case 'writer':
          query += ` AND stage4_reply_text IS NOT NULL`;
          break;
        case 'dedup':
          query += ` AND stage5_status IS NOT NULL`;
          break;
        case 'tracker':
          query += ` AND stage6_short_link IS NOT NULL`;
          break;
        case 'ready':
          query += ` AND status = 'READY_TO_SEND'`;
          break;
        case 'sent':
          query += ` AND status = 'SENT'`;
          break;
      }
    }

    if (min_score) {
      query += ` AND stage2_score >= $${paramIndex}`;
      params.push(Number(min_score));
      paramIndex++;
    }

    if (platform) {
      query += ` AND platform = $${paramIndex}`;
      params.push(platform);
      paramIndex++;
    }

    query += ` ORDER BY stage2_score DESC, created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get stats for the current filter
    let countQuery = 'SELECT COUNT(*) FROM social_leads WHERE 1=1';
    const countParams: any[] = [];

    // Apply time filter to count
    if (timeRange === 'daily') {
      countQuery += " AND created_at >= NOW() - INTERVAL '24 hours'";
    } else if (timeRange === 'weekly') {
      countQuery += " AND created_at >= NOW() - INTERVAL '7 days'";
    }

    // Apply same stage filter for count
    if (stage && stage !== 'all') {
      switch (stage) {
        case 'scanner':
          countQuery += ` AND stage1_status = 'KEEP'`;
          break;
        case 'scorer':
          countQuery += ` AND stage2_score IS NOT NULL`;
          break;
        case 'router':
          countQuery += ` AND stage3_landing_url IS NOT NULL`;
          break;
        case 'writer':
          countQuery += ` AND stage4_reply_text IS NOT NULL`;
          break;
        case 'dedup':
          countQuery += ` AND stage5_status IS NOT NULL`;
          break;
        case 'tracker':
          countQuery += ` AND stage6_short_link IS NOT NULL`;
          break;
        case 'ready':
          countQuery += ` AND status = 'READY_TO_SEND'`;
          break;
        case 'sent':
          countQuery += ` AND status = 'SENT'`;
          break;
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Get stage counts for stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE stage1_status = 'KEEP') as scanner,
        COUNT(*) FILTER (WHERE stage2_score IS NOT NULL) as scorer,
        COUNT(*) FILTER (WHERE stage3_landing_url IS NOT NULL) as router,
        COUNT(*) FILTER (WHERE stage4_reply_text IS NOT NULL) as writer,
        COUNT(*) FILTER (WHERE stage5_status IS NOT NULL) as dedup,
        COUNT(*) FILTER (WHERE stage6_short_link IS NOT NULL) as tracker,
        COUNT(*) FILTER (WHERE status = 'READY_TO_SEND') as ready,
        COUNT(*) FILTER (WHERE status = 'SENT') as sent
      FROM social_leads
    `);

    // Convert stats to numbers
    const stats = statsResult.rows[0];
    const parsedStats = {
      scanner: parseInt(stats.scanner) || 0,
      scorer: parseInt(stats.scorer) || 0,
      router: parseInt(stats.router) || 0,
      writer: parseInt(stats.writer) || 0,
      dedup: parseInt(stats.dedup) || 0,
      tracker: parseInt(stats.tracker) || 0
    };

    res.json({
      success: true,
      leads: result.rows,
      stats: parsedStats,
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
    const { timeRange = 'all' } = req.query;
    
    // Build time filter
    let timeFilter = '';
    if (timeRange === 'daily') {
      timeFilter = "AND created_at >= NOW() - INTERVAL '24 hours'";
    } else if (timeRange === 'weekly') {
      timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
    }
    // 'all' = no time filter
    
    // Get stage counts
    const stageResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE stage1_status = 'KEEP') as scanner,
        COUNT(*) FILTER (WHERE stage2_score IS NOT NULL) as scorer,
        COUNT(*) FILTER (WHERE stage3_landing_url IS NOT NULL) as router,
        COUNT(*) FILTER (WHERE stage4_reply_text IS NOT NULL) as writer,
        COUNT(*) FILTER (WHERE stage5_status IS NOT NULL) as dedup,
        COUNT(*) FILTER (WHERE stage6_short_link IS NOT NULL) as tracker,
        COUNT(*) FILTER (WHERE status = 'READY_TO_SEND') as ready,
        COUNT(*) FILTER (WHERE status = 'SENT') as sent,
        COUNT(*) as total
      FROM social_leads
      WHERE 1=1 ${timeFilter}
    `);

    // Get additional stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as awaiting_approval,
        COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
        ROUND(AVG(stage2_score)) as avg_score,
        COUNT(DISTINCT platform) as platforms_monitored
      FROM social_leads
      WHERE 1=1 ${timeFilter}
    `);

    // Parse all stats as integers
    const stageStats = stageResult.rows[0];
    const additionalStats = statsResult.rows[0];
    
    res.json({ 
      success: true, 
      stats: {
        scanner: parseInt(stageStats.scanner) || 0,
        scorer: parseInt(stageStats.scorer) || 0,
        router: parseInt(stageStats.router) || 0,
        writer: parseInt(stageStats.writer) || 0,
        dedup: parseInt(stageStats.dedup) || 0,
        tracker: parseInt(stageStats.tracker) || 0,
        ready: parseInt(stageStats.ready) || 0,
        total: parseInt(stageStats.total) || 0,
        awaiting_approval: parseInt(additionalStats.awaiting_approval) || 0,
        sent: parseInt(additionalStats.sent) || 0,
        avg_score: parseInt(additionalStats.avg_score) || 0,
        platforms_monitored: parseInt(additionalStats.platforms_monitored) || 0
      }
    });
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

    const lead = result.rows[0];

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
      'archived_reason',
      'stage4_reply_text',
      'stage3_landing_url',
      'draft_response',
      'sent_at',
      'reply_url',
      'reply_screenshot_url',
      'status'
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
    const { approved_response, reviewed_by, auto_send } = req.body;

    // Update the final reply and mark as approved
    const result = await pool.query(`
      UPDATE social_leads
      SET 
        stage4_reply_text = COALESCE($1, stage4_reply_text),
        status = 'APPROVED'
      WHERE id = $2
      RETURNING *
    `, [approved_response, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = result.rows[0];


    


    // If auto_send is true, trigger actual posting to platform
    if (auto_send) {
      console.log(`🚀 Auto-send triggered for lead #${id}`);
      
      // Trigger posting in background (don't wait for completion)
      autoPostingService.postReply({
        leadId: parseInt(id),
        platform: lead.platform,
        postUrl: lead.post_url,
        replyText: lead.stage4_reply_text,
        landingUrl: lead.stage3_landing_url
      })
        .then(postResult => {
          if (postResult.success) {
            // Update with sent status
            pool.query(`
              UPDATE social_leads
              SET 
                status = 'SENT',
                sent_at = NOW(),
                reply_url = $1,
                reply_screenshot_url = $2
              WHERE id = $3
            `, [postResult.reply_url, postResult.screenshot_url, id]);
            
            console.log(`✅ Lead #${id} posted successfully`);
          } else {
            // Mark as failed
            pool.query(`
              UPDATE social_leads
              SET status = 'FAILED'
              WHERE id = $1
            `, [id]);
            
            console.error(`❌ Lead #${id} posting failed: ${postResult.error}`);
          }
        })
        .catch(error => {
          console.error(`❌ Lead #${id} posting error:`, error);
          pool.query(`UPDATE social_leads SET status = 'FAILED' WHERE id = $1`, [id]);
        });
    }

    res.json({ 
      success: true, 
      message: auto_send ? 'Response approved and posting now!' : 'Response approved and ready for posting',
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

    const result = await pool.query(`
      UPDATE social_leads
      SET 
        status = 'SENT',
        sent_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

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

// POST /api/social-leads/:id/archive - Archive/reject a lead
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE social_leads
      SET 
        status = 'REJECTED'
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ 
      success: true, 
      message: 'Lead rejected',
      lead: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error archiving lead:', error);
    res.status(500).json({ error: 'Failed to archive lead', details: error.message });
  }
});

// POST /api/social-leads/:id/regenerate-reply - Regenerate reply with training feedback
router.post('/:id/regenerate-reply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { feedback, landing_page, original_reply, post_text, pain_category } = req.body;

    if (!feedback) {
      return res.status(400).json({ error: 'Training feedback is required' });
    }

    // Call OpenAI GPT-4 to regenerate reply based on feedback
    const systemPrompt = `You are a helpful social media assistant for Real Life Trading (RLT), a credit spread trading education company.

Brand voice guidelines:
- Warm, authentic, and supportive tone
- Never make income claims or guarantees
- Never use fake urgency or hype
- Focus on education and process over results
- Target: middle-class professionals seeking supplemental income
- Avoid day-trading get-rich-quick language

Your goal is to help frustrated traders by pointing them to relevant free RLT resources on YouTube.`;

    const userPrompt = `Original social media post from user:
"${post_text}"

Current draft reply:
"${original_reply}"

User feedback on this reply:
"${feedback}"

Landing page to include: ${landing_page || 'https://youtube.com/@RealLifeTrading'}

IMPORTANT: Rewrite the reply incorporating the user's feedback. Follow their instructions exactly. Keep [LINK] as a placeholder for the landing page URL.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const improvedReply = completion.choices[0].message.content || original_reply;

    // Store the training feedback for future model improvements
    await pool.query(`
      INSERT INTO training_feedback (
        lead_id,
        feedback_text,
        original_reply,
        improved_reply,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT DO NOTHING
    `, [id, feedback, original_reply, improvedReply]);

    res.json({ 
      success: true, 
      reply: improvedReply,
      message: 'Reply regenerated based on your feedback. Training data saved for future improvements.' 
    });

  } catch (error: any) {
    console.error('Error regenerating reply:', error);
    res.status(500).json({ error: 'Failed to regenerate reply', details: error.message });
  }
});

// POST /api/social-leads/:id/lead-quality-feedback - Submit feedback to train scoring/routing agents
router.post('/:id/lead-quality-feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      feedback, 
      lead_score, 
      pain_category, 
      selected_landing_page, 
      post_text, 
      platform, 
      final_status 
    } = req.body;

    if (!feedback) {
      return res.status(400).json({ error: 'Lead quality feedback is required' });
    }

    // Store lead quality feedback for training scoring/routing agents
    await pool.query(`
      INSERT INTO lead_quality_training (
        lead_id,
        feedback_text,
        lead_score,
        pain_category,
        selected_landing_page,
        post_text,
        platform,
        final_status,
        created_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'Tony')
      ON CONFLICT DO NOTHING
    `, [
      id, 
      feedback, 
      lead_score, 
      pain_category, 
      selected_landing_page, 
      post_text, 
      platform, 
      final_status
    ]);

    res.json({ 
      success: true, 
      message: 'Lead quality feedback saved! This will help train the scoring and routing agents.' 
    });

  } catch (error: any) {
    console.error('Error saving lead quality feedback:', error);
    
    // If table doesn't exist, still return success (graceful degradation)
    if (error.message?.includes('relation "lead_quality_training" does not exist')) {
      console.warn('lead_quality_training table does not exist yet - feedback not stored');
      res.json({ 
        success: true, 
        message: 'Lead quality feedback received (table pending migration)' 
      });
    } else {
      res.status(500).json({ error: 'Failed to save lead quality feedback', details: error.message });
    }
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


// POST /api/social-leads/:id/trigger-post - Manually trigger posting for a lead
router.post('/:id/trigger-post', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get lead details
    const leadResult = await pool.query(
      'SELECT * FROM social_leads WHERE id::text = $1',
      [id]
    );
    
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const lead = leadResult.rows[0];
    
    // Trigger auto-posting service
    const postResult = await autoPostingService.postReply({
      leadId: parseInt(id),
      platform: lead.platform,
      postUrl: lead.post_url,
      replyText: lead.stage4_reply_text,
      landingUrl: lead.stage3_landing_url
    });
    
    if (postResult.success) {
      res.json({ 
        success: true, 
        message: 'Posting triggered successfully',
        leadId: id
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: postResult.error || 'Posting failed'
      });
    }
  } catch (error: any) {
    console.error('Error triggering post:', error);
    res.status(500).json({ 
      error: 'Failed to trigger post', 
      details: error.message 
    });
  }
});

// Discord webhook for Social Sender Agent
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || 
  'https://discord.com/api/webhooks/1482413401111265332/hG20sp7JEDqGTTIyTM8taCkFNxRrxIW02zPoeR2ONb-IQd80-A0FC4piuLWgd5WTM2y9';

/**
 * Format Discord message for Social Sender Agent
 */
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

/**
 * Send message to Discord channel
 */
async function sendToDiscord(message: string) {
  try {
    const response = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending Discord message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * AUTO-SEND ROUTE
 * POST /api/leads/:id/auto-send
 * Sends lead info to Discord for Social Sender Agent to post
 */
router.post('/:id/auto-send', async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    
    console.log(`\n📤 Auto-send request for lead ${leadId}`);

    // Fetch lead from database
    const result = await pool.query(
      `SELECT 
        id,
        platform,
        post_url,
        stage6_final_reply,
        status
      FROM social_leads
      WHERE id = $1`,
      [leadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
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
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || 
  'https://discord.com/api/webhooks/1482413401111265332/hG20sp7JEDqGTTIyTM8taCkFNxRrxIW02zPoeR2ONb-IQd80-A0FC4piuLWgd5WTM2y9';

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

export default router;

















