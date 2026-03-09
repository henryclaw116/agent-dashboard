-- Agent Workflow Management Schema

-- Workflows table
CREATE TABLE IF NOT EXISTS agent_workflows (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES agent_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL, -- 1, 2, 3, etc.
    step_name VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL, -- Main instructions for this step
    rules TEXT, -- Rules that must be followed
    conditions TEXT, -- Conditions that must be met before proceeding
    prerequisites TEXT, -- What needs to be done before this step
    expected_output TEXT, -- What this step should produce
    tools_needed TEXT[], -- Tools/resources needed for this step
    estimated_duration_minutes INTEGER, -- How long this step typically takes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, step_order)
);

-- Workflow execution log (track when workflows run)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES agent_workflows(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    current_step INTEGER, -- Which step is currently running
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'paused', 'complete', 'failed'
    notes TEXT
);

-- Step execution log (track each step)
CREATE TABLE IF NOT EXISTS step_executions (
    id SERIAL PRIMARY KEY,
    workflow_execution_id INTEGER REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id INTEGER REFERENCES workflow_steps(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'complete', 'failed', 'skipped'
    output TEXT, -- What was produced by this step
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_workflows_agent ON agent_workflows(agent_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_agent ON workflow_executions(agent_id);

-- Triggers
CREATE TRIGGER update_agent_workflows_updated_at BEFORE UPDATE ON agent_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
