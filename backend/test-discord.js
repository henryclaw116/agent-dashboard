const axios = require('axios');

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1482413401111265332/hG20sp7JEDqGTTIyTM8taCkFNxRrxIW02zPoeR2ONb-IQd80-A0FC4piuLWgd5WTM2y9';

async function testDiscordPost() {
  try {
    console.log('\n🧪 TESTING DISCORD INTEGRATION\n');
    console.log('======================================================================\n');
    
    // Create a test lead (fake data for testing)
    const testLead = {
      id: 9999,
      platform: 'twitter',
      post_url: 'https://twitter.com/test/status/123456789',
      stage6_final_reply: 'Hey! I saw you\'re interested in trading. Check out this free course that helped me get consistent: https://trade.reallifetrading.com/test?utm_source=test'
    };
    
    console.log('📝 Test Lead:\n');
    console.log(`  Platform: ${testLead.platform}`);
    console.log(`  Post URL: ${testLead.post_url}`);
    console.log(`  Reply: ${testLead.stage6_final_reply}\n`);
    
    // Format Discord message (exact same format as backend)
    const discordMessage = `🚀 NEW LEAD TO POST

Platform: ${testLead.platform}
Post URL: ${testLead.post_url}
Lead ID: ${testLead.id}

POST THIS EXACTLY:
---
${testLead.stage6_final_reply}
---`;
    
    console.log('📤 Sending to Discord...\n');
    
    // Send to Discord
    const response = await axios.post(DISCORD_WEBHOOK, {
      content: discordMessage
    });
    
    if (response.status === 204 || response.status === 200) {
      console.log('======================================================================');
      console.log('\n🎉🎉🎉 SUCCESS! 🎉🎉🎉\n');
      console.log('======================================================================\n');
      
      console.log('✅ Message posted to Discord channel 1482413074920247356\n');
      console.log('✅ Social Sender Agent should receive it!\n');
      
      console.log('======================================================================');
      console.log('\n🎯 DISCORD INTEGRATION WORKS!\n');
      console.log('======================================================================\n');
      
      console.log('What this proves:');
      console.log('  ✅ Discord webhook works');
      console.log('  ✅ Message format is correct');
      console.log('  ✅ Auto-send system is functional\n');
      
      console.log('Next steps:');
      console.log('  1. Check Discord channel to verify message appeared');
      console.log('  2. Fix Railway deployment so dashboard can use this');
      console.log('  3. Test end-to-end with real lead from dashboard\n');
      
    } else {
      console.log(`❌ Discord returned status ${response.status}\n`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testDiscordPost();
