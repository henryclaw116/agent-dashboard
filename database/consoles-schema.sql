-- Console/Environment Management Schema

-- Consoles table (execution environments for agents)
CREATE TABLE IF NOT EXISTS consoles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- 'openclaw', 'acp', 'custom', etc.
    description TEXT,
    status VARCHAR(50) DEFAULT 'offline', -- 'online', 'offline', 'error'
    connection_info JSONB, -- Store connection details, API endpoints, etc.
    capabilities TEXT[], -- Array of what this console can do
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update agents table to reference consoles
ALTER TABLE agents ADD COLUMN IF NOT EXISTS console_id INTEGER REFERENCES consoles(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consoles_status ON consoles(status);
CREATE INDEX IF NOT EXISTS idx_agents_console ON agents(console_id);

-- Trigger
CREATE TRIGGER update_consoles_updated_at BEFORE UPDATE ON consoles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
