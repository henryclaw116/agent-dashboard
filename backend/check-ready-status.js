const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function checkStats() {
  // Check how many are READY_TO_SEND
  const ready = await pool.query("SELECT COUNT(*) FROM social_leads WHERE status = 'READY_TO_SEND'");
  console.log('READY_TO_SEND leads:', ready.rows[0].count);
  
  // Check all statuses
  const allStatuses = await pool.query("SELECT status, COUNT(*) FROM social_leads GROUP BY status ORDER BY count DESC");
  console.log('\nAll statuses:');
  console.log(allStatuses.rows);
  
  // Sample some READY_TO_SEND leads
  const sample = await pool.query(`
    SELECT id, platform, status, created_at::date 
    FROM social_leads 
    WHERE status = 'READY_TO_SEND' 
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.log('\nSample READY_TO_SEND leads:');
  console.log(sample.rows);
  
  await pool.end();
}

checkStats().catch(console.error);
