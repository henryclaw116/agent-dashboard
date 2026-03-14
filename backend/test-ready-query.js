const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function testQuery() {
  // Simulate the backend query for 'ready' stage with 'all' time range
  const query = `
    SELECT id, platform, status, created_at::date
    FROM social_leads
    WHERE status = 'READY_TO_SEND'
      AND created_at >= CASE 
        WHEN $1 = 'daily' THEN NOW() - INTERVAL '24 hours'
        WHEN $1 = 'weekly' THEN NOW() - INTERVAL '7 days'
        ELSE '1970-01-01'::timestamp
      END
    ORDER BY created_at DESC
    LIMIT 20
  `;
  
  const result = await pool.query(query, ['all']);
  console.log(`Found ${result.rows.length} READY_TO_SEND leads with 'all' time filter:`);
  console.log(result.rows);
  
  // Check if there are more filters in the actual backend
  const checkArchive = await pool.query(`
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'ARCHIVED') as archived,
           COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
    FROM social_leads
    WHERE status = 'READY_TO_SEND'
  `);
  console.log('\nChecking for archive/reject filters:');
  console.log(checkArchive.rows[0]);
  
  await pool.end();
}

testQuery().catch(console.error);
