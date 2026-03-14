import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// MSI Tailscale IP and webhook port
const MSI_WEBHOOK_URL = 'http://100.96.68.11:3001/trigger-post';

/**
 * Auto-Posting Service
 * 
 * Triggers auto-post.js on MSI computer via webhook.
 * Browser automation runs on MSI, not on Railway/Cloud.
 */
export class AutoPostingService {
  
  /**
   * Trigger posting for a specific lead
   * Calls MSI webhook which runs auto-post.js locally
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
      console.log(`📤 Triggering auto-post on MSI for lead #${params.leadId} (${params.platform})`);

      // Call MSI webhook to trigger auto-post.js
      const response = await axios.post(MSI_WEBHOOK_URL, {
        leadId: params.leadId
      }, {
        timeout: 5000 // 5 second timeout for webhook acknowledgment
      });

      if (response.data.success) {
        console.log(`✅ Auto-post triggered on MSI for lead #${params.leadId}`);
        
        // Return success - auto-post.js will update the lead when done
        return {
          success: true,
          reply_url: params.postUrl, // Will be updated by auto-post.js
          screenshot_url: undefined
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Unknown error from MSI webhook'
        };
      }
    } catch (error: any) {
      console.error(`❌ Failed to trigger auto-post on MSI:`, error.message);
      
      return {
        success: false,
        error: `MSI webhook error: ${error.message}`
      };
    }
  }
}

export default new AutoPostingService();
