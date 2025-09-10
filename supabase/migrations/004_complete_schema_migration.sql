-- Complete Schema Migration for AIGTD Database
-- This migration creates the complete schema based on current models
-- Date: 2025-09-10
-- Description: Complete schema setup for records and users tables with all relationships and constraints

-- =============================================
-- 1. CREATE USERS TABLE
-- =============================================

-- Drop existing users table if it exists (for clean migration)
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with complete schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- User basic information
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    
    -- Account status flags
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    
    -- Security and authentication
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP WITH TIME ZONE,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Token management
    refresh_token VARCHAR(255),
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 2. CREATE RECORDS TABLE
-- =============================================

-- Drop existing records table if it exists (for clean migration)
DROP TABLE IF EXISTS records CASCADE;

-- Create records table with complete schema
CREATE TABLE records (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',  -- idea/task/note/general
    parent_id INTEGER REFERENCES records(id),  -- Self-referencing for subtasks
    user_id INTEGER REFERENCES users(id),  -- Foreign key to users
    priority VARCHAR(20) DEFAULT 'medium',  -- low/medium/high/urgent
    progress INTEGER DEFAULT 0,  -- Progress percentage 0-100
    progress_notes TEXT,  -- Progress notes and issue descriptions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',  -- active/completed/paused/cancelled/archived/deleted
    task_type VARCHAR(20) DEFAULT 'work'  -- work/hobby/life
);

-- =============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_verified ON users(is_verified);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Records table indexes
CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_records_parent_id ON records(parent_id);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_category ON records(category);
CREATE INDEX idx_records_priority ON records(priority);
CREATE INDEX idx_records_task_type ON records(task_type);
CREATE INDEX idx_records_created_at ON records(created_at);
CREATE INDEX idx_records_updated_at ON records(updated_at);
CREATE INDEX idx_records_progress ON records(progress);

-- Composite indexes for common queries
CREATE INDEX idx_records_user_status ON records(user_id, status);
CREATE INDEX idx_records_user_category ON records(user_id, category);
CREATE INDEX idx_records_parent_status ON records(parent_id, status);

-- =============================================
-- 4. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for records table
CREATE TRIGGER update_records_updated_at 
    BEFORE UPDATE ON records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. CREATE CONSTRAINTS AND VALIDATIONS
-- =============================================

-- Add check constraints for enum-like values
ALTER TABLE records ADD CONSTRAINT chk_records_category 
    CHECK (category IN ('idea', 'task', 'note', 'general'));

ALTER TABLE records ADD CONSTRAINT chk_records_priority 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE records ADD CONSTRAINT chk_records_status 
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'archived', 'deleted'));

ALTER TABLE records ADD CONSTRAINT chk_records_task_type 
    CHECK (task_type IN ('work', 'hobby', 'life'));

ALTER TABLE records ADD CONSTRAINT chk_records_progress 
    CHECK (progress >= 0 AND progress <= 100);

-- =============================================
-- 6. INSERT DEFAULT DATA
-- =============================================

-- Create default admin user (password: admin123)
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    is_active, 
    is_verified, 
    is_admin
) VALUES (
    'admin',
    'admin@aigtd.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K5K5K.',  -- admin123
    'Admin',
    'User',
    TRUE,
    TRUE,
    TRUE
) ON CONFLICT (username) DO NOTHING;

-- =============================================
-- 7. CREATE VIEWS FOR COMMON QUERIES
-- =============================================

-- View for active tasks with subtask counts
CREATE OR REPLACE VIEW active_tasks AS
SELECT 
    r.*,
    COALESCE(subtask_counts.subtask_count, 0) as subtask_count,
    COALESCE(subtask_counts.completed_subtasks, 0) as completed_subtasks
FROM records r
LEFT JOIN (
    SELECT 
        parent_id,
        COUNT(*) as subtask_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_subtasks
    FROM records 
    WHERE parent_id IS NOT NULL AND status != 'deleted'
    GROUP BY parent_id
) subtask_counts ON r.id = subtask_counts.parent_id
WHERE r.category = 'task' 
  AND r.status = 'active' 
  AND r.parent_id IS NULL;

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(r.id) as total_records,
    COUNT(CASE WHEN r.category = 'task' THEN 1 END) as total_tasks,
    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_tasks,
    AVG(r.progress) as avg_progress
FROM users u
LEFT JOIN records r ON u.id = r.user_id AND r.status != 'deleted'
GROUP BY u.id, u.username, u.email;

-- =============================================
-- 8. GRANT PERMISSIONS (if using Supabase)
-- =============================================

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Create RLS policies for records table
CREATE POLICY "Users can view their own records" ON records
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own records" ON records
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own records" ON records
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own records" ON records
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- =============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE users IS 'User accounts and authentication information';
COMMENT ON TABLE records IS 'GTD records including tasks, ideas, and notes';

COMMENT ON COLUMN records.category IS 'Type of record: idea, task, note, general';
COMMENT ON COLUMN records.parent_id IS 'Parent task ID for subtasks (self-referencing)';
COMMENT ON COLUMN records.user_id IS 'Owner of the record';
COMMENT ON COLUMN records.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN records.progress IS 'Completion progress percentage (0-100)';
COMMENT ON COLUMN records.status IS 'Current status: active, completed, paused, cancelled, archived, deleted';
COMMENT ON COLUMN records.task_type IS 'Task category: work, hobby, life';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log migration completion
INSERT INTO migration_log (migration_name, applied_at) 
VALUES ('004_complete_schema_migration', NOW())
ON CONFLICT DO NOTHING;
