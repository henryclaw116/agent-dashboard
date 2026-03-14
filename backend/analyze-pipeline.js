const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function analyze() {
  // Check status distribution
  const statuses = await pool.query('SELECT status, COUNT(*) as count FROM social_leads GROUP BY status ORDER BY count DESC');
  console.log('=== STATUS DISTRIBUTION ===');
  console.log(statuses.rows);
  
  // Check pipeline stages
  const stages = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE stage1_status = 'KEEP') as has_stage1,
      COUNT(*) FILTER (WHERE stage2_score IS NOT NULL) as has_stage2,
      COUNT(*) FILTER (WHERE stage3_landing_url IS NOT NULL) as has_stage3,
      COUNT(*) FILTER (WHERE stage4_reply_text IS NOT NULL) as has_stage4,
      COUNT(*) FILTER (WHERE stage5_status IS NOT NULL) as has_stage5,
      COUNT(*) FILTER (WHERE stage6_short_link IS NOT NULL) as has_stage6
    FROM social_leads
  `);
  console.log('\n=== PIPELINE STAGE COMPLETION ===');
  console.log(stages.rows[0]);
  
  // Check leads with tracking links by status
  const trackerLeads = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM social_leads 
    WHERE stage6_short_link IS NOT NULL 
    GROUP BY status
  `);
  console.log('\n=== TRACKER STAGE LEADS BY STATUS ===');
  console.log(trackerLeads.rows);
  
  // Check sent leads
  const sentLeads = await pool.query(`
    SELECT COUNT(*) as sent_count, COUNT(sent_at) as has_sent_at
    FROM social_leads 
    WHERE status = 'SENT'
  `);
  console.log('\n=== SENT LEADS ===');
  console.log(sentLeads.rows[0]);
  
  // Sample some sent leads
  const sentSample = await pool.query(`
    SELECT id, platform, status, sent_at, stage6_short_link 
    FROM social_leads 
    WHERE status = 'SENT' 
    LIMIT 5
  `);
  console.log('\n=== SAMPLE SENT LEADS ===');
  console.log(sentSample.rows);
  
  await pool.end();
}

analyze().catch(console.error);
