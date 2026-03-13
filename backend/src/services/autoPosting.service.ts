import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Auto-Posting Service
 * 
 * Handles automatic posting of approved replies to social media platforms.
 * Uses the auto-post.js script via exec or the OpenClaw browser tool.
 */
export class AutoPostingService {
  
  /**
   * Trigger posting for a specific lead
   */
  async postLead(leadId: number): Promise<{
    success: boolean;
    reply_url?: string;
    screenshot_url?: string;
    error?: string;
  }> {
    try {
      // Get lead details
      const leadResult = await pool.query(`
        SELECT * FROM social_leads WHERE id = $1
      `, [leadId]);

      if (leadResult.rows.length === 0) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = leadResult.rows[0];

      if (!lead.stage4_reply_text) {
        return { success: false, error: 'No reply text to post' };
      }

      if (!lead.post_url) {
        return { success: false, error: 'No post URL to reply to' };
      }

      // Determine platform and call appropriate poster
      const platform = lead.platform?.toLowerCase();

      if (platform === 'twitter') {
        return await this.postToTwitter(lead);
      } else if (platform === 'reddit') {
        return await this.postToReddit(lead);
      } else if (platform === 'youtube') {
        return await this.postToYouTube(lead);
      } else {
        return { success: false, error: `Unsupported platform: ${platform}` };
      }
    } catch (error: any) {
      console.error('Error posting lead:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Post to Twitter using Node.js auto-post script
   */
  private async postToTwitter(lead: any): Promise<any> {
    try {
      console.log(`📤 Posting to Twitter: Lead #${lead.id}`);

      // Call the auto-post.js script via Gateway
      // This assumes the script is available on the MSI console
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:18791';
      const gatewayToken = process.env.GATEWAY_TOKEN;

      if (!gatewayToken) {
        return { success: false, error: 'Gateway token not configured' };
      }

      // Trigger exec command to run auto-post.js
      const response = await axios.post(
        `${gatewayUrl}/api/exec`,
        {
          command: `cd C:\\Users\\reall\\.openclaw\\workspace\\social-pipeline && node auto-post.js ${lead.id}`,
          background: false,
          timeout: 120000 // 2 minutes
        },
        {
          headers: {
            'Authorization': `Bearer ${gatewayToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.exitCode === 0) {
        // Parse output to get reply URL and screenshot
        const output = response.data.stdout || '';
        
        // Extract reply URL from output (auto-post.js should print it)
        const replyUrlMatch = output.match(/Reply URL: (https:\/\/[^\s]+)/);
        const reply_url = replyUrlMatch ? replyUrlMatch[1] : lead.post_url;

        // For now, no screenshot URL (would need CDN upload)
        return {
          success: true,
          reply_url,
          screenshot_url: undefined
        };
      } else {
        return {
          success: false,
          error: response.data.stderr || 'Posting failed'
        };
      }
    } catch (error: any) {
      console.error('Twitter posting error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Post to Reddit using Node.js auto-post script
   */
  private async postToReddit(lead: any): Promise<any> {
    // Similar to Twitter but calls Reddit posting logic
    return { success: false, error: 'Reddit posting not yet implemented' };
  }

  /**
   * Post to YouTube using Node.js auto-post script
   */
  private async postToYouTube(lead: any): Promise<any> {
    // Similar to Twitter but calls YouTube posting logic
    return { success: false, error: 'YouTube posting not yet implemented' };
  }

  /**
   * Monitor for approved leads and post them automatically
   * This would be called by a cron job or background worker
   */
  async monitorAndPost(): Promise<void> {
    try {
      // Get all approved leads that haven't been sent yet
      const result = await pool.query(`
        SELECT * FROM social_leads
        WHERE status = 'APPROVED'
        AND sent_at IS NULL
        ORDER BY created_at ASC
        LIMIT 10
      `);

      if (result.rows.length === 0) {
        console.log('✅ No approved leads to post');
        return;
      }

      console.log(`📤 Found ${result.rows.length} approved leads to post`);

      // Post each lead sequentially
      for (const lead of result.rows) {
        console.log(`Posting lead #${lead.id}...`);
        
        const result = await this.postLead(lead.id);

        if (result.success) {
          // Update lead with sent status
          await pool.query(`
            UPDATE social_leads
            SET 
              status = 'SENT',
              sent_at = NOW(),
              reply_url = $1,
              reply_screenshot_url = $2
            WHERE id = $3
          `, [result.reply_url, result.screenshot_url, lead.id]);

          console.log(`✅ Posted lead #${lead.id} successfully`);
        } else {
          // Mark as failed
          await pool.query(`
            UPDATE social_leads
            SET status = 'FAILED'
            WHERE id = $1
          `, [lead.id]);

          console.error(`❌ Failed to post lead #${lead.id}: ${result.error}`);
        }

        // Wait 5 seconds between posts to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('Error monitoring and posting:', error);
    }
  }
}

export const autoPostingService = new AutoPostingService();
