-- Pipeline Schema
-- Track real-time task execution, agent status, and workflow monitoring

-- Task execution tracking
CREATE TABLE IF NOT EXISTS task_execution (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    agent_name VARCHAR(100),
    status VARCHAR(50) NOT NULL, -- 'queued', 'in_progress', 'blocked', 'completed', 'failed'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expected_completion TIMESTAMP,
    progress_percent INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(100), -- 'hourly', 'daily', '5:30am', 'monday-11am', etc.
    blocked_reason TEXT,
    error_message TEXT,
    metadata JSONB, -- Additional context, input/output, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent status tracking
CREATE TABLE IF NOT EXISTS agent_status (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'online', 'offline', 'busy', 'idle', 'error'
    current_task_id INTEGER REFERENCES task_execution(id) ON DELETE SET NULL,
    last_activity TIMESTAMP,
    last_heartbeat TIMESTAMP,
    consecutive_errors INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 100, -- 0-100, decreases with errors/downtime
    uptime_percent DECIMAL(5,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES task_execution(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER REFERENCES task_execution(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline metrics (aggregated stats)
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    avg_completion_time_seconds INTEGER,
    bottleneck_task VARCHAR(255),
    bottleneck_count INTEGER DEFAULT 0,
    total_uptime_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_execution_status ON task_execution(status);
CREATE INDEX IF NOT EXISTS idx_task_execution_agent ON task_execution(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_started ON task_execution(started_at);
CREATE INDEX IF NOT EXISTS idx_task_execution_recurring ON task_execution(is_recurring);
CREATE INDEX IF NOT EXISTS idx_agent_status_agent_id ON agent_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status);

-- Views

-- Active tasks (in progress or queued)
CREATE OR REPLACE VIEW active_tasks AS
SELECT 
    te.id,
    te.task_name,
    te.agent_id,
    te.agent_name,
    te.status,
    te.priority,
    te.started_at,
    te.expected_completion,
    te.progress_percent,
    te.time_spent_seconds,
    te.is_recurring,
    te.recurrence_pattern,
    te.blocked_reason,
    a.status as agent_status,
    CASE 
        WHEN te.expected_completion IS NOT NULL AND te.expected_completion < NOW() THEN TRUE
        ELSE FALSE
    END as is_overdue,
    EXTRACT(EPOCH FROM (NOW() - te.started_at))::INTEGER as time_in_progress_seconds
FROM task_execution te
LEFT JOIN agent_status a ON te.agent_id = a.agent_id
WHERE te.status IN ('queued', 'in_progress', 'blocked')
ORDER BY 
    CASE te.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    te.started_at ASC;

-- Agent health summary
CREATE OR REPLACE VIEW agent_health_summary AS
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    a.role,
    ast.status,
    ast.last_activity,
    ast.last_heartbeat,
    ast.consecutive_errors,
    ast.health_score,
    ast.uptime_percent,
    te.task_name as current_task,
    te.progress_percent as current_task_progress,
    CASE 
        WHEN ast.last_heartbeat < NOW() - INTERVAL '10 minutes' THEN 'stale'
        WHEN ast.consecutive_errors > 3 THEN 'unhealthy'
        WHEN ast.health_score < 50 THEN 'degraded'
        ELSE 'healthy'
    END as health_status
FROM agents a
LEFT JOIN agent_status ast ON a.id = ast.agent_id
LEFT JOIN task_execution te ON ast.current_task_id = te.id
WHERE a.status = 'active';

-- Recurring tasks schedule
CREATE OR REPLACE VIEW recurring_tasks_schedule AS
SELECT 
    te.id,
    te.task_name,
    te.agent_name,
    te.recurrence_pattern,
    te.status,
    te.started_at as last_run,
    te.completed_at,
    COUNT(*) OVER (PARTITION BY te.task_name) as total_runs,
    AVG(te.time_spent_seconds) OVER (PARTITION BY te.task_name) as avg_time_seconds
FROM task_execution te
WHERE te.is_recurring = TRUE
ORDER BY te.task_name, te.started_at DESC;

-- Bottleneck analysis
CREATE OR REPLACE VIEW task_bottlenecks AS
SELECT 
    task_name,
    COUNT(*) as stuck_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - started_at))) as avg_stuck_time_seconds,
    MAX(blocked_reason) as common_reason
FROM task_execution
WHERE status = 'blocked'
GROUP BY task_name
HAVING COUNT(*) > 1
ORDER BY stuck_count DESC, avg_stuck_time_seconds DESC;

-- Today's pipeline summary
CREATE OR REPLACE VIEW today_pipeline_summary AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as completed_today,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_today,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE status = 'queued') as queued,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
    AVG(time_spent_seconds) FILTER (WHERE status = 'completed') as avg_completion_time,
    COUNT(DISTINCT agent_id) as active_agents
FROM task_execution
WHERE DATE(created_at) = CURRENT_DATE;
