const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function testStatsQuery() {
  const timeRange = 'all';
  
  const statsResult = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE stage1_status = 'KEEP') as scanner,
      COUNT(*) FILTER (WHERE stage2_score IS NOT NULL) as scorer,
      COUNT(*) FILTER (WHERE stage3_landing_url IS NOT NULL) as router,
      COUNT(*) FILTER (WHERE stage4_reply_text IS NOT NULL) as writer,
      COUNT(*) FILTER (WHERE stage5_status IS NOT NULL) as dedup,
      COUNT(*) FILTER (WHERE stage6_short_link IS NOT NULL) as tracker,
      COUNT(*) FILTER (WHERE status = 'READY_TO_SEND') as ready,
      COUNT(*) FILTER (WHERE status = 'SENT') as sent
    FROM social_leads
    WHERE created_at >= CASE 
      WHEN $1 = 'daily' THEN NOW() - INTERVAL '24 hours'
      WHEN $1 = 'weekly' THEN NOW() - INTERVAL '7 days'
      ELSE '1970-01-01'::timestamp
    END
  `, [timeRange]);
  
  console.log('Stats query results:');
  console.log(statsResult.rows[0]);
  
  await pool.end();
}

testStatsQuery().catch(console.error);
