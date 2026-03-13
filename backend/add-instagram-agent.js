// Add Instagram Outreach Agent to Dashboard

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addInstagramAgent() {
  try {
    console.log('📸 Adding Instagram Outreach Agent to dashboard...\n');
    
    // Add agent
    const agentResult = await pool.query(
      `INSERT INTO agents (
        name,
        role,
        status,
        skills,
        console_id,
        model,
        heartbeat_interval_seconds,
        hierarchy_level,
        parent_agent_id,
        position_x,
        position_y,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        'Instagram Outreach Agent',
        'Follower Engagement',
        'paused',  // Start paused, waiting for Tony's approval
        ['browser-automation', 'instagram-dm', 'follower-engagement', 'messaging'],
        2,  // Console #2: MSI Gateway (Primary)
        'openai/gpt-4o-mini',  // Cost-effective for simple DM personalization
        14400,  // 4 hours (checks 6x per day: 9am, 2pm, 7pm, etc.)
        3,  // Level 3: Supervised by Operations Agent
        7,  // Parent: Operations Agent
        450,  // Position X (right side of org chart)
        650   // Position Y (below other agents)
      ]
    );
    
    const agent = agentResult.rows[0];
    console.log('✅ Agent created:');
    console.log(`   ID: ${agent.id}`);
    console.log(`   Name: ${agent.name}`);
    console.log(`   Console: MSI Gateway (Primary)`);
    console.log(`   Status: paused`);
    console.log(`   Model: openai/gpt-4o-mini`);
    console.log('');
    
    // Create initial task (paused, waiting for approval)
    const taskResult = await pool.query(
      `INSERT INTO tasks (
        title,
        description,
        status,
        priority,
        agent_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [
        'Instagram DM Outreach - Awaiting Approval',
        'Instagram outreach agent created. Waiting for Tony\'s approval to begin sending DMs to followers. Will start with 5-10 test messages to gauge response.',
        'blocked',
        'medium',
        agent.id
      ]
    );
    
    console.log('✅ Initial task created:');
    console.log(`   Task ID: ${taskResult.rows[0].id}`);
    console.log(`   Title: ${taskResult.rows[0].title}`);
    console.log(`   Status: blocked (waiting for approval)`);
    console.log('');
    
    console.log('✅ Instagram Outreach Agent ready!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Tony approves agent in dashboard');
    console.log('   2. Update agent status to "idle"');
    console.log('   3. Run test batch (5-10 DMs)');
    console.log('   4. If successful, enable daily outreach');
    console.log('');
    console.log('🌐 View in dashboard:');
    console.log('   https://rlt-agent-dashboard.vercel.app/pipeline');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addInstagramAgent();
