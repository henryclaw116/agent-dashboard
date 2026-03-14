import axios from 'axios';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

/**
 * Send posting instructions to Social Sender Agent via Discord
 */
export async function sendPostingInstructionToAgent(params: {
  leadId: number | string;
  platform: string;
  postUrl: string;
  replyText: string;
  landingUrl?: string;
}) {
  try {
    const message = `
🤖 **AUTO-POST REQUEST**

**Lead ID:** ${params.leadId}
**Platform:** ${params.platform}
**Post URL:** ${params.postUrl}

**Reply to post:**
${params.replyText}

**Action Required:**
Social Sender Agent - please post this reply to the above URL.

---
_Sent from Lead Pipeline Dashboard_
    `.trim();

    console.log('📤 Sending posting instruction to Discord...');
    console.log(message);

    // Send to Discord webhook or channel
    if (DISCORD_WEBHOOK_URL) {
      await axios.post(DISCORD_WEBHOOK_URL, {
        content: message
      });
      console.log('✅ Posted to Discord');
      return { success: true };
    } else {
      console.warn('⚠️ No Discord webhook configured');
      return { success: false, error: 'Discord webhook not configured' };
    }
  } catch (error: any) {
    console.error('❌ Failed to send Discord message:', error.message);
    return { success: false, error: error.message };
  }
}
