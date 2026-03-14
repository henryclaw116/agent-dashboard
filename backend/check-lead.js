const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

const leadId = '1689254862117101568';

async function checkLead() {
  try {
    // Try with ::text cast
    const result = await pool.query('SELECT id, platform, status, stage4_reply_text FROM social_leads WHERE id::text = $1', [leadId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Lead found in database:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ Lead NOT found with id::text = $1');
      
      // Try casting the parameter instead
      const result2 = await pool.query('SELECT id, platform, status FROM social_leads WHERE id = $1::bigint', [leadId]);
      
      if (result2.rows.length > 0) {
        console.log('✅ Found with ::bigint cast on parameter:');
        console.log(JSON.stringify(result2.rows[0], null, 2));
      } else {
        console.log('❌ Still not found');
        
        // Check if ANY leads exist
        const count = await pool.query('SELECT COUNT(*) FROM social_leads WHERE status = $1', ['READY_TO_SEND']);
        console.log(`\nTotal READY_TO_SEND leads: ${count.rows[0].count}`);
        
        // Show a sample
        const sample = await pool.query('SELECT id, platform, status FROM social_leads WHERE status = $1 LIMIT 3', ['READY_TO_SEND']);
        console.log('\nSample READY_TO_SEND leads:');
        console.log(JSON.stringify(sample.rows, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLead();
