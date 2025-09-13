-- Complete Schema Migration for AIGTD Database (Supabase Compatible)
-- This migration creates the complete schema based on current models
-- Date: 2025-09-10
-- Description: Complete schema setup for records and users tables

-- =============================================
-- 1. CREATE USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    -- If using Random ID, use:  id BIGINT PRIMARY KEY NOT NULL,
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- SERIAL PRIMARY KEY 
    
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

CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- random id:  id BIGINT PRIMARY KEY NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',
    parent_id INTEGER REFERENCES records(id),
    user_id INTEGER REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    task_type VARCHAR(20) DEFAULT 'work'
);

-- =============================================
-- 3. CREATE INDEXES
-- =============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Records table indexes
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_parent_id ON records(parent_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
CREATE INDEX IF NOT EXISTS idx_records_priority ON records(priority);
CREATE INDEX IF NOT EXISTS idx_records_task_type ON records(task_type);
CREATE INDEX IF NOT EXISTS idx_records_progress ON records(progress);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_records_user_status ON records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_records_user_category ON records(user_id, category);
CREATE INDEX IF NOT EXISTS idx_records_parent_status ON records(parent_id, status);

-- =============================================
-- 4. CREATE TRIGGERS
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
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for records table
DROP TRIGGER IF EXISTS update_records_updated_at ON records;
CREATE TRIGGER update_records_updated_at 
    BEFORE UPDATE ON records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. ADD CONSTRAINTS
-- =============================================

-- Add check constraints for enum-like values
ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_category;
ALTER TABLE records ADD CONSTRAINT chk_records_category 
    CHECK (category IN ('idea', 'task', 'note', 'general'));

ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_priority;
ALTER TABLE records ADD CONSTRAINT chk_records_priority 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_status;
ALTER TABLE records ADD CONSTRAINT chk_records_status 
    CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'archived', 'deleted'));

ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_task_type;
ALTER TABLE records ADD CONSTRAINT chk_records_task_type 
    CHECK (task_type IN ('work', 'hobby', 'life'));

ALTER TABLE records DROP CONSTRAINT IF EXISTS chk_records_progress;
ALTER TABLE records ADD CONSTRAINT chk_records_progress 
    CHECK (progress >= 0 AND progress <= 100);

-- =============================================
-- 6. INSERT DEFAULT ADMIN USER
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
-- 7. CREATE USEFUL VIEWS
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
-- 8. ADD COMMENTS FOR DOCUMENTATION
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
