const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function markComplete() {
  try {
    await pool.query(`
      UPDATE projects 
      SET status = 'complete', 
          percent_complete = 100, 
          updated_at = NOW() 
      WHERE id = 4
    `);
    console.log('✅ Beelink SER Setup (Project #4) marked complete');
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

markComplete();
