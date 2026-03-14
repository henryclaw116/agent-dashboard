import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Discord webhook for Social Sender Agent
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK || 
  'https://discord.com/api/webhooks/1482413401111265332/hG20sp7JEDqGTTIyTM8taCkFNxRrxIW02zPoeR2ONb-IQd80-A0FC4piuLWgd5WTM2y9';

/**
 * Auto-Posting Service
 * 
 * NEW: Sends Discord messages to Social Sender Agent
 * Social Sender Agent receives message and posts via browser control
 */
export class AutoPostingService {
  
  /**
   * Format Discord message for Social Sender Agent
   */
  private formatPostingMessage(params: {
    leadId: number;
    platform: string;
    postUrl: string;
    replyText: string;
  }): string {
    return `🚀 NEW LEAD TO POST

Platform: ${params.platform}
Post URL: ${params.postUrl}
Lead ID: ${params.leadId}

POST THIS EXACTLY:
---
${params.replyText}
---`;
  }

  /**
   * Send message to Discord channel
   */
  private async sendToDiscord(message: string): Promise<{ success: boolean; error?: string }> {
    try {
      await axios.post(DISCORD_WEBHOOK, { content: message });
      return { success: true };
    } catch (error: any) {
      console.error('Discord send error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger posting for a specific lead
   * NEW: Sends Discord message to Social Sender Agent
   */
  async postReply(params: {
    leadId: number;
    platform: string;
    postUrl: string;
    replyText: string;
    landingUrl?: string;
  }): Promise<{
    success: boolean;
    reply_url?: string;
    screenshot_url?: string;
    error?: string;
  }> {
    try {
      console.log(`📤 Sending lead #${params.leadId} to Social Sender Agent (${params.platform})`);

      // Format Discord message
      const message = this.formatPostingMessage(params);

      // Send to Discord
      const result = await this.sendToDiscord(message);

      if (result.success) {
        console.log(`✅ Lead #${params.leadId} sent to Social Sender Agent via Discord`);
        
        // Mark as triggered in database
        await pool.query(
          'UPDATE social_leads SET triggered_at = NOW(), updated_at = NOW() WHERE id = $1',
          [params.leadId]
        );
        
        return {
          success: true,
          reply_url: params.postUrl, // Will be updated by agent when posted
          screenshot_url: undefined
        };
      } else {
        console.error(`❌ Failed to send to Discord:`, result.error);
        return {
          success: false,
          error: `Discord error: ${result.error}`
        };
      }
    } catch (error: any) {
      console.error(`❌ Failed to send to Discord:`, error.message);
      
      return {
        success: false,
        error: `Error: ${error.message}`
      };
    }
  }
}

export default new AutoPostingService();
