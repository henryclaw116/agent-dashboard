const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.lovqxazutdfpaxvwzasc:RLT%28supabase%292%2C026@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function updateProject() {
  try {
    // Check if project exists
    const check = await pool.query('SELECT * FROM projects WHERE id = 14');
    
    if (check.rows.length === 0) {
      // Create new project
      const result = await pool.query(`
        INSERT INTO projects (
          name,
          description,
          status,
          priority,
          percent_complete,
          start_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        'Railway Backend Deployment',
        'Deploy Agent Dashboard backend to Railway for public API access. Required for Vercel production dashboard to work.\n\n⏸️ PAUSED - Waiting for Tony to say "resume railway deployment"\n\nCurrent workaround: Run dashboard locally with npm run dev',
        'paused',
        2, // Medium priority
        0,
        new Date().toISOString().split('T')[0]
      ]);
      console.log('✅ Railway deployment project created (ID 14)');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      // Update existing project
      const result = await pool.query(`
        UPDATE projects 
        SET status = 'paused',
            priority = 2,
            percent_complete = 0,
            description = 'Deploy Agent Dashboard backend to Railway for public API access. Required for Vercel production dashboard to work.\n\n⏸️ PAUSED - Waiting for Tony to say "resume railway deployment"\n\nCurrent workaround: Run dashboard locally with npm run dev',
            updated_at = NOW()
        WHERE id = 14
        RETURNING *
      `);
      console.log('✅ Railway deployment project updated to paused status');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

updateProject();
