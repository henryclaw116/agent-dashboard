import express from 'express';
import { db } from '../server';
import { broadcast } from '../server';

const router = express.Router();

/**
 * GET /api/relationships
 * Get all agent relationships
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM relationship_network
      WHERE enabled = true
      ORDER BY from_agent_name, to_agent_name
    `);
    
    res.json({ success: true, relationships: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/relationships
 * Create a new agent relationship
 */
router.post('/', async (req, res) => {
  try {
    const {
      from_agent_id,
      to_agent_id,
      relationship_type,
      workflow_config,
      line_color,
      line_style,
      label,
      notes
    } = req.body;

    const result = await db.query(`
      INSERT INTO agent_relationships (
        from_agent_id,
        to_agent_id,
        relationship_type,
        workflow_config,
        line_color,
        line_style,
        label,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'user')
      RETURNING *
    `, [
      from_agent_id,
      to_agent_id,
      relationship_type,
      workflow_config || {},
      line_color || '#3B82F6',
      line_style || 'solid',
      label,
      notes
    ]);

    broadcast({ type: 'relationship_created', relationship: result.rows[0] });

    res.json({ success: true, relationship: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/relationships/:id
 * Update a relationship
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { workflow_config, line_color, line_style, label, enabled } = req.body;

    const result = await db.query(`
      UPDATE agent_relationships
      SET workflow_config = COALESCE($1, workflow_config),
          line_color = COALESCE($2, line_color),
          line_style = COALESCE($3, line_style),
          label = COALESCE($4, label),
          enabled = COALESCE($5, enabled),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [workflow_config, line_color, line_style, label, enabled, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    broadcast({ type: 'relationship_updated', relationship: result.rows[0] });

    res.json({ success: true, relationship: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/relationships/:id
 * Delete a relationship
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM agent_relationships WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    broadcast({ type: 'relationship_deleted', id: parseInt(id) });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/relationships/agent/:agent_id
 * Get all relationships for a specific agent
 */
router.get('/agent/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;

    const result = await db.query(`
      SELECT * FROM relationship_network
      WHERE (from_agent_id = $1 OR to_agent_id = $1)
        AND enabled = true
    `, [agent_id]);

    res.json({ success: true, relationships: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
