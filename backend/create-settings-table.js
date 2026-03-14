const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function createSettingsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by VARCHAR(100)
      )
    `);
    
    console.log('✓ System settings table created');
    
    // Initialize auto-send setting to OFF
    await pool.query(`
      INSERT INTO system_settings (key, value, updated_by)
      VALUES ('auto_send_enabled', 'false', 'system')
      ON CONFLICT (key) DO NOTHING
    `);
    
    console.log('✓ Auto-send setting initialized to OFF');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

createSettingsTable();
