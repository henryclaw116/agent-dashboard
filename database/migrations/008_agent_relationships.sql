-- Agent Relationships & Workflow System
-- Visual connections between agents with workflow rules

-- ============================================
-- AGENT RELATIONSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_relationships (
    id SERIAL PRIMARY KEY,
    from_agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Relationship type
    relationship_type VARCHAR(50) NOT NULL,
    -- 'reports_to' - to_agent is manager of from_agent
    -- 'delegates_to' - from_agent can delegate tasks to to_agent
    -- 'approves_for' - to_agent approves work from from_agent
    -- 'collaborates_with' - equal peers working together
    -- 'escalates_to' - from_agent escalates issues to to_agent
    -- 'feeds_to' - from_agent's output becomes to_agent's input
    -- 'backs_up' - to_agent is backup for from_agent
    
    -- Workflow configuration
    workflow_config JSONB,
    -- {
    --   "auto_route_tasks": true,
    --   "requires_approval": true,
    --   "approval_threshold": { "priority": 1 },
    --   "task_filter": { "tags": ["video", "content"] },
    --   "routing_rules": { "on_complete": "delegate", "on_fail": "escalate" }
    -- }
    
    -- Visual metadata
    line_color VARCHAR(20),
    line_style VARCHAR(20), -- 'solid', 'dashed', 'dotted'
    label VARCHAR(255),
    
    -- Status
    enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    
    -- Prevent duplicate relationships
    CONSTRAINT unique_relationship UNIQUE (from_agent_id, to_agent_id, relationship_type)
);

CREATE INDEX idx_relationships_from ON agent_relationships(from_agent_id);
CREATE INDEX idx_relationships_to ON agent_relationships(to_agent_id);
CREATE INDEX idx_relationships_type ON agent_relationships(relationship_type);

-- ============================================
-- WORKFLOW TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS workflow_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Template definition
    template_config JSONB NOT NULL,
    -- {
    --   "steps": [
    --     { "agent_role": "content_creator", "action": "create_draft" },
    --     { "agent_role": "reviewer", "action": "review", "approves": true },
    --     { "agent_role": "publisher", "action": "publish" }
    --   ]
    -- }
    
    -- Category
    category VARCHAR(50), -- 'content', 'development', 'support', 'operations'
    
    -- Usage
    use_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    is_public BOOLEAN DEFAULT true
);

-- ============================================
-- AUTO-UPDATE HIERARCHY FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate hierarchy level based on vertical position (Y coordinate)
    -- Lower Y = higher in hierarchy (top of canvas)
    -- Agents within 50px of each other are considered same level
    
    UPDATE agents a
    SET hierarchy_level = (
        SELECT COUNT(DISTINCT FLOOR(b.position_y / 50))
        FROM agents b
        WHERE b.position_y < a.position_y
    )
    WHERE a.id = NEW.id OR a.id = OLD.id;
    
    -- Update parent relationships based on vertical position and connections
    -- If an agent is connected via 'reports_to' to someone above them, set parent
    UPDATE agents a
    SET parent_agent_id = (
        SELECT ar.to_agent_id
        FROM agent_relationships ar
        JOIN agents b ON b.id = ar.to_agent_id
        WHERE ar.from_agent_id = a.id
          AND ar.relationship_type = 'reports_to'
          AND b.position_y < a.position_y  -- To-agent is higher (lower Y)
        ORDER BY b.position_y ASC
        LIMIT 1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update hierarchy when agent positions change
CREATE TRIGGER trg_update_hierarchy
AFTER UPDATE OF position_y ON agents
FOR EACH ROW
EXECUTE FUNCTION update_agent_hierarchy();

-- ============================================
-- WORKFLOW AUTOMATION FUNCTIONS
-- ============================================

-- Function to route task based on relationships
CREATE OR REPLACE FUNCTION route_task_on_completion(p_task_id INTEGER)
RETURNS void AS $$
DECLARE
    v_task RECORD;
    v_relationship RECORD;
BEGIN
    -- Get completed task details
    SELECT * INTO v_task FROM task_queue WHERE id = p_task_id;
    
    IF v_task.status != 'completed' THEN
        RETURN;
    END IF;
    
    -- Find active routing relationships from the agent who completed the task
    FOR v_relationship IN
        SELECT *
        FROM agent_relationships
        WHERE from_agent_id = v_task.assigned_to_agent_id
          AND enabled = true
          AND relationship_type IN ('feeds_to', 'delegates_to')
          AND (workflow_config->>'auto_route_tasks')::boolean = true
    LOOP
        -- Create follow-up task for the connected agent
        INSERT INTO task_queue (
            task_name,
            task_type,
            assigned_to_agent_id,
            delegated_by_agent_id,
            task_payload,
            priority,
            depends_on_task_id
        )
        VALUES (
            'Follow-up: ' || v_task.task_name,
            'auto_routed',
            v_relationship.to_agent_id,
            v_task.assigned_to_agent_id,
            jsonb_build_object(
                'source_task_id', p_task_id,
                'source_result', v_task.result,
                'relationship_type', v_relationship.relationship_type
            ),
            v_task.priority,
            p_task_id
        );
        
        -- Log the routing
        INSERT INTO agent_logs (
            agent_id,
            task_id,
            log_level,
            message,
            action
        )
        VALUES (
            v_task.assigned_to_agent_id,
            p_task_id,
            'INFO',
            format('Task auto-routed to %s via %s relationship',
                   (SELECT name FROM agents WHERE id = v_relationship.to_agent_id),
                   v_relationship.relationship_type),
            'auto_route'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View: Relationship network with agent names
CREATE OR REPLACE VIEW relationship_network AS
SELECT 
    ar.id,
    ar.from_agent_id,
    fa.name as from_agent_name,
    fa.position_y as from_y,
    ar.to_agent_id,
    ta.name as to_agent_name,
    ta.position_y as to_y,
    ar.relationship_type,
    ar.workflow_config,
    ar.line_color,
    ar.line_style,
    ar.label,
    ar.enabled,
    CASE 
        WHEN fa.position_y < ta.position_y THEN 'downward'
        WHEN fa.position_y > ta.position_y THEN 'upward'
        ELSE 'lateral'
    END as flow_direction,
    ABS(fa.position_y - ta.position_y) as vertical_distance
FROM agent_relationships ar
JOIN agents fa ON fa.id = ar.from_agent_id
JOIN agents ta ON ta.id = ar.to_agent_id;

-- View: Agent hierarchy tree
CREATE OR REPLACE VIEW agent_hierarchy_tree AS
WITH RECURSIVE hierarchy AS (
    -- Root agents (no parent or top of tree)
    SELECT 
        id,
        name,
        parent_agent_id,
        hierarchy_level,
        position_y,
        ARRAY[id] as path,
        0 as depth
    FROM agents
    WHERE parent_agent_id IS NULL
       OR hierarchy_level = 0
    
    UNION ALL
    
    -- Children
    SELECT 
        a.id,
        a.name,
        a.parent_agent_id,
        a.hierarchy_level,
        a.position_y,
        h.path || a.id,
        h.depth + 1
    FROM agents a
    JOIN hierarchy h ON a.parent_agent_id = h.id
)
SELECT * FROM hierarchy
ORDER BY depth, position_y;

COMMENT ON TABLE agent_relationships IS 'Visual connections between agents defining workflow relationships';
COMMENT ON TABLE workflow_templates IS 'Reusable workflow templates for common agent collaboration patterns';
