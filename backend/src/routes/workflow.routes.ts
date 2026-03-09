import { Router, Request, Response } from 'express';
import { db } from '../server';

const router = Router();

// Get all workflows for an agent
router.get('/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    const result = await db.query(
      `SELECT w.*, COUNT(s.id) as step_count
       FROM agent_workflows w
       LEFT JOIN workflow_steps s ON w.id = s.workflow_id
       WHERE w.agent_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [agentId]
    );
    
    res.json({ success: true, workflows: result.rows });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflows' });
  }
});

// Get workflow with all steps
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get workflow
    const workflowResult = await db.query(
      'SELECT * FROM agent_workflows WHERE id = $1',
      [id]
    );
    
    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    // Get steps
    const stepsResult = await db.query(
      'SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY step_order',
      [id]
    );
    
    res.json({
      success: true,
      workflow: workflowResult.rows[0],
      steps: stepsResult.rows
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workflow' });
  }
});

// Create workflow
router.post('/', async (req: Request, res: Response) => {
  try {
    const { agent_id, name, description, is_active } = req.body;
    
    const result = await db.query(
      `INSERT INTO agent_workflows (agent_id, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [agent_id, name, description || null, is_active !== undefined ? is_active : true]
    );
    
    res.json({ success: true, workflow: result.rows[0] });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ success: false, error: 'Failed to create workflow' });
  }
});

// Update workflow
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    const result = await db.query(
      `UPDATE agent_workflows
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    
    res.json({ success: true, workflow: result.rows[0] });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ success: false, error: 'Failed to update workflow' });
  }
});

// Delete workflow
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM agent_workflows WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete workflow' });
  }
});

// Add step to workflow
router.post('/:workflowId/steps', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const {
      step_order,
      step_name,
      prompt,
      rules,
      conditions,
      prerequisites,
      expected_output,
      tools_needed,
      estimated_duration_minutes
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO workflow_steps 
       (workflow_id, step_order, step_name, prompt, rules, conditions, prerequisites, expected_output, tools_needed, estimated_duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [workflowId, step_order, step_name, prompt, rules, conditions, prerequisites, expected_output, tools_needed, estimated_duration_minutes]
    );
    
    res.json({ success: true, step: result.rows[0] });
  } catch (error) {
    console.error('Add step error:', error);
    res.status(500).json({ success: false, error: 'Failed to add step' });
  }
});

// Update step
router.put('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const {
      step_order,
      step_name,
      prompt,
      rules,
      conditions,
      prerequisites,
      expected_output,
      tools_needed,
      estimated_duration_minutes
    } = req.body;
    
    const result = await db.query(
      `UPDATE workflow_steps
       SET step_order = COALESCE($1, step_order),
           step_name = COALESCE($2, step_name),
           prompt = COALESCE($3, prompt),
           rules = COALESCE($4, rules),
           conditions = COALESCE($5, conditions),
           prerequisites = COALESCE($6, prerequisites),
           expected_output = COALESCE($7, expected_output),
           tools_needed = COALESCE($8, tools_needed),
           estimated_duration_minutes = COALESCE($9, estimated_duration_minutes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [step_order, step_name, prompt, rules, conditions, prerequisites, expected_output, tools_needed, estimated_duration_minutes, stepId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Step not found' });
    }
    
    res.json({ success: true, step: result.rows[0] });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({ success: false, error: 'Failed to update step' });
  }
});

// Delete step
router.delete('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    await db.query('DELETE FROM workflow_steps WHERE id = $1', [stepId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete step error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete step' });
  }
});

// Reorder steps
router.put('/:workflowId/steps/reorder', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { stepOrders } = req.body; // Array of {id, step_order}
    
    // Update each step's order
    for (const { id, step_order } of stepOrders) {
      await db.query(
        'UPDATE workflow_steps SET step_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND workflow_id = $3',
        [step_order, id, workflowId]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder steps error:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder steps' });
  }
});

export default router;
