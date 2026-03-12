/**
 * Populate agent positions for Pipeline org chart
 * Run this once to initialize positions for existing agents
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function populateAgentPositions() {
  try {
    console.log('🔗 Connecting to database...');
    await db.query('SELECT NOW()');
    console.log('✅ Connected');

    // Get all agents
    const result = await db.query('SELECT id, name, parent_agent_id FROM agents ORDER BY id');
    const agents = result.rows;

    console.log(`\n📊 Found ${agents.length} agents`);

    // Auto-layout algorithm
    const levelSpacing = 200;
    const nodeSpacing = 250;

    // Group by hierarchy level (based on parent relationships)
    const buildHierarchy = (agentId: number | null, level: number = 0): any[] => {
      return agents
        .filter(a => a.parent_agent_id === agentId)
        .map(agent => ({
          ...agent,
          level,
          children: buildHierarchy(agent.id, level + 1)
        }));
    };

    const hierarchy = buildHierarchy(null);

    // Flatten hierarchy and assign positions
    const positionAgents = (nodes: any[], level: number = 0, startX: number = 100): void => {
      const y = level * levelSpacing + 100;
      let currentX = startX;

      nodes.forEach((node, index) => {
        const x = currentX;
        
        console.log(`  Setting position for ${node.name}: (${x}, ${y}) at level ${level}`);

        // Update database
        db.query(`
          UPDATE agents
          SET position_x = $1,
              position_y = $2,
              hierarchy_level = $3
          WHERE id = $4
        `, [x, y, level, node.id]);

        currentX += nodeSpacing;

        // Position children
        if (node.children.length > 0) {
          positionAgents(node.children, level + 1, x);
        }
      });
    };

    positionAgents(hierarchy);

    console.log('\n✅ Agent positions populated!');
    console.log('\n📍 Positions:');
    
    const updated = await db.query(`
      SELECT id, name, position_x, position_y, hierarchy_level
      FROM agents
      ORDER BY hierarchy_level, position_x
    `);

    console.table(updated.rows);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

populateAgentPositions();
