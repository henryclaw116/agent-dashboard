const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function addTony() {
  // Check if Tony already exists
  const existing = await pool.query("SELECT id FROM agents WHERE name = 'Tony Pawlak' OR role = 'Owner / CEO'");
  
  if (existing.rows.length > 0) {
    console.log('Tony already exists as agent #' + existing.rows[0].id);
    await pool.end();
    return;
  }

  // Add Tony as the top-level agent (ID will auto-increment)
  const result = await pool.query(`
    INSERT INTO agents (
      name, role, status, personality, skills, prompt, 
      position_x, position_y, hierarchy_level
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING id, name, role
  `, [
    'Tony Pawlak',
    'Owner / CEO',
    'active',
    'Strategic leader, builds systems, empowers teams',
    ['business-strategy', 'leadership', 'product-development'],
    'I oversee all operations and make final decisions. Agents report to me on their progress and any blockers.',
    400,   // position_x (center top)
    50,    // position_y (top of board - highest authority)
    0      // hierarchy_level (highest)
  ]);

  console.log('✓ Tony added as agent:');
  console.log(JSON.stringify(result.rows[0], null, 2));
  console.log('Position: (400, 50) - Top center of board');
  console.log('Lower Y = Higher Authority');
  
  await pool.end();
}

addTony().catch(console.error);
