import { Router, Request, Response } from 'express';
import { db } from '../server';

const router = Router();

// Get all agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        COUNT(DISTINCT ag.id) as goal_count,
        COUNT(DISTINCT t.id) as task_count,
        (SELECT name FROM agents WHERE id = a.parent_agent_id) as parent_agent_name,
        c.name as console_name,
        c.status as console_status
      FROM agents a
      LEFT JOIN agent_goals ag ON a.id = ag.agent_id AND ag.status = 'active'
      LEFT JOIN tasks t ON a.id = t.agent_id AND t.status IN ('pending', 'in_progress')
      LEFT JOIN consoles c ON a.console_id = c.id
      GROUP BY a.id, c.name, c.status
      ORDER BY a.created_at DESC
    `);
    
    res.json({ success: true, agents: result.rows });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agents' });
  }
});

// Get agent by ID with details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get agent
    const agentResult = await db.query('SELECT * FROM agents WHERE id = $1', [id]);
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    // Get goals
    const goalsResult = await db.query(
      'SELECT * FROM agent_goals WHERE agent_id = $1 ORDER BY priority, created_at',
      [id]
    );
    
    // Get recent activity
    const activityResult = await db.query(
      'SELECT * FROM agent_activity WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 20',
      [id]
    );
    
    // Get agenda
    const agendaResult = await db.query(
      'SELECT * FROM agent_agenda WHERE agent_id = $1 AND status != \'complete\' ORDER BY scheduled_for',
      [id]
    );
    
    // Get sub-agents
    const subAgentsResult = await db.query(
      'SELECT * FROM agents WHERE parent_agent_id = $1',
      [id]
    );
    
    res.json({
      success: true,
      agent: agentResult.rows[0],
      goals: goalsResult.rows,
      activity: activityResult.rows,
      agenda: agendaResult.rows,
      sub_agents: subAgentsResult.rows
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent' });
  }
});

// Create agent
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, role, avatar_url, personality, skills, prompt, parent_agent_id, console_id, model } = req.body;
    
    const result = await db.query(
      `INSERT INTO agents (name, role, avatar_url, personality, skills, prompt, parent_agent_id, console_id, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, role, avatar_url || null, personality || null, skills || [], prompt || null, parent_agent_id || null, console_id || null, model || 'anthropic/claude-sonnet-4-5']
    );
    
    res.json({ success: true, agent: result.rows[0] });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ success: false, error: 'Failed to create agent' });
  }
});

// Update agent
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, avatar_url, personality, skills, prompt, status, parent_agent_id, console_id, model } = req.body;
    
    const result = await db.query(
      `UPDATE agents 
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           avatar_url = COALESCE($3, avatar_url),
           personality = COALESCE($4, personality),
           skills = COALESCE($5, skills),
           prompt = COALESCE($6, prompt),
           status = COALESCE($7, status),
           parent_agent_id = COALESCE($8, parent_agent_id),
           console_id = COALESCE($9, console_id),
           model = COALESCE($10, model),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [name, role, avatar_url, personality, skills, prompt, status, parent_agent_id, console_id, model, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    res.json({ success: true, agent: result.rows[0] });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ success: false, error: 'Failed to update agent' });
  }
});

// Delete agent
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM agents WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete agent' });
  }
});

// Add goal to agent
router.post('/:id/goals', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { goal, priority, due_date } = req.body;
    
    const result = await db.query(
      `INSERT INTO agent_goals (agent_id, goal, priority, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, goal, priority || 2, due_date || null]
    );
    
    res.json({ success: true, goal: result.rows[0] });
  } catch (error) {
    console.error('Add goal error:', error);
    res.status(500).json({ success: false, error: 'Failed to add goal' });
  }
});

// Log agent activity
router.post('/:id/activity', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { activity_type, description, metadata } = req.body;
    
    const result = await db.query(
      `INSERT INTO agent_activity (agent_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, activity_type, description, metadata || null]
    );
    
    res.json({ success: true, activity: result.rows[0] });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

// Add agenda item
router.post('/:id/agenda', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, scheduled_for, priority, task_id } = req.body;
    
    const result = await db.query(
      `INSERT INTO agent_agenda (agent_id, title, description, scheduled_for, priority, task_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, title, description || null, scheduled_for, priority || 2, task_id || null]
    );
    
    res.json({ success: true, agenda_item: result.rows[0] });
  } catch (error) {
    console.error('Add agenda error:', error);
    res.status(500).json({ success: false, error: 'Failed to add agenda item' });
  }
});

// Get agent costs (daily and monthly)
router.get('/:id/costs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, year, month } = req.query;
    
    // Get daily cost
    const dailyCostResult = await db.query(
      'SELECT get_agent_daily_cost($1, $2) as daily_cost',
      [id, date || new Date().toISOString().split('T')[0]]
    );
    
    // Get monthly cost
    const now = new Date();
    const monthlyYear = year ? parseInt(year as string) : now.getFullYear();
    const monthlyMonth = month ? parseInt(month as string) : now.getMonth() + 1;
    
    const monthlyCostResult = await db.query(
      'SELECT get_agent_monthly_cost($1, $2, $3) as monthly_cost',
      [id, monthlyYear, monthlyMonth]
    );
    
    // Get recent cost breakdown
    const breakdownResult = await db.query(
      `SELECT date, model, input_tokens, output_tokens, total_tokens, estimated_cost, request_count
       FROM agent_costs
       WHERE agent_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [id]
    );
    
    res.json({
      success: true,
      daily_cost: parseFloat(dailyCostResult.rows[0].daily_cost) || 0,
      monthly_cost: parseFloat(monthlyCostResult.rows[0].monthly_cost) || 0,
      breakdown: breakdownResult.rows
    });
  } catch (error) {
    console.error('Get agent costs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent costs' });
  }
});

// Log agent cost (called when agent makes API calls)
router.post('/:id/costs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { model, input_tokens, output_tokens, estimated_cost } = req.body;
    
    const total_tokens = input_tokens + output_tokens;
    const date = new Date().toISOString().split('T')[0];
    
    // Upsert cost record
    await db.query(
      `INSERT INTO agent_costs (agent_id, date, model, input_tokens, output_tokens, total_tokens, estimated_cost, request_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       ON CONFLICT (agent_id, date, model)
       DO UPDATE SET
         input_tokens = agent_costs.input_tokens + $4,
         output_tokens = agent_costs.output_tokens + $5,
         total_tokens = agent_costs.total_tokens + $6,
         estimated_cost = agent_costs.estimated_cost + $7,
         request_count = agent_costs.request_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [id, date, model, input_tokens, output_tokens, total_tokens, estimated_cost]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Log agent cost error:', error);
    res.status(500).json({ success: false, error: 'Failed to log agent cost' });
  }
});

export default router;
