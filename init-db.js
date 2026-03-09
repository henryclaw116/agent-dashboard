const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:fChdjSjAqzIzlGXIvfROUhYOVornOaIF@nozomi.proxy.rlwy.net:36132/railway';

async function initDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read and execute main schema
    const schema = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Main schema initialized');

    // Read and execute social media schema
    const socialSchema = fs.readFileSync(path.join(__dirname, 'database', 'social-media-schema.sql'), 'utf8');
    await client.query(socialSchema);
    console.log('✅ Social media schema initialized');

    // Read and execute viral content schema  
    const viralSchema = fs.readFileSync(path.join(__dirname, 'database', 'viral-content-schema.sql'), 'utf8');
    await client.query(viralSchema);
    console.log('✅ Viral content schema initialized');

    console.log('\n🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
