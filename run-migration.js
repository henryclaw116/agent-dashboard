const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use Supabase database (from init-supabase.js)
const DATABASE_URL = 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read and execute migration
    const migration = fs.readFileSync(
      path.join(__dirname, 'database', 'migrations', '005_add_compute_nodes.sql'),
      'utf8'
    );
    
    await client.query(migration);
    console.log('✅ Migration 005_add_compute_nodes.sql executed successfully');
    
    // Verify consoles were added
    const result = await client.query('SELECT name, type, status FROM consoles ORDER BY id');
    console.log('\n📊 Consoles in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type}) - ${row.status}`);
    });

    console.log('\n🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
