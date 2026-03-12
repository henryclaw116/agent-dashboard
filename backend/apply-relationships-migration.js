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

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '008_agent_relationships.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📝 Applying relationships migration...');
    
    await db.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');

    // Verify table exists
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('agent_relationships', 'workflow_templates')
      ORDER BY table_name
    `);

    console.log('\n✅ Verified tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
