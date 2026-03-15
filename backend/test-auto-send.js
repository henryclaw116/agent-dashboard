const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: 'postgresql://postgres:nDCPptzkzBHEJlNqnDyepqTHnPVTPuAz@autorack.proxy.rlwy.net:42418/railway',
  ssl: {
    rejectUnauthorized: false
  }
});

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1482413401111265332/hG20sp7JEDqGTTIyTM8taCkFNxRrxIW02zPoeR2ONb-IQd80-A0FC4piuLWgd5WTM2y9';

async function testAutoSend() {
  try {
    console.log('\n🔍 Finding a READY_TO_SEND lead...\n');
    
    // Get one lead with all required fields
    const result = await pool.query(`
      SELECT id, platform, post_url, stage6_final_reply, status
      FROM social_leads
      WHERE status = 'READY_TO_SEND'
        AND platform IS NOT NULL
        AND post_url IS NOT NULL
        AND stage6_final_reply IS NOT NULL
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No READY_TO_SEND leads found with all required fields!\n');
      process.exit(1);
    }
    
    const lead = result.rows[0];
    
    console.log('✅ Found lead:\n');
    console.log(`  ID: ${lead.id}`);
    console.log(`  Platform: ${lead.platform}`);
    console.log(`  Post URL: ${lead.post_url}`);
    console.log(`  Reply: ${lead.stage6_final_reply.substring(0, 100)}...\n`);
    
    // Format Discord message (same format as backend)
    const discordMessage = `🚀 NEW LEAD TO POST

Platform: ${lead.platform}
Post URL: ${lead.post_url}
Lead ID: ${lead.id}

POST THIS EXACTLY:
---
${lead.stage6_final_reply}
---`;
    
    console.log('📝 Sending to Discord...\n');
    
    // Send to Discord
    const response = await axios.post(DISCORD_WEBHOOK, {
      content: discordMessage
    });
    
    if (response.status === 204 || response.status === 200) {
      console.log('======================================================================');
      console.log('\n🎉 SUCCESS! Message sent to Discord!\n');
      console.log('======================================================================');
      
      console.log('\n✅ Check Discord channel: 1482413074920247356 (#media-sending-agent)\n');
      console.log('The Social Sender Agent should receive the message!\n');
      
      // Update lead status to SENT (so we don't test it again)
      await pool.query(`
        UPDATE social_leads
        SET status = 'SENT', triggered_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [lead.id]);
      
      console.log(`✅ Updated lead ${lead.id} status to SENT\n`);
      
      console.log('======================================================================');
      console.log('\n🎯 END-TO-END TEST COMPLETE!\n');
      console.log('======================================================================');
      console.log('\nWhat happened:');
      console.log('  1. ✅ Got lead from database');
      console.log('  2. ✅ Formatted Discord message');
      console.log('  3. ✅ Posted to Discord channel');
      console.log('  4. ✅ Updated lead status to SENT');
      console.log('\nNext: Social Sender Agent should post the reply to the platform!\n');
      
    } else {
      console.log(`❌ Discord returned status ${response.status}\n`);
    }
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAutoSend();
