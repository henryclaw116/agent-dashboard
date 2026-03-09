-- Team Members (humans) Schema

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100), -- 'Owner', 'Developer', 'Manager', 'Contractor', etc.
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent assignments to team members
CREATE TABLE IF NOT EXISTS agent_team_assignments (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    relationship VARCHAR(100), -- 'manages', 'collaborates_with', 'reports_to'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, team_member_id, relationship)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_agent_team_assignments ON agent_team_assignments(agent_id, team_member_id);

-- Trigger
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed Tony and team
INSERT INTO team_members (name, email, role, status, notes)
VALUES 
    ('Tony Pawlak', 'tony@reallifetrading.com', 'Owner/Founder', 'active', 'Founder of Real Life Trading'),
    ('Tim', 'tpharaoh@gmail.com', 'Lead Developer', 'active', 'Lead developer working on platform'),
    ('Eli', NULL, 'Developer', 'active', 'Developer working with Tim')
ON CONFLICT DO NOTHING;
