const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

pool.query(`
  SELECT id, post_id, platform, post_text, stage4_reply_text 
  FROM social_leads 
  WHERE status = 'READY_TO_SEND' 
  ORDER BY created_at DESC 
  LIMIT 10
`).then(result => {
  console.log('READY_TO_SEND leads:');
  console.log('');
  result.rows.forEach(row => {
    console.log(`Database ID: ${row.id}`);
    console.log(`Post ID: ${row.post_id}`);
    console.log(`Platform: ${row.platform}`);
    console.log(`Has reply: ${row.stage4_reply_text ? 'Yes' : 'No'}`);
    console.log('---');
  });
  pool.end();
});
