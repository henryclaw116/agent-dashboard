-- RLT Social Pipeline Database Schema
-- Tracks leads through 6-stage pipeline from scan to approval

-- Main leads table - tracks every post scanned
CREATE TABLE IF NOT EXISTS social_leads (
    id SERIAL PRIMARY KEY,
    
    -- Source data
    platform VARCHAR(50) NOT NULL, -- reddit, youtube, twitter, tiktok, facebook, quora
    username VARCHAR(255) NOT NULL,
    post_url TEXT NOT NULL UNIQUE,
    post_text TEXT NOT NULL,
    post_excerpt TEXT, -- First 200 chars
    posted_at TIMESTAMP,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Stage 1 (Scanner)
    stage1_status VARCHAR(20), -- KEEP, REJECT
    stage1_processed_at TIMESTAMP,
    
    -- Stage 2 (Scoring)
    stage2_score INTEGER, -- 0-100
    stage2_tier VARCHAR(20), -- HOT, WARM, MODERATE, LOW
    stage2_pain_category VARCHAR(50), -- BEGINNER, CONSISTENCY, LOSING_MONEY, INCOME_STRATEGY, EMOTIONAL
    stage2_pain_summary TEXT,
    stage2_competitor_mentioned BOOLEAN DEFAULT FALSE,
    stage2_competitor_name VARCHAR(100),
    stage2_processed_at TIMESTAMP,
    
    -- Stage 3 (Routing)
    stage3_final_route VARCHAR(100), -- /start-trading, /trading-consistency, etc.
    stage3_landing_page_title VARCHAR(255),
    stage3_root_pain TEXT,
    stage3_routing_rationale TEXT,
    stage3_lead_tier VARCHAR(20), -- HOT, WARM (refined)
    stage3_competitor_migration BOOLEAN DEFAULT FALSE,
    stage3_category_override VARCHAR(50),
    stage3_override_reason TEXT,
    stage3_flag_for_human BOOLEAN DEFAULT FALSE,
    stage3_flag_reason TEXT,
    stage3_confidence VARCHAR(20), -- HIGH, MEDIUM, LOW
    stage3_processed_at TIMESTAMP,
    
    -- Stage 4 (Reply Generation)
    stage4_reply_text TEXT,
    stage4_tone_applied VARCHAR(50), -- frustrated, curious, angry, competitor
    stage4_confidence VARCHAR(20), -- HIGH, MEDIUM, LOW
    stage4_flag_for_review BOOLEAN DEFAULT FALSE,
    stage4_flag_reason TEXT,
    stage4_processed_at TIMESTAMP,
    
    -- Stage 5 (Deduplication)
    stage5_duplicate_user BOOLEAN DEFAULT FALSE,
    stage5_duplicate_content BOOLEAN DEFAULT FALSE,
    stage5_reply_variation_needed BOOLEAN DEFAULT FALSE,
    stage5_final_status VARCHAR(50), -- APPROVED, BLOCKED, NEEDS_VARIATION, HUMAN_REVIEW
    stage5_block_reason TEXT,
    stage5_processed_at TIMESTAMP,
    
    -- Stage 6 (Bitly + UTM)
    stage6_bitly_short_url VARCHAR(255), -- rlt.to/slug
    stage6_bitly_title VARCHAR(255),
    stage6_full_utm_url TEXT,
    stage6_final_reply_text TEXT, -- Reply with Bitly link injected
    stage6_utm_source VARCHAR(50),
    stage6_utm_medium VARCHAR(50), -- always: ai-social-reply
    stage6_utm_campaign VARCHAR(100),
    stage6_utm_content VARCHAR(100), -- hot-94, warm-71
    stage6_utm_term VARCHAR(50), -- group-a through group-g
    stage6_bitly_api_success BOOLEAN DEFAULT FALSE,
    stage6_ready_for_dashboard BOOLEAN DEFAULT FALSE,
    stage6_processed_at TIMESTAMP,
    
    -- Human approval
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES agents(id),
    sent_at TIMESTAMP,
    sent_status VARCHAR(50), -- SENT, FAILED, PENDING
    sent_error TEXT,
    
    -- Engagement tracking
    bitly_clicks INTEGER DEFAULT 0,
    bitly_last_click_at TIMESTAMP,
    reply_engagement VARCHAR(50), -- CLICKED, ENGAGED, NO_RESPONSE, NEGATIVE
    
    -- Performance
    created_trial_signup BOOLEAN DEFAULT FALSE,
    created_paid_member BOOLEAN DEFAULT FALSE,
    revenue_attributed DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_social_leads_platform ON social_leads(platform);
CREATE INDEX idx_social_leads_username ON social_leads(username);
CREATE INDEX idx_social_leads_stage5_status ON social_leads(stage5_final_status);
CREATE INDEX idx_social_leads_stage6_ready ON social_leads(stage6_ready_for_dashboard);
CREATE INDEX idx_social_leads_approved ON social_leads(approved_at) WHERE approved_at IS NOT NULL;
CREATE INDEX idx_social_leads_sent ON social_leads(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_social_leads_utm_campaign ON social_leads(stage6_utm_campaign);
CREATE INDEX idx_social_leads_scanned_at ON social_leads(scanned_at DESC);

-- Platform crawl schedule
CREATE TABLE IF NOT EXISTS crawl_schedule (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    location TEXT NOT NULL, -- subreddit, hashtag, channel, etc.
    tier INTEGER NOT NULL, -- 1, 2, 3, 4
    frequency_minutes INTEGER NOT NULL, -- 60, 120, 240, 1440
    last_crawl_at TIMESTAMP,
    next_crawl_at TIMESTAMP,
    total_posts_scanned INTEGER DEFAULT 0,
    total_leads_found INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, location)
);

-- Insert default crawl schedule from script
INSERT INTO crawl_schedule (platform, location, tier, frequency_minutes) VALUES
-- TIER 1 - Every 1 hour
('reddit', 'r/Daytrading', 1, 60),
('reddit', 'r/options', 1, 60),
('reddit', 'r/stocks', 1, 60),
('reddit', 'r/thetagang', 1, 60),
('reddit', 'r/StockMarket', 1, 60),
('reddit', 'r/optionstrading', 1, 60),
('reddit', 'r/investing', 1, 60),
('reddit', 'r/RobinHood', 1, 60),
('reddit', 'r/Daytraders', 1, 60),
('reddit', 'r/Webull', 1, 60),
('reddit', 'r/Forex', 1, 60),
('reddit', 'r/personalfinance', 1, 60),
('reddit', 'r/financialindependence', 1, 60),
('youtube', 'Real Life Trading', 1, 60),
('youtube', 'Warrior Trading', 1, 60),
('youtube', 'Humbled Trader', 1, 60),
('youtube', 'Timothy Sykes', 1, 60),
('youtube', 'ClayTrader', 1, 60),
('youtube', 'Investors Underground', 1, 60),
('youtube', 'Benzinga', 1, 60),
('youtube', 'TastyTrade', 1, 60),
('youtube', 'SMB Capital', 1, 60),

-- TIER 2 - Every 2 hours
('twitter', '#trading', 2, 120),
('twitter', '#creditspread', 2, 120),
('twitter', '#daytrading', 2, 120),
('twitter', '#swingtrading', 2, 120),
('twitter', '#optionstrading', 2, 120),
('twitter', '#passiveincome', 2, 120),
('twitter', '#stockmarket', 2, 120),
('twitter', '#financialfreedom', 2, 120),
('twitter', '#learntotrader', 2, 120),
('twitter', '#sidehustle', 2, 120),
('twitter', '#tradinglife', 2, 120),
('tiktok', '#tradingtok', 2, 120),
('tiktok', '#learntotrade', 2, 120),
('tiktok', '#stocktok', 2, 120),
('tiktok', '#tradingforbeginners', 2, 120),
('tiktok', '#optionstrading', 2, 120),
('tiktok', '#daytrader', 2, 120),

-- TIER 3 - Every 4 hours
('facebook', 'Stock Market Investing', 3, 240),
('facebook', 'Day Traders', 3, 240),
('facebook', 'Options Trading', 3, 240),
('facebook', 'Learn To Trade Stocks', 3, 240),
('facebook', 'Trading For Beginners', 3, 240),
('facebook', 'Credit Spreads Options Trading', 3, 240),
('quora', 'trading', 3, 240),
('quora', 'stock-market', 3, 240),
('quora', 'options', 3, 240),
('quora', 'day-trading', 3, 240),
('quora', 'beginners', 3, 240),
('stocktwits', 'trading', 3, 240),

-- TIER 4 - Once daily
('google-alerts', 'how to start trading', 4, 1440),
('google-alerts', 'best trading course', 4, 1440),
('google-alerts', 'real life trading review', 4, 1440),
('google-alerts', 'warrior trading alternative', 4, 1440),
('forums', 'Trade2Win', 4, 1440),
('forums', 'Elite Trader', 4, 1440),
('forums', 'Stockaholics', 4, 1440)
ON CONFLICT (platform, location) DO NOTHING;

-- Keyword groups table
CREATE TABLE IF NOT EXISTS keyword_groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(10) NOT NULL, -- group-a, group-b, etc.
    pain_category VARCHAR(50) NOT NULL,
    landing_route VARCHAR(100) NOT NULL,
    keywords TEXT[] NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert keyword groups from script
INSERT INTO keyword_groups (group_name, pain_category, landing_route, keywords) VALUES
('group-a', 'BEGINNER', '/start-trading', ARRAY[
    'don''t know where to start trading',
    'how do I start trading',
    'want to learn how to trade',
    'best way to learn trading',
    'trading for beginners',
    'just opened a brokerage account',
    'new to stocks',
    'overwhelmed by trading',
    'where do I even begin with stocks',
    'scared to start trading',
    'how do people actually make money trading',
    'don''t understand charts'
]),
('group-b', 'CONSISTENCY', '/trading-consistency', ARRAY[
    'can''t get consistent',
    'profitable one week losing the next',
    'give back my gains',
    'inconsistent results trading',
    'trading feels random',
    'no consistency in my trading',
    'I know what to do but can''t execute',
    'good month then bad month',
    'two steps forward one step back trading',
    'can''t repeat my wins'
]),
('group-c', 'LOSING_MONEY', '/stop-losing-money', ARRAY[
    'keep losing money trading',
    'blew my account',
    'lost my trading account',
    'can''t stop losing',
    'losing more than I win',
    'wiped out my account',
    'risk management trading',
    'position sizing help',
    'one bad trade wipes out all my wins',
    'margin call',
    'how do I stop losing so much',
    'account down 50 percent'
]),
('group-d', 'INCOME_STRATEGY', '/200-weekly-challenge', ARRAY[
    'looking for a trading strategy',
    'weekly income from trading',
    'credit spreads for income',
    'options for consistent income',
    'small account trading strategy',
    'trading with 5000',
    'is there a strategy that actually works',
    'live trading with a mentor',
    'trading coaching',
    'best trading community',
    'weekly options income strategy',
    'theta strategies for income',
    'selling options for income',
    'looking for trading mentor'
]),
('group-e', 'EMOTIONAL', '/emotional-trading', ARRAY[
    'revenge trading',
    'can''t stop emotional trading',
    'fear of losing in trading',
    'panic selling',
    'FOMO trading',
    'I know the rules but break them anyway',
    'can''t pull the trigger on trades',
    'emotions ruining my trading',
    'trading psychology help',
    'held a loser too long',
    'trading anxiety',
    'let a winner turn into a loser',
    'freeze when I should trade',
    'trading is destroying my mental health'
]),
('group-f', 'COMPETITOR', 'match-pain', ARRAY[
    'leaving warrior trading',
    'warrior trading not worth it',
    'timothy sykes overpriced',
    'investors underground too expensive',
    'clay trader review',
    'looking for warrior trading alternative',
    'chat rooms don''t help',
    'trading room waste of money',
    'paid for a course and still losing',
    'wasted money on trading education'
]),
('group-g', 'HOT_INTENT', 'match-pain', ARRAY[
    'best trading subscription',
    'looking for trading community to join',
    'recommend a trading educator',
    'which trading course is actually good',
    'real life trading review',
    'jerremy newsome',
    'RLT trading review',
    'worth joining a trading community',
    'sign up for trading course'
])
ON CONFLICT DO NOTHING;

-- Daily stats rollup
CREATE TABLE IF NOT EXISTS pipeline_stats_daily (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,
    
    -- Volume
    total_posts_scanned INTEGER DEFAULT 0,
    stage1_rejected INTEGER DEFAULT 0,
    stage1_kept INTEGER DEFAULT 0,
    stage2_scored INTEGER DEFAULT 0,
    stage2_passed_to_stage3 INTEGER DEFAULT 0,
    stage3_processed INTEGER DEFAULT 0,
    stage4_replies_generated INTEGER DEFAULT 0,
    stage5_approved INTEGER DEFAULT 0,
    stage5_blocked INTEGER DEFAULT 0,
    stage6_bitly_generated INTEGER DEFAULT 0,
    
    -- Approvals
    human_approved INTEGER DEFAULT 0,
    human_discarded INTEGER DEFAULT 0,
    replies_sent INTEGER DEFAULT 0,
    
    -- Engagement
    total_bitly_clicks INTEGER DEFAULT 0,
    trial_signups INTEGER DEFAULT 0,
    paid_conversions INTEGER DEFAULT 0,
    revenue_attributed DECIMAL(10,2) DEFAULT 0,
    
    -- Costs
    claude_api_calls INTEGER DEFAULT 0,
    estimated_claude_cost DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update stats
CREATE OR REPLACE FUNCTION update_pipeline_stats_daily()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pipeline_stats_daily (stat_date)
    VALUES (CURRENT_DATE)
    ON CONFLICT (stat_date) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update daily stats
CREATE TRIGGER trigger_update_pipeline_stats
AFTER INSERT OR UPDATE ON social_leads
FOR EACH ROW
EXECUTE FUNCTION update_pipeline_stats_daily();

-- View for dashboard - ready for approval
CREATE OR REPLACE VIEW leads_ready_for_approval AS
SELECT 
    id,
    platform,
    username,
    post_url,
    post_excerpt,
    stage2_score,
    stage2_tier,
    stage2_pain_category,
    stage2_competitor_mentioned,
    stage2_competitor_name,
    stage3_final_route,
    stage3_landing_page_title,
    stage3_root_pain,
    stage3_routing_rationale,
    stage3_confidence,
    stage4_reply_text,
    stage4_tone_applied,
    stage4_confidence,
    stage6_bitly_short_url,
    stage6_full_utm_url,
    stage6_utm_campaign,
    stage6_final_reply_text,
    scanned_at,
    stage6_processed_at
FROM social_leads
WHERE stage6_ready_for_dashboard = TRUE
  AND approved_at IS NULL
  AND stage5_final_status = 'APPROVED'
ORDER BY stage2_score DESC, scanned_at DESC;

-- View for performance tracking
CREATE OR REPLACE VIEW pipeline_performance AS
SELECT 
    stage6_utm_campaign AS campaign,
    platform,
    COUNT(*) AS total_leads,
    AVG(stage2_score) AS avg_score,
    SUM(bitly_clicks) AS total_clicks,
    SUM(CASE WHEN created_trial_signup THEN 1 ELSE 0 END) AS trial_signups,
    SUM(CASE WHEN created_paid_member THEN 1 ELSE 0 END) AS paid_members,
    SUM(revenue_attributed) AS total_revenue
FROM social_leads
WHERE approved_at IS NOT NULL
GROUP BY stage6_utm_campaign, platform
ORDER BY total_revenue DESC, total_clicks DESC;
