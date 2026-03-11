-- Cost Tracking Schema
-- Track token usage and costs per agent

-- Token usage tracking
CREATE TABLE IF NOT EXISTS token_usage (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    agent_name VARCHAR(100),
    session_key VARCHAR(255),
    model VARCHAR(100) NOT NULL, -- e.g., 'claude-sonnet-4-5', 'gpt-4o'
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0, -- Cost in USD
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model pricing (costs per million tokens)
CREATE TABLE IF NOT EXISTS model_pricing (
    id SERIAL PRIMARY KEY,
    model VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'anthropic', 'openai', 'google', etc.
    input_price_per_million DECIMAL(10,4) NOT NULL, -- Price per 1M input tokens
    output_price_per_million DECIMAL(10,4) NOT NULL, -- Price per 1M output tokens
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pricing for common models
INSERT INTO model_pricing (model, provider, input_price_per_million, output_price_per_million) VALUES
    ('claude-sonnet-4-5', 'anthropic', 3.00, 15.00),
    ('claude-sonnet-3-5', 'anthropic', 3.00, 15.00),
    ('claude-opus-3', 'anthropic', 15.00, 75.00),
    ('claude-haiku-3', 'anthropic', 0.25, 1.25),
    ('gpt-4o', 'openai', 2.50, 10.00),
    ('gpt-4o-mini', 'openai', 0.15, 0.60),
    ('gpt-4-turbo', 'openai', 10.00, 30.00),
    ('gemini-2.0-flash-exp', 'google', 0.00, 0.00), -- Free tier
    ('gemini-1.5-pro', 'google', 1.25, 5.00)
ON CONFLICT (model) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_id ON token_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent_name ON token_usage(agent_name);

-- View: Daily cost summary
CREATE OR REPLACE VIEW daily_cost_summary AS
SELECT 
    DATE(timestamp) as date,
    SUM(cost_usd) as total_cost,
    SUM(total_tokens) as total_tokens,
    COUNT(*) as request_count
FROM token_usage
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- View: Monthly cost summary
CREATE OR REPLACE VIEW monthly_cost_summary AS
SELECT 
    DATE_TRUNC('month', timestamp) as month,
    SUM(cost_usd) as total_cost,
    SUM(total_tokens) as total_tokens,
    COUNT(*) as request_count
FROM token_usage
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC;

-- View: Cost by agent
CREATE OR REPLACE VIEW cost_by_agent AS
SELECT 
    agent_name,
    agent_id,
    SUM(cost_usd) as total_cost,
    SUM(total_tokens) as total_tokens,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    COUNT(*) as request_count,
    MAX(timestamp) as last_activity
FROM token_usage
GROUP BY agent_name, agent_id
ORDER BY total_cost DESC;

-- View: Today's cost by agent
CREATE OR REPLACE VIEW today_cost_by_agent AS
SELECT 
    agent_name,
    agent_id,
    SUM(cost_usd) as cost_today,
    SUM(total_tokens) as tokens_today,
    COUNT(*) as requests_today
FROM token_usage
WHERE DATE(timestamp) = CURRENT_DATE
GROUP BY agent_name, agent_id
ORDER BY cost_today DESC;

-- View: This month's cost by agent
CREATE OR REPLACE VIEW month_cost_by_agent AS
SELECT 
    agent_name,
    agent_id,
    SUM(cost_usd) as cost_month,
    SUM(total_tokens) as tokens_month,
    COUNT(*) as requests_month
FROM token_usage
WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY agent_name, agent_id
ORDER BY cost_month DESC;
