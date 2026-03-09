-- Agent Management Schema

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100), -- e.g., 'Marketing Agent', 'Development Agent', 'Business Agent'
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'idle', -- 'active', 'idle', 'paused', 'error'
    personality TEXT, -- JSON or text describing personality/tone
    skills TEXT[], -- Array of skills/capabilities
    prompt TEXT, -- Main instruction prompt for the agent
    model VARCHAR(100) DEFAULT 'anthropic/claude-sonnet-4-5', -- Model this agent uses
    parent_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL, -- For sub-agents
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent goals
CREATE TABLE IF NOT EXISTS agent_goals (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    priority INTEGER DEFAULT 2, -- 1=high, 2=medium, 3=low
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'complete', 'paused'
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent activity log
CREATE TABLE IF NOT EXISTS agent_activity (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    activity_type VARCHAR(100), -- 'task_started', 'task_completed', 'error', 'message_sent', etc.
    description TEXT,
    metadata JSONB, -- Additional data (task_id, project_id, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent agenda/scheduled jobs
CREATE TABLE IF NOT EXISTS agent_agenda (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_for TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'failed'
    priority INTEGER DEFAULT 2,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_goals_status ON agent_goals(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_time ON agent_activity(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_agenda_scheduled ON agent_agenda(agent_id, scheduled_for);

-- Triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_goals_updated_at BEFORE UPDATE ON agent_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_agenda_updated_at BEFORE UPDATE ON agent_agenda
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update tasks table to reference agents
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
