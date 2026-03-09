import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase(pool: Pool) {
  try {
    console.log('🔍 Checking database schema...');
    
    // Check if tables exist
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Database schema already initialized');
      return;
    }

    console.log('📝 Initializing database schema...');

    // Read and execute main schema
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Main schema initialized');

    // Read and execute social media schema
    const socialSchemaPath = path.join(__dirname, '../../database/social-media-schema.sql');
    const socialSchema = fs.readFileSync(socialSchemaPath, 'utf8');
    await pool.query(socialSchema);
    console.log('✅ Social media schema initialized');

    // Read and execute viral content schema
    const viralSchemaPath = path.join(__dirname, '../../database/viral-content-schema.sql');
    const viralSchema = fs.readFileSync(viralSchemaPath, 'utf8');
    await pool.query(viralSchema);
    console.log('✅ Viral content schema initialized');

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
