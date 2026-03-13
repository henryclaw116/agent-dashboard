// Quick script to run database migrations
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 
    'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function runMigration() {
  try {
    // Run migration 014
    const sql = fs.readFileSync(
      path.join(__dirname, 'database/migrations/014_add_approved_tracking_columns.sql'),
      'utf8'
    );
    
    console.log('Running migration 014...');
    await pool.query(sql);
    console.log('✅ Migration 014 complete!');
    console.log('   - Added approved_at column');
    console.log('   - Added approved_by column');
    console.log('   - Added indexes for approved leads');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
