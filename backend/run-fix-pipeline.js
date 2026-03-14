const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function fixPipeline() {
  console.log('=== BEFORE FIX ===');
  const before = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM social_leads
    WHERE stage6_short_link IS NOT NULL
    GROUP BY status
  `);
  console.log(before.rows);
  
  // Update PENDING/APPROVED leads in Tracker to READY_TO_SEND
  const update = await pool.query(`
    UPDATE social_leads
    SET status = 'READY_TO_SEND'
    WHERE stage6_short_link IS NOT NULL 
      AND status IN ('PENDING', 'APPROVED')
    RETURNING id
  `);
  console.log(`\n✓ Updated ${update.rowCount} leads to READY_TO_SEND`);
  
  console.log('\n=== AFTER FIX ===');
  const after = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM social_leads
    WHERE stage6_short_link IS NOT NULL
    GROUP BY status
  `);
  console.log(after.rows);
  
  await pool.end();
}

fixPipeline().catch(console.error);
