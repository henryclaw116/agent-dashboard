/**
 * Setup Social Media Lead Generation Workflow
 * Creates visual pipeline with relationships and positioning
 */

import { Pool } from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const API_BASE = process.env.API_BASE || 'https://backend-production-a8dd.up.railway.app';

async function setupLeadGenWorkflow() {
  try {
    console.log('🔗 Setting up Social Media Lead Generation Workflow\n');

    // Get the social agents
    const agents = await db.query(`
      SELECT id, name, role, prompt
      FROM agents
      WHERE name LIKE 'Social%'
      ORDER BY id
    `);

    console.log(`📊 Found ${agents.rows.length} agents in pipeline:\n`);
    agents.rows.forEach(a => console.log(`  ${a.id}. ${a.name} - ${a.role}`));

    // Position agents vertically in pipeline order
    const positions = [
      { id: 11, name: 'Social Scanner', x: 400, y: 100, level: 0 },
      { id: 12, name: 'Social Scorer', x: 400, y: 300, level: 1 },
      { id: 13, name: 'Social Router', x: 400, y: 500, level: 2 },
      { id: 14, name: 'Social Writer', x: 400, y: 700, level: 3 },
      { id: 15, name: 'Social Dedup', x: 400, y: 900, level: 4 },
      { id: 16, name: 'Social Tracker', x: 400, y: 1100, level: 5 }
    ];

    console.log('\n📍 Positioning agents...');
    for (const pos of positions) {
      await db.query(`
        UPDATE agents
        SET position_x = $1,
            position_y = $2,
            hierarchy_level = $3
        WHERE id = $4
      `, [pos.x, pos.y, pos.level, pos.id]);
      console.log(`  ✓ ${pos.name} at (${pos.x}, ${pos.y}) Level ${pos.level}`);
    }

    // Create pipeline relationships
    const relationships = [
      {
        from: 11, // Social Scanner
        to: 12,   // Social Scorer
        type: 'feeds_to',
        label: 'Filtered Leads',
        config: {
          auto_route_tasks: true,
          task_filter: { tags: ['lead', 'social'] },
          routing_rules: { on_complete: 'delegate', min_score: 'KEEP' }
        },
        notes: 'Scanner filters 80% noise, passes KEEP leads to Scorer'
      },
      {
        from: 12, // Social Scorer
        to: 13,   // Social Router
        type: 'feeds_to',
        label: 'High-Score Leads (70+)',
        config: {
          auto_route_tasks: true,
          task_filter: { tags: ['lead', 'scored'] },
          priority_threshold: { score: 70 },
          routing_rules: { on_complete: 'delegate', min_score: 70 }
        },
        notes: 'Only leads scoring 70+ pass to Router for pain analysis'
      },
      {
        from: 13, // Social Router
        to: 14,   // Social Writer
        type: 'feeds_to',
        label: 'Routed + Landing Page',
        config: {
          auto_route_tasks: true,
          task_filter: { tags: ['lead', 'routed'] },
          routing_rules: { on_complete: 'delegate', includes_landing_page: true }
        },
        notes: 'Router determines pain type and correct landing page, sends to Writer'
      },
      {
        from: 14, // Social Writer
        to: 15,   // Social Dedup
        type: 'feeds_to',
        label: 'Draft Reply + Link',
        config: {
          auto_route_tasks: true,
          task_filter: { tags: ['lead', 'reply-draft'] },
          routing_rules: { on_complete: 'delegate', includes_reply: true }
        },
        notes: 'Writer creates 4-sentence reply with [LINK] placeholder, sends to Dedup'
      },
      {
        from: 15, // Social Dedup
        to: 16,   // Social Tracker
        type: 'feeds_to',
        label: 'Deduped Reply',
        config: {
          auto_route_tasks: true,
          task_filter: { tags: ['lead', 'approved'] },
          routing_rules: { on_complete: 'delegate', user_not_contacted_30d: true }
        },
        notes: 'Dedup checks 30-day history, passes unique leads to Tracker for link injection'
      }
    ];

    console.log('\n🔗 Creating pipeline relationships...\n');
    for (const rel of relationships) {
      try {
        const response = await axios.post(`${API_BASE}/api/relationships`, {
          from_agent_id: rel.from,
          to_agent_id: rel.to,
          relationship_type: rel.type,
          workflow_config: rel.config,
          line_color: '#10B981', // Green for pipeline flow
          line_style: 'solid',
          label: rel.label,
          notes: rel.notes
        });

        const fromAgent = agents.rows.find(a => a.id === rel.from);
        const toAgent = agents.rows.find(a => a.id === rel.to);
        console.log(`  ✓ ${fromAgent?.name} → ${toAgent?.name}`);
        console.log(`    Label: "${rel.label}"`);
        console.log(`    Auto-routing: ${rel.config.auto_route_tasks ? 'ON' : 'OFF'}\n`);
      } catch (error: any) {
        if (error.response?.data?.error?.includes('duplicate')) {
          console.log(`  ⚠️  Relationship already exists, skipping...\n`);
        } else {
          console.error(`  ✗ Failed: ${error.message}\n`);
        }
      }
    }

    // Add Manager connection (Pipeline Monitor reports to Tony)
    const monitorAgent = agents.rows.find(a => a.name === 'Social Pipeline Monitor');
    if (monitorAgent) {
      console.log('👤 Adding Manager oversight...');
      await db.query(`
        UPDATE agents
        SET position_x = 100,
            position_y = 50,
            hierarchy_level = -1
        WHERE id = $1
      `, [monitorAgent.id]);

      // Monitor oversees the entire pipeline
      for (let i = 11; i <= 16; i++) {
        try {
          await axios.post(`${API_BASE}/api/relationships`, {
            from_agent_id: i,
            to_agent_id: monitorAgent.id,
            relationship_type: 'escalates_to',
            workflow_config: { auto_route_tasks: false },
            line_color: '#F59E0B',
            line_style: 'dashed',
            label: 'Escalation',
            notes: 'Agents escalate issues to Pipeline Monitor'
          });
        } catch (error) {
          // Ignore duplicates
        }
      }
      console.log('  ✓ Pipeline Monitor positioned as overseer\n');
    }

    console.log('✅ Social Media Lead Generation Workflow Setup Complete!\n');
    console.log('📊 Pipeline Flow:');
    console.log('   1️⃣  Social Scanner (filters 80% noise)');
    console.log('   2️⃣  Social Scorer (scores 0-100, passes 70+)');
    console.log('   3️⃣  Social Router (pain analysis + landing page)');
    console.log('   4️⃣  Social Writer (craft reply with [LINK])');
    console.log('   5️⃣  Social Dedup (check 30-day history)');
    console.log('   6️⃣  Social Tracker (inject Bitly link + UTM)\n');
    
    console.log('🎯 Auto-Routing Enabled:');
    console.log('   When any stage completes → Next stage gets task automatically');
    console.log('   Task data flows through entire pipeline hands-free\n');

    console.log('🔍 View on dashboard:');
    console.log('   https://rlt-agent-dashboard.vercel.app/pipeline');
    console.log('   Scroll down to see vertical pipeline with green arrows\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupLeadGenWorkflow();
