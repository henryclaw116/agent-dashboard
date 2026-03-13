// Quick script to run database migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'database/migrations/013_add_reply_tracking_columns.sql'),
      'utf8'
    );
    
    console.log('Running migration 013...');
    await pool.query(sql);
    console.log('✅ Migration 013 complete!');
    console.log('   - Added reply_url column');
    console.log('   - Added reply_screenshot_url column');
    console.log('   - Added indexes');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
