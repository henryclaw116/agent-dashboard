require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupOperationsSupervisor() {
  try {
    console.log('🔧 Setting up Operations Agent as supervisor...\n');

    // Get Manager Agent and Operations Agent
    const agentsResult = await pool.query(`
      SELECT id, name FROM agents WHERE name IN ('Manager Agent', 'Operations Agent')
      ORDER BY name
    `);

    const agents = agentsResult.rows;
    const managerAgent = agents.find(a => a.name === 'Manager Agent');
    const opsAgent = agents.find(a => a.name === 'Operations Agent');

    if (!managerAgent || !opsAgent) {
      console.error('❌ Manager or Operations Agent not found!');
      return;
    }

    console.log(`✅ Found Manager Agent (ID: ${managerAgent.id})`);
    console.log(`✅ Found Operations Agent (ID: ${opsAgent.id})\n`);

    // Hierarchy setup:
    // Level 1: Manager Agent (top)
    // Level 2: Operations Agent (supervisor)
    // Level 3: All other agents (supervised by Operations)

    // Set Manager Agent at top
    await pool.query(`
      UPDATE agents
      SET hierarchy_level = 1, parent_agent_id = NULL, updated_at = NOW()
      WHERE id = $1
    `, [managerAgent.id]);
    console.log(`✅ Manager Agent → Level 1 (top)`);

    // Set Operations Agent under Manager
    await pool.query(`
      UPDATE agents
      SET hierarchy_level = 2, parent_agent_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [managerAgent.id, opsAgent.id]);
    console.log(`✅ Operations Agent → Level 2 (supervisor, reports to Manager)`);

    // Set all other agents under Operations
    const updateResult = await pool.query(`
      UPDATE agents
      SET hierarchy_level = 3, parent_agent_id = $1, updated_at = NOW()
      WHERE id NOT IN ($2, $3)
      RETURNING id, name
    `, [opsAgent.id, managerAgent.id, opsAgent.id]);

    console.log(`\n✅ Updated ${updateResult.rows.length} agents under Operations supervision:`);
    updateResult.rows.forEach(agent => {
      console.log(`   - ${agent.name} (ID: ${agent.id})`);
    });

    // Verify hierarchy
    const verifyResult = await pool.query(`
      SELECT 
        id,
        name,
        hierarchy_level,
        parent_agent_id
      FROM agents
      ORDER BY hierarchy_level, name
    `);

    console.log(`\n📊 Organizational Hierarchy:\n`);
    
    const byLevel = {};
    verifyResult.rows.forEach(agent => {
      if (!byLevel[agent.hierarchy_level]) byLevel[agent.hierarchy_level] = [];
      byLevel[agent.hierarchy_level].push(agent);
    });

    console.log('Level 1: Manager Agent (Top)');
    byLevel[1].forEach(a => console.log(`  🎯 ${a.name}`));

    console.log('\nLevel 2: Operations Agent (Supervisor)');
    byLevel[2].forEach(a => console.log(`  🔧 ${a.name} → Supervises all agents below`));

    console.log('\nLevel 3: All Other Agents (Supervised by Operations)');
    byLevel[3].forEach(a => console.log(`  📋 ${a.name}`));

    console.log(`\n✅ Supervision hierarchy established!`);
    console.log(`\n💡 Operations Agent now supervises ${updateResult.rows.length} agents.`);
    console.log(`   Orange lines will appear from Operations Agent to all supervised agents.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setupOperationsSupervisor();
