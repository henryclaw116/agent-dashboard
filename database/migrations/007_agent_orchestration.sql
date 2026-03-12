-- Agent Orchestration System Schema
-- Comprehensive multi-agent command and control

-- ============================================
-- AGENT REGISTRY
-- ============================================
-- Enhanced agents table with orchestration fields
ALTER TABLE agents ADD COLUMN IF NOT EXISTS parent_agent_id INTEGER REFERENCES agents(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS auto_restart BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS heartbeat_interval_seconds INTEGER DEFAULT 30;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS cpu_usage DECIMAL(5,2);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS memory_usage_mb INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_task_id INTEGER;

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_heartbeat ON agents(last_heartbeat);

-- ============================================
-- TASK QUEUE
-- ============================================
CREATE TABLE IF NOT EXISTS task_queue (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'delegated'
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    status VARCHAR(50) DEFAULT 'pending', -- pending, claimed, in_progress, completed, failed, cancelled
    
    -- Assignment
    assigned_to_agent_id INTEGER REFERENCES agents(id),
    delegated_by_agent_id INTEGER REFERENCES agents(id),
    claimed_at TIMESTAMP,
    
    -- Task data
    task_payload JSONB, -- Full task description and parameters
    result JSONB, -- Task result/output
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    deadline TIMESTAMP,
    
    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Dependencies
    depends_on_task_id INTEGER REFERENCES task_queue(id),
    next_task_id INTEGER REFERENCES task_queue(id), -- For task chains
    
    -- Metadata
    tags TEXT[],
    metadata JSONB
);

CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_assigned_to ON task_queue(assigned_to_agent_id);
CREATE INDEX idx_task_queue_priority ON task_queue(priority, created_at);
CREATE INDEX idx_task_queue_created ON task_queue(created_at DESC);

-- ============================================
-- AGENT SCHEDULES
-- ============================================
CREATE TABLE IF NOT EXISTS agent_schedules (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    schedule_name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL, -- 'cron', 'interval', 'daily', 'hourly', 'event'
    
    -- Schedule definition
    cron_expression VARCHAR(100), -- e.g., '*/30 * * * *' for every 30 min
    interval_seconds INTEGER, -- For simple interval schedules
    time_of_day TIME, -- For daily schedules
    
    -- Task definition
    task_payload JSONB NOT NULL, -- What task to run
    
    -- Status
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    run_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    metadata JSONB
);

CREATE INDEX idx_agent_schedules_agent ON agent_schedules(agent_id);
CREATE INDEX idx_agent_schedules_next_run ON agent_schedules(next_run) WHERE enabled = true;

-- ============================================
-- AGENT HEARTBEATS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    
    -- Status snapshot
    status VARCHAR(50),
    current_task VARCHAR(255),
    
    -- Resource usage
    cpu_usage DECIMAL(5,2),
    memory_usage_mb INTEGER,
    
    -- Health indicators
    healthy BOOLEAN DEFAULT true,
    message TEXT,
    
    -- Metadata
    metadata JSONB
);

-- Partition by time - only keep recent heartbeats
CREATE INDEX idx_heartbeats_agent_time ON agent_heartbeats(agent_id, timestamp DESC);
CREATE INDEX idx_heartbeats_timestamp ON agent_heartbeats(timestamp DESC);

-- Auto-cleanup old heartbeats (keep last 1000 per agent)
CREATE OR REPLACE FUNCTION cleanup_old_heartbeats() RETURNS void AS $$
BEGIN
    DELETE FROM agent_heartbeats
    WHERE id IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY timestamp DESC) as rn
            FROM agent_heartbeats
        ) sub
        WHERE rn > 1000
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AGENT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES task_queue(id),
    
    -- Log entry
    log_level VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARN, ERROR, CRITICAL
    message TEXT NOT NULL,
    
    -- Context
    action VARCHAR(100),
    duration_ms INTEGER,
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT NOW(),
    
    -- Structured data
    metadata JSONB
);

CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id, timestamp DESC);
CREATE INDEX idx_agent_logs_task ON agent_logs(task_id);
CREATE INDEX idx_agent_logs_level ON agent_logs(log_level, timestamp DESC);
CREATE INDEX idx_agent_logs_timestamp ON agent_logs(timestamp DESC);

-- ============================================
-- AGENT ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_alerts (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'heartbeat_missed', 'task_failed', 'crash', 'resource_high'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'new', -- new, acknowledged, resolved, ignored
    
    -- Notification
    notified BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP,
    notification_channel VARCHAR(50), -- 'discord', 'slack', 'email'
    
    -- Resolution
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_alerts_agent ON agent_alerts(agent_id, created_at DESC);
CREATE INDEX idx_alerts_status ON agent_alerts(status, severity);

-- ============================================
-- AGENT COLLABORATIONS (Task Passing)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_collaborations (
    id SERIAL PRIMARY KEY,
    from_agent_id INTEGER NOT NULL REFERENCES agents(id),
    to_agent_id INTEGER NOT NULL REFERENCES agents(id),
    task_id INTEGER REFERENCES task_queue(id),
    
    -- Collaboration details
    collaboration_type VARCHAR(50) NOT NULL, -- 'delegation', 'handoff', 'request_help', 'result_share'
    message TEXT,
    
    -- Data transfer
    payload JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, completed
    
    -- Timing
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_collaborations_from ON agent_collaborations(from_agent_id, created_at DESC);
CREATE INDEX idx_collaborations_to ON agent_collaborations(to_agent_id, status);
CREATE INDEX idx_collaborations_task ON agent_collaborations(task_id);

-- ============================================
-- VIEWS FOR DASHBOARD
-- ============================================

-- Agent overview with latest heartbeat and current task
CREATE OR REPLACE VIEW agent_overview AS
SELECT 
    a.*,
    ah.timestamp as last_heartbeat_at,
    ah.healthy as heartbeat_healthy,
    tq.task_name as current_task_name,
    tq.status as current_task_status,
    tq.started_at as current_task_started,
    (SELECT COUNT(*) FROM task_queue WHERE assigned_to_agent_id = a.id AND status = 'pending') as pending_tasks_count,
    (SELECT COUNT(*) FROM agent_alerts WHERE agent_id = a.id AND status = 'new') as unread_alerts_count
FROM agents a
LEFT JOIN LATERAL (
    SELECT * FROM agent_heartbeats 
    WHERE agent_id = a.id 
    ORDER BY timestamp DESC 
    LIMIT 1
) ah ON true
LEFT JOIN task_queue tq ON tq.id = a.current_task_id;

-- Task queue overview
CREATE OR REPLACE VIEW task_queue_overview AS
SELECT 
    tq.*,
    a.name as assigned_agent_name,
    da.name as delegated_by_agent_name,
    dep.task_name as depends_on_task_name
FROM task_queue tq
LEFT JOIN agents a ON a.id = tq.assigned_to_agent_id
LEFT JOIN agents da ON da.id = tq.delegated_by_agent_id
LEFT JOIN task_queue dep ON dep.id = tq.depends_on_task_id;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to claim next available task for an agent
CREATE OR REPLACE FUNCTION claim_next_task(p_agent_id INTEGER)
RETURNS TABLE(task_id INTEGER, task_name VARCHAR, task_payload JSONB) AS $$
DECLARE
    v_task_id INTEGER;
BEGIN
    -- Find highest priority unclaimed task with no dependencies
    SELECT id INTO v_task_id
    FROM task_queue
    WHERE status = 'pending'
      AND (assigned_to_agent_id IS NULL OR assigned_to_agent_id = p_agent_id)
      AND (depends_on_task_id IS NULL OR 
           (SELECT status FROM task_queue WHERE id = depends_on_task_id) = 'completed')
    ORDER BY priority ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF v_task_id IS NOT NULL THEN
        -- Claim the task
        UPDATE task_queue
        SET status = 'claimed',
            assigned_to_agent_id = p_agent_id,
            claimed_at = NOW()
        WHERE id = v_task_id;
        
        -- Update agent's current task
        UPDATE agents
        SET current_task_id = v_task_id
        WHERE id = p_agent_id;
        
        -- Return task details
        RETURN QUERY
        SELECT id, task_queue.task_name, task_queue.task_payload
        FROM task_queue
        WHERE id = v_task_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check for missed heartbeats and create alerts
CREATE OR REPLACE FUNCTION check_missed_heartbeats()
RETURNS void AS $$
BEGIN
    INSERT INTO agent_alerts (agent_id, alert_type, severity, title, message, metadata)
    SELECT 
        a.id,
        'heartbeat_missed',
        'high',
        'Agent Heartbeat Missed: ' || a.name,
        'Agent has not sent heartbeat for over ' || a.heartbeat_interval_seconds * 2 || ' seconds',
        jsonb_build_object(
            'last_heartbeat', a.last_heartbeat,
            'expected_interval', a.heartbeat_interval_seconds
        )
    FROM agents a
    WHERE a.status NOT IN ('offline', 'disabled')
      AND (a.last_heartbeat IS NULL OR 
           a.last_heartbeat < NOW() - (a.heartbeat_interval_seconds * 2 || ' seconds')::INTERVAL)
      AND NOT EXISTS (
          SELECT 1 FROM agent_alerts
          WHERE agent_id = a.id
            AND alert_type = 'heartbeat_missed'
            AND status = 'new'
            AND created_at > NOW() - INTERVAL '5 minutes'
      );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE task_queue IS 'Centralized task queue for agent orchestration';
COMMENT ON TABLE agent_schedules IS 'Automated scheduling for agent tasks';
COMMENT ON TABLE agent_heartbeats IS 'Real-time health monitoring for agents';
COMMENT ON TABLE agent_logs IS 'Comprehensive logging for all agent activities';
COMMENT ON TABLE agent_alerts IS 'Alert system for agent failures and issues';
COMMENT ON TABLE agent_collaborations IS 'Track inter-agent task passing and collaboration';
