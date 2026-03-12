require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setManagerSupervision() {
  try {
    console.log('🔧 Setting up Manager Agent supervision hierarchy...\n');

    // Get Manager Agent ID (should be 1)
    const managerResult = await pool.query(`
      SELECT id, name FROM agents WHERE name = 'Manager Agent' LIMIT 1
    `);

    if (managerResult.rows.length === 0) {
      console.error('❌ Manager Agent not found!');
      return;
    }

    const managerId = managerResult.rows[0].id;
    console.log(`✅ Found Manager Agent (ID: ${managerId})\n`);

    // Set Manager Agent as parent for all other agents
    const updateResult = await pool.query(`
      UPDATE agents
      SET parent_agent_id = $1, hierarchy_level = 2, updated_at = NOW()
      WHERE id != $1 AND parent_agent_id IS NULL
      RETURNING id, name
    `, [managerId]);

    console.log(`✅ Updated ${updateResult.rows.length} agents:`);
    updateResult.rows.forEach(agent => {
      console.log(`   - ${agent.name} (ID: ${agent.id})`);
    });

    // Set Manager Agent at top level
    await pool.query(`
      UPDATE agents
      SET hierarchy_level = 1, updated_at = NOW()
      WHERE id = $1
    `, [managerId]);

    console.log(`\n✅ Manager Agent set to hierarchy level 1 (top)`);

    // Verify the hierarchy
    const verifyResult = await pool.query(`
      SELECT 
        id,
        name,
        hierarchy_level,
        parent_agent_id,
        CASE 
          WHEN parent_agent_id = $1 THEN '└─→ Supervised by Manager'
          WHEN parent_agent_id IS NULL AND id = $1 THEN '🎯 SUPERVISOR'
          ELSE '   (No supervision)'
        END as relationship
      FROM agents
      ORDER BY hierarchy_level, name
    `, [managerId]);

    console.log(`\n📊 Organizational Hierarchy:\n`);
    verifyResult.rows.forEach(agent => {
      const indent = agent.hierarchy_level === 1 ? '' : '  ';
      console.log(`${indent}${agent.name} ${agent.relationship}`);
    });

    console.log(`\n✅ Supervision hierarchy established!`);
    console.log(`\n💡 Manager Agent now supervises all agents in the org chart.`);
    console.log(`   Yellow supervision lines will appear in the dashboard.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setManagerSupervision();
