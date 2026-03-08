-- Agent Dashboard Database Schema
-- Extends credit-spread-app schema

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'complete', 'cancelled'
    percent_complete INTEGER DEFAULT 0,
    start_date DATE,
    target_date DATE,
    completed_date DATE,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project phases
CREATE TABLE project_phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phase_number INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'complete'
    percent_complete INTEGER DEFAULT 0,
    start_date DATE,
    target_date DATE,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER REFERENCES project_phases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'blocked'
    priority INTEGER DEFAULT 2,
    assigned_to VARCHAR(100), -- Agent name/id
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blockers (things waiting on Tony or external deps)
CREATE TABLE blockers (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    blocker_type VARCHAR(50), -- 'waiting_on_tony', 'external_api', 'decision_needed', 'dependency'
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Activity log (what changed when)
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    agent_name VARCHAR(100),
    activity_type VARCHAR(50), -- 'task_created', 'task_completed', 'file_changed', 'blocker_added', 'comment'
    description TEXT,
    metadata JSONB, -- Store file paths, changes, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent sessions (track active agent work)
CREATE TABLE agent_sessions (
    id SERIAL PRIMARY KEY,
    session_key VARCHAR(255) UNIQUE,
    agent_name VARCHAR(100),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'idle', 'complete'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Daily recaps (structured summaries)
CREATE TABLE daily_recaps (
    id SERIAL PRIMARY KEY,
    recap_date DATE NOT NULL UNIQUE,
    projects_summary JSONB, -- {project_id: {completed: [], working_on: [], next_up: []}}
    blockers_summary JSONB,
    tasks_completed INTEGER DEFAULT 0,
    tasks_created INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications/reminders for Tony
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50), -- 'blocker', 'task_due', 'project_milestone', 'daily_recap'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority INTEGER DEFAULT 2,
    read BOOLEAN DEFAULT FALSE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX idx_blockers_status ON blockers(status);
CREATE INDEX idx_activity_project ON activity_log(project_id, created_at);
CREATE INDEX idx_notifications_read ON notifications(read, created_at);
CREATE INDEX idx_daily_recaps_date ON daily_recaps(recap_date DESC);

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_phases_updated_at BEFORE UPDATE ON project_phases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate project percent complete from phases
CREATE OR REPLACE FUNCTION update_project_percent_complete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects
    SET percent_complete = (
        SELECT COALESCE(AVG(percent_complete), 0)
        FROM project_phases
        WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_percent_after_phase_update
AFTER INSERT OR UPDATE ON project_phases
FOR EACH ROW EXECUTE FUNCTION update_project_percent_complete();
