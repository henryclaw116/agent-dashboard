const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to database...');
    const test = await db.query('SELECT NOW()');
    console.log('✅ Connected at:', test.rows[0].now);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '007_agent_orchestration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📝 Applying orchestration migration...');
    
    await db.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');

    // Verify columns exist
    const columns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' 
      AND column_name IN ('position_x', 'position_y', 'hierarchy_level', 'last_heartbeat')
      ORDER BY column_name
    `);

    console.log('\n✅ Verified orchestration columns in agents table:');
    columns.rows.forEach(row => console.log(`  - ${row.column_name}`));

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
