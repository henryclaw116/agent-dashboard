require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addRLTTower() {
  try {
    const result = await pool.query(
      `INSERT INTO consoles (
        name,
        type,
        description,
        status,
        connection_info,
        capabilities,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        'RLT Tower (GPU Node)',
        'compute',
        'Ubuntu Server 24.04 with RTX 3090 (24GB VRAM). Runs Ollama local models for social pipeline.',
        'online',
        JSON.stringify({
          ssh: {
            enabled: true,
            host: '192.168.0.214',
            username: 'tony',
            keyPath: '~/.ssh/id_rsa'
          },
          hostname: 'rlt-tower',
          ollama: {
            enabled: true,
            endpoint: 'http://192.168.0.214:11434'
          }
        }),
        ['ollama', 'local-models', 'gpu-compute', 'ssh', 'social-pipeline']
      ]
    );
    
    console.log('✅ Added RLT Tower:');
    console.log(JSON.stringify(result.rows[0], null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addRLTTower();
