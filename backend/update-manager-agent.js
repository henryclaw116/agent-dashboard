require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateManagerAgent() {
  try {
    const result = await pool.query(
      `UPDATE agents 
       SET name = $1, 
           model = $2,
           updated_at = NOW()
       WHERE id = 1 
       RETURNING *`,
      ['Manager Agent', 'openai/gpt-4o-mini']
    );
    
    console.log('✅ Updated Manager Agent:');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateManagerAgent();
