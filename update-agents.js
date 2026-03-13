const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function updateAgents() {
  try {
    // Update Social Scanner - runs on MSI with phi3:mini
    await pool.query("UPDATE agents SET model = 'ollama/phi3:mini', console_id = 2 WHERE name = 'Social Scanner'");
    
    // Update Social Scorer - runs on MSI with llama3.1:8b
    await pool.query("UPDATE agents SET model = 'ollama/llama3.1:8b', console_id = 2 WHERE name = 'Social Scorer'");
    
    // Update Social Router - runs on Cloud with Claude Sonnet
    await pool.query("UPDATE agents SET model = 'anthropic/claude-sonnet-4-5', console_id = 1 WHERE name = 'Social Router'");
    
    // Update Social Writer - runs on Cloud with Claude Sonnet
    await pool.query("UPDATE agents SET model = 'anthropic/claude-sonnet-4-5', console_id = 1 WHERE name = 'Social Writer'");
    
    console.log('✅ Updated social pipeline agents with correct models and consoles');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

updateAgents();
