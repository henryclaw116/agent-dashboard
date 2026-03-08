-- Viral Content Research & Scheduling Extension
-- Add to social media schema

-- Viral content ideas researched by agent
CREATE TABLE viral_ideas (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50), -- 'tiktok', 'instagram', 'youtube', 'twitter'
    source_url VARCHAR(500), -- Original viral content URL
    title VARCHAR(255) NOT NULL,
    description TEXT,
    why_viral TEXT, -- Agent's analysis of why it's trending
    engagement_metrics JSONB, -- {views: X, likes: Y, comments: Z, shares: W}
    
    -- Adaptation ideas
    rlt_angle TEXT, -- How to adapt for Real Life Trading
    suggested_format VARCHAR(100), -- 'short', 'reel', 'long-form', 'carousel', etc.
    estimated_effort VARCHAR(50), -- 'quick', 'medium', 'complex'
    
    -- Status
    status VARCHAR(50) DEFAULT 'researched', -- 'researched', 'approved', 'rejected', 'in_production', 'posted'
    priority INTEGER DEFAULT 2, -- 1=high, 2=medium, 3=low
    
    -- Agent tracking
    researched_by VARCHAR(100),
    researched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Review
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    -- Production
    content_id INTEGER REFERENCES social_content(id) ON DELETE SET NULL,
    
    -- Metadata
    tags TEXT[],
    trending_topic VARCHAR(255)
);

-- Posting schedule
CREATE TABLE posting_schedule (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES social_content(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    
    -- Posting details
    caption TEXT,
    hashtags TEXT[],
    mentions TEXT[],
    location VARCHAR(255),
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'approved', 'posted', 'failed', 'cancelled'
    posted_at TIMESTAMP,
    post_url VARCHAR(500),
    post_id VARCHAR(255), -- Platform-specific post ID
    
    -- Analytics (filled after posting)
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    engagement_rate DECIMAL(5,2),
    last_analytics_update TIMESTAMP,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Agent tracking
    scheduled_by VARCHAR(100),
    posted_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Approval
    approved_by VARCHAR(100),
    approved_at TIMESTAMP
);

-- Daily posting plan (agent's proposed schedule for the day)
CREATE TABLE daily_posting_plan (
    id SERIAL PRIMARY KEY,
    plan_date DATE NOT NULL UNIQUE,
    
    -- Plan details
    total_posts INTEGER DEFAULT 0,
    platforms JSONB, -- {tiktok: 3, instagram: 2, youtube: 1, twitter: 5}
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'in_progress', 'complete'
    
    -- Agent
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Approval
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    
    -- Notes
    notes TEXT
);

-- Link daily plan to scheduled posts
CREATE TABLE plan_posts (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES daily_posting_plan(id) ON DELETE CASCADE,
    scheduled_post_id INTEGER REFERENCES posting_schedule(id) ON DELETE CASCADE,
    post_order INTEGER, -- Order within the day (1st post, 2nd post, etc.)
    
    UNIQUE(plan_id, scheduled_post_id)
);

-- Viral trends tracking (what's trending now)
CREATE TABLE trending_topics (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50),
    topic VARCHAR(255) NOT NULL,
    hashtag VARCHAR(255),
    
    -- Trend data
    trend_score DECIMAL(10,2), -- Platform-specific score
    estimated_views BIGINT,
    trend_velocity VARCHAR(50), -- 'emerging', 'peaking', 'declining'
    
    -- Relevance
    relevance_to_rlt DECIMAL(5,2), -- 0-100 score
    adaptation_ideas TEXT,
    
    -- Tracking
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'declined', 'capitalized'
    
    UNIQUE(platform, topic, detected_at)
);

-- Content performance analytics
CREATE TABLE content_analytics (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES social_content(id) ON DELETE CASCADE,
    platform VARCHAR(50),
    post_url VARCHAR(500),
    
    -- Metrics
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    
    -- Audience
    reach INTEGER,
    impressions INTEGER,
    unique_viewers INTEGER,
    
    -- Performance
    performance_score DECIMAL(5,2), -- Calculated score 0-100
    compared_to_average VARCHAR(50), -- 'above', 'average', 'below'
    
    -- Time tracking
    posted_at TIMESTAMP,
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Learning
    what_worked TEXT, -- Agent's analysis
    what_to_improve TEXT
);

-- Indexes
CREATE INDEX idx_viral_ideas_status ON viral_ideas(status);
CREATE INDEX idx_viral_ideas_priority ON viral_ideas(priority);
CREATE INDEX idx_posting_schedule_scheduled ON posting_schedule(scheduled_for);
CREATE INDEX idx_posting_schedule_status ON posting_schedule(status);
CREATE INDEX idx_daily_plan_date ON daily_posting_plan(plan_date);
CREATE INDEX idx_trending_topics_platform ON trending_topics(platform, status);
CREATE INDEX idx_content_analytics_content ON content_analytics(content_id);

-- Function to auto-approve scheduled posts when content is approved
CREATE OR REPLACE FUNCTION auto_approve_scheduled_posts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending_review' THEN
        UPDATE posting_schedule
        SET status = 'approved',
            approved_by = 'tony',
            approved_at = CURRENT_TIMESTAMP
        WHERE content_id = NEW.id
        AND status = 'scheduled';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_approval_updates_schedule
AFTER UPDATE ON social_content
FOR EACH ROW EXECUTE FUNCTION auto_approve_scheduled_posts();

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
    p_likes INTEGER,
    p_comments INTEGER,
    p_shares INTEGER,
    p_views INTEGER
)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF p_views = 0 THEN
        RETURN 0;
    END IF;
    RETURN ((p_likes + p_comments + (p_shares * 2))::DECIMAL / p_views * 100);
END;
$$ LANGUAGE plpgsql;
