// Auto-Post via Discord Integration
// This script sends posting instructions to Discord for the Social Sender Agent

const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

// Discord channel ID for posting instructions (builder channel)
const DISCORD_CHANNEL_ID = '1481298406088380569';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function sendPostingInstructionToDiscord(leadId) {
  try {
    // Get lead details
    const result = await pool.query(
      'SELECT * FROM social_leads WHERE id = $1',
      [leadId]
    );
    
    if (result.rows.length === 0) {
      console.error(`Lead ${leadId} not found`);
      return;
    }
    
    const lead = result.rows[0];
    
    const message = `
🤖 **AUTO-POST REQUEST**

**Lead ID:** ${leadId}
**Platform:** ${lead.platform}
**Post URL:** ${lead.post_url}

**Reply:**
\`\`\`
${lead.stage4_reply_text}
\`\`\`

@Builder Agent - Please execute auto-post for this lead.
    `.trim();
    
    console.log('📤 Sending to Discord...');
    console.log(message);
    
    // Send via Discord API if token is available
    if (DISCORD_BOT_TOKEN) {
      await axios.post(
        `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`,
        { content: message },
        { headers: { 'Authorization': `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      console.log('✅ Posted to Discord');
    } else {
      console.log('ℹ️ No Discord token - message logged above');
    }
    
    // Mark as triggered
    await pool.query(
      'UPDATE social_leads SET status = $1 WHERE id = $2',
      ['READY_TO_SEND', leadId]
    );
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Get lead ID from command line
const leadId = process.argv[2];
if (!leadId) {
  console.error('Usage: node discord-auto-post.js <leadId>');
  process.exit(1);
}

sendPostingInstructionToDiscord(leadId);
