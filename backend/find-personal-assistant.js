require('dotenv').config({ path: 'C:\\Users\\reall\\.openclaw\\workspace\\agent-dashboard\\backend\\.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function findPersonalAssistant() {
  try {
    const result = await pool.query(`
      SELECT id, name, role, model, heartbeat_interval_seconds, last_heartbeat
      FROM agents 
      WHERE name ILIKE '%personal%' OR name ILIKE '%assistant%' OR id = 8
      ORDER BY id
    `);
    
    console.log('Personal Assistant Agent(s):');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findPersonalAssistant();
