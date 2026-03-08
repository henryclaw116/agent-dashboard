-- Social Media Manager Schema Extension
-- Add to existing agent-dashboard database

-- Video editing workflow
CREATE TABLE video_uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    duration_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'downloaded'
    uploaded_by VARCHAR(100) DEFAULT 'tony',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Editing details
    editing_instructions TEXT,
    assigned_to VARCHAR(100), -- Which agent is editing
    started_editing_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Output
    edited_file_path VARCHAR(500),
    edited_file_size BIGINT,
    downloaded_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    tags TEXT[]
);

-- Social media content (images, posts, graphics)
CREATE TABLE social_content (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL, -- 'instagram_post', 'youtube_thumbnail', 'twitter_graphic', 'story', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Files
    file_path VARCHAR(500),
    preview_path VARCHAR(500), -- Thumbnail/preview
    file_size BIGINT,
    
    -- Design details
    platform VARCHAR(50), -- 'instagram', 'youtube', 'twitter', 'facebook', 'linkedin', 'tiktok'
    dimensions VARCHAR(50), -- '1080x1080', '1920x1080', etc.
    created_with VARCHAR(50) DEFAULT 'canva', -- 'canva', 'photoshop', 'figma', etc.
    
    -- Workflow
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'rejected', 'posted'
    created_by VARCHAR(100), -- Which agent created it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Review
    submitted_for_review_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    
    -- Publishing
    scheduled_post_date TIMESTAMP,
    posted_at TIMESTAMP,
    post_url VARCHAR(500),
    
    -- Canva link
    canva_design_url VARCHAR(500),
    
    -- Metadata
    tags TEXT[],
    notes TEXT
);

-- Content approval workflow
CREATE TABLE content_reviews (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES social_content(id) ON DELETE CASCADE,
    reviewer VARCHAR(100) DEFAULT 'tony',
    status VARCHAR(50), -- 'approved', 'rejected', 'needs_changes'
    feedback TEXT,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled posts
CREATE TABLE scheduled_posts (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES social_content(id) ON DELETE CASCADE,
    platform VARCHAR(50),
    scheduled_for TIMESTAMP,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'posted', 'failed', 'cancelled'
    posted_at TIMESTAMP,
    post_url VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content calendar
CREATE TABLE content_calendar (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    platform VARCHAR(50),
    content_type VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    content_id INTEGER REFERENCES social_content(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'ready', 'posted'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_video_uploads_status ON video_uploads(status);
CREATE INDEX idx_video_uploads_uploaded_at ON video_uploads(uploaded_at DESC);
CREATE INDEX idx_social_content_status ON social_content(status);
CREATE INDEX idx_social_content_platform ON social_content(platform);
CREATE INDEX idx_social_content_created_at ON social_content(created_at DESC);
CREATE INDEX idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX idx_content_calendar_date ON content_calendar(date);

-- Function to auto-update video status when edited file added
CREATE OR REPLACE FUNCTION update_video_status_on_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.edited_file_path IS NOT NULL AND OLD.edited_file_path IS NULL THEN
        NEW.status = 'complete';
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_edit_complete_trigger
BEFORE UPDATE ON video_uploads
FOR EACH ROW EXECUTE FUNCTION update_video_status_on_edit();

-- Function to track content submission for review
CREATE OR REPLACE FUNCTION track_content_review_submission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending_review' AND OLD.status = 'draft' THEN
        NEW.submitted_for_review_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_review_submission_trigger
BEFORE UPDATE ON social_content
FOR EACH ROW EXECUTE FUNCTION track_content_review_submission();
