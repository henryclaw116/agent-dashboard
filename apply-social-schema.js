const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use Supabase database
const DATABASE_URL = 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

async function applySchema() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read and execute schema
    const schema = fs.readFileSync(
      path.join(__dirname, 'database', 'social-media-schema.sql'),
      'utf8'
    );
    
    await client.query(schema);
    console.log('✅ Social Media schema applied successfully');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('video_uploads', 'social_content', 'content_reviews', 'scheduled_posts', 'content_calendar')
      ORDER BY table_name
    `);
    
    console.log('\n📊 Tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n🎉 Social Media feature ready!');
  } catch (error) {
    console.error('❌ Schema application failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
