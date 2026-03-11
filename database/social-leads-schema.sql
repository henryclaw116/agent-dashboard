-- Social Media Leads Table
-- Stores leads discovered by tower scanner and managed by marketing agent

CREATE TABLE IF NOT EXISTS social_leads (
    id SERIAL PRIMARY KEY,
    
    -- Source Information
    platform VARCHAR(50) NOT NULL, -- 'reddit', 'twitter', 'youtube', 'facebook'
    platform_id VARCHAR(255) UNIQUE NOT NULL, -- Unique post/comment ID from platform
    post_url TEXT NOT NULL, -- Direct link to post/comment
    author_username VARCHAR(255),
    author_url TEXT,
    post_content TEXT NOT NULL,
    post_timestamp TIMESTAMP,
    discovered_at TIMESTAMP DEFAULT NOW(),
    
    -- AI Scoring (from Stage 2: llama3.1:8b-instruct)
    lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
    category VARCHAR(50), -- 'trading_question', 'frustrated', 'educational', 'spam', 'other'
    intent TEXT, -- Brief description of user's intent
    red_flags TEXT[], -- Array of concerns (e.g., 'get_rich_quick', 'competitor')
    key_phrases TEXT[], -- Notable quotes from post
    experience_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
    
    -- Response Management
    draft_response TEXT, -- AI-generated response (from Stage 3: mistral:7b-instruct)
    approved_response TEXT, -- Tony's edited/approved version
    response_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'sent', 'failed', 'archived'
    response_sent_at TIMESTAMP,
    response_error TEXT, -- Error message if posting failed
    
    -- Engagement Tracking
    engagement_score INTEGER DEFAULT 0, -- Upvotes, likes, replies
    has_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_count INTEGER DEFAULT 0,
    converted_to_trial BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP,
    
    -- Workflow
    assigned_to VARCHAR(100), -- Agent ID or username
    reviewed_by VARCHAR(100), -- Tony or agent who approved
    reviewed_at TIMESTAMP,
    archived_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_social_leads_score ON social_leads(lead_score DESC);
CREATE INDEX idx_social_leads_status ON social_leads(response_status);
CREATE INDEX idx_social_leads_platform ON social_leads(platform);
CREATE INDEX idx_social_leads_discovered ON social_leads(discovered_at DESC);
CREATE INDEX idx_social_leads_pending ON social_leads(response_status, lead_score DESC) 
    WHERE response_status = 'pending';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_leads_updated_at
    BEFORE UPDATE ON social_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_social_leads_updated_at();

-- Sample data for testing
INSERT INTO social_leads (
    platform, platform_id, post_url, author_username, post_content,
    lead_score, category, intent, draft_response, response_status
) VALUES (
    'reddit',
    'abc123xyz',
    'https://reddit.com/r/options/comments/abc123',
    'confused_trader_22',
    'Been trading credit spreads for 6 months but keep getting assigned early. Where did I go wrong?',
    92,
    'trading_question',
    'Asking about early assignment on credit spreads - common beginner issue',
    'Hey! Early assignment is frustrating. Tony covers this exact scenario in his "Credit Spread Assignment" video. The key is managing the short leg when it goes ITM early. Check it out: [YT link]',
    'pending'
), (
    'twitter',
    'tweet456',
    'https://twitter.com/user/status/456',
    'trading_newbie',
    'Lost $5K on WSB plays. Ready to learn proper options strategies. Where should I start?',
    94,
    'frustrated',
    'Burnt by risky trading, wants structured education',
    'Sorry to hear that. I was in a similar spot last year. Real Life Trading on YouTube has solid credit spread education - not the WSB gambling approach. Start here: [YT link]. The Monday $200 Strategy Challenge is where it clicked for me.',
    'pending'
);

COMMENT ON TABLE social_leads IS 'Leads discovered by tower scanner from social media platforms';
COMMENT ON COLUMN social_leads.lead_score IS 'AI-generated score 0-100 based on ideal customer fit';
COMMENT ON COLUMN social_leads.response_status IS 'Workflow status: pending → approved → sent';
COMMENT ON COLUMN social_leads.draft_response IS 'AI-generated response from mistral:7b-instruct';
