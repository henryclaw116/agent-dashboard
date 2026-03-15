const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:nDCPptzkzBHEJlNqnDyepqTHnPVTPuAz@autorack.proxy.rlwy.net:42418/railway'
});

async function runMigration() {
  try {
    console.log('Running migration...');
    
    await pool.query(`
      ALTER TABLE social_leads 
      ADD COLUMN IF NOT EXISTS stage6_reply_url TEXT,
      ADD COLUMN IF NOT EXISTS stage6_screenshot TEXT,
      ADD COLUMN IF NOT EXISTS stage6_error TEXT
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_leads_status ON social_leads(status)
    `);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
