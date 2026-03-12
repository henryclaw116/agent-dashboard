// Register RLT Social Pipeline Agents - Standalone Script
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const agents = [
  {
    name: 'Social Scanner',
    role: 'Lead Scanning',
    model: 'phi3:mini',
    status: 'idle',
    skills: ['Fast content filtering', 'spam rejection', 'volume processing'],
    prompt: 'Stage 1: Scans 2000+ posts/hour, rejects 80% noise using phi3:mini local model. Outputs KEEP or REJECT only.'
  },
  {
    name: 'Social Scorer',
    role: 'Lead Scoring',
    model: 'llama3.1:8b',
    status: 'idle',
    skills: ['Lead scoring 0-100', 'pain categorization', 'competitor detection'],
    prompt: 'Stage 2: Scores remaining leads 0-100, categorizes pain type. Only 70+ scores pass to Claude Sonnet.'
  },
  {
    name: 'Social Router',
    role: 'Pain Analysis',
    model: 'claude-sonnet-4-5',
    status: 'idle',
    skills: ['Deep pain analysis', 'landing page routing', 'nuance detection'],
    prompt: 'Stage 3: Claude Sonnet analyzes root pain, routes to correct landing page (start-trading, consistency, stop-losing, 200-challenge, emotional).'
  },
  {
    name: 'Social Writer',
    role: 'Reply Generation',
    model: 'claude-sonnet-4-5',
    status: 'idle',
    skills: ['Human-quality replies', 'tone calibration', 'platform-specific writing'],
    prompt: 'Stage 4: Claude Sonnet writes genuine, helpful 4-sentence replies with [LINK] placeholder for Bitly injection.'
  },
  {
    name: 'Social Dedup',
    role: 'Deduplication',
    model: 'nomic-embed-text',
    status: 'idle',
    skills: ['Duplicate detection', 'user tracking', 'reply variation'],
    prompt: 'Stage 5: Blocks repeat outreach (30-day user tracking), detects duplicate content using embeddings.'
  },
  {
    name: 'Social Tracker',
    role: 'Link Tracking',
    model: 'bitly-api',
    status: 'idle',
    skills: ['Bitly short links', 'UTM generation', 'click tracking'],
    prompt: 'Stage 6: Generates rlt.to branded Bitly links with full UTM attribution (source, medium, campaign, content, term).'
  }
];

async function registerAgents() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Registering RLT Social Pipeline Agents...\n');
    
    for (const agent of agents) {
      console.log(`📝 Registering: ${agent.name}`);
      
      // Check if exists
      const checkResult = await client.query(
        'SELECT id FROM agents WHERE name = $1',
        [agent.name]
      );
      
      if (checkResult.rows.length > 0) {
        console.log(`   ⚠️  Agent already exists with ID: ${checkResult.rows[0].id} - Skipping\n`);
        continue;
      }
      
      // Insert new agent
      const insertResult = await client.query(
        `INSERT INTO agents (
          name, role, model, status, skills, prompt, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
        [
          agent.name,
          agent.role,
          agent.model,
          agent.status,
          agent.skills,
          agent.prompt
        ]
      );
      
      console.log(`   ✅ Created with ID: ${insertResult.rows[0].id}\n`);
    }
    
    console.log('✅ Pipeline agents registered!\n');
    
    // List all social pipeline agents
    console.log('📊 Current Pipeline Agents:');
    const listResult = await client.query(
      `SELECT id, name, role, model, status 
       FROM agents 
       WHERE name LIKE 'Social %' 
       ORDER BY id`
    );
    
    console.table(listResult.rows);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Copy social-pipeline/database-schema.sql to backend/database/pipeline-schema.sql');
    console.log('   2. Deploy to tower console when ready');
    console.log('   3. Configure Bitly API token');
    console.log('   4. Start pipeline monitoring');
    console.log('   5. View agents at: https://rlt-agent-dashboard.vercel.app/team');
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

registerAgents().catch(console.error);
