-- Agent Cost Tracking Schema

-- Add model column to agents if not exists
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model VARCHAR(100) DEFAULT 'anthropic/claude-sonnet-4-5';

-- Agent cost tracking table
CREATE TABLE IF NOT EXISTS agent_costs (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    model VARCHAR(100) NOT NULL,
    input_tokens BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    estimated_cost DECIMAL(10, 6) DEFAULT 0.00, -- In USD
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, date, model) -- One row per agent per day per model
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_costs_agent_date ON agent_costs(agent_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_costs_date ON agent_costs(date DESC);

-- Trigger
CREATE TRIGGER update_agent_costs_updated_at BEFORE UPDATE ON agent_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get agent daily cost
CREATE OR REPLACE FUNCTION get_agent_daily_cost(p_agent_id INTEGER, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10, 6) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(estimated_cost) FROM agent_costs WHERE agent_id = p_agent_id AND date = p_date),
        0.00
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get agent monthly cost
CREATE OR REPLACE FUNCTION get_agent_monthly_cost(p_agent_id INTEGER, p_year INTEGER, p_month INTEGER)
RETURNS DECIMAL(10, 6) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(estimated_cost) 
         FROM agent_costs 
         WHERE agent_id = p_agent_id 
         AND EXTRACT(YEAR FROM date) = p_year 
         AND EXTRACT(MONTH FROM date) = p_month),
        0.00
    );
END;
$$ LANGUAGE plpgsql;
