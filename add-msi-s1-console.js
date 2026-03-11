const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function addConsole() {
  try {
    const connectionInfo = {
      host: '192.168.0.79',
      port: 18789,
      protocol: 'http',
      gatewayToken: 'c87a927c720c649bbb34a84aa6aee442ae04bc129224c159',
      ssh: {
        enabled: true,
        username: 'tony',
        keyPath: '~/.ssh/id_msi_s1'
      }
    };
    
    const result = await pool.query(
      `INSERT INTO consoles (name, type, description, status, connection_info, capabilities, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       RETURNING *`,
      [
        'MSI S1 Compute Node',
        'compute',
        'Third compute node - MSI S1 laptop running Ubuntu Server 24.04 on WiFi',
        'online',
        JSON.stringify(connectionInfo),
        ['gateway', 'ssh', 'agent']
      ]
    );
    
    console.log('✅ MSI S1 Console added successfully!');
    console.log(JSON.stringify(result.rows[0], null, 2));
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

addConsole();
