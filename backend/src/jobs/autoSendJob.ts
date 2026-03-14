import pool from '../db';
import autoPostingService from '../services/autoPosting.service';

let isRunning = false;

/**
 * Auto-send background job
 * Runs every 30 seconds when auto-send toggle is enabled
 */
export async function startAutoSendJob() {
  console.log('🤖 Auto-send background job started');
  
  // Run immediately, then every 30 seconds
  await runAutoSendCycle();
  setInterval(runAutoSendCycle, 30000);
}

async function runAutoSendCycle() {
  if (isRunning) {
    console.log('⏭️  Auto-send cycle already running, skipping...');
    return;
  }

  try {
    isRunning = true;

    // Check if auto-send is enabled
    const settingResult = await pool.query(
      'SELECT value FROM system_settings WHERE key = $1',
      ['auto_send_enabled']
    );

    const autoSendEnabled = settingResult.rows[0]?.value === 'true';

    if (!autoSendEnabled) {
      // Auto-send is disabled, skip this cycle
      return;
    }

    console.log('✅ Auto-send is ENABLED - checking for approved leads...');

    // Find all leads that are:
    // 1. Status = APPROVED
    // 2. Have tracking link (stage6_short_link IS NOT NULL)
    // 3. Not already sent (status != SENT)
    const leadsResult = await pool.query(`
      SELECT id, platform, post_url, stage4_reply_text, stage3_landing_url
      FROM social_leads
      WHERE status = 'READY_TO_SEND'
        AND stage6_short_link IS NOT NULL
        AND sent_at IS NULL
      ORDER BY created_at ASC
      LIMIT 10
    `);

    const approvedLeads = leadsResult.rows;

    if (approvedLeads.length === 0) {
      console.log('📭 No approved leads ready for auto-send');
      return;
    }

    console.log(`📤 Found ${approvedLeads.length} approved leads ready for auto-send`);

    // Process each lead
    for (const lead of approvedLeads) {
      try {
        console.log(`🚀 Auto-sending lead #${lead.id} to ${lead.platform}...`);

        // Call the auto-posting service
        const result = await autoPostingService.postReply({
          leadId: lead.id,
          platform: lead.platform,
          postUrl: lead.post_url,
          replyText: lead.stage4_reply_text,
          landingUrl: lead.stage3_landing_url
        });

        if (result.success) {
          // Update lead as SENT
          await pool.query(`
            UPDATE social_leads
            SET 
              status = 'SENT',
              sent_at = NOW(),
              reply_url = $1,
              reply_screenshot_url = $2
            WHERE id = $3
          `, [result.reply_url, result.screenshot_url, lead.id]);

          console.log(`✅ Lead #${lead.id} posted successfully`);
        } else {
          // Mark as FAILED
          await pool.query(`
            UPDATE social_leads
            SET status = 'FAILED'
            WHERE id = $1
          `, [lead.id]);

          console.error(`❌ Lead #${lead.id} failed: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`❌ Error processing lead #${lead.id}:`, error.message);
        
        // Mark as FAILED
        await pool.query(`
          UPDATE social_leads
          SET status = 'FAILED'
          WHERE id = $1
        `, [lead.id]);
      }

      // Wait 2 seconds between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Auto-send cycle complete - processed ${approvedLeads.length} leads`);

  } catch (error: any) {
    console.error('❌ Error in auto-send cycle:', error);
  } finally {
    isRunning = false;
  }
}

