-- Migration to UUID Primary Keys for SQLite
-- Date: 2025-01-27
-- Description: Replace auto-incrementing IDs with UUIDs for SQLite database

-- =============================================
-- SQLite UUID Migration
-- =============================================

-- SQLite doesn't have native UUID support, so we'll use TEXT with UUID format
-- The UUID generation will be handled in the application layer

-- Create new tables with UUID primary keys (TEXT type for SQLite)
CREATE TABLE IF NOT EXISTS users_new (
    id TEXT PRIMARY KEY,  -- Will store UUID as string
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- User basic information
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    
    -- Account status flags
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    is_admin BOOLEAN DEFAULT 0,
    
    -- Security and authentication
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login DATETIME,
    account_locked_until DATETIME,
    
    -- Token management
    refresh_token VARCHAR(255),
    refresh_token_expires_at DATETIME,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS records_new (
    id TEXT PRIMARY KEY,  -- Will store UUID as string
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',
    parent_id TEXT REFERENCES records_new(id),
    user_id TEXT REFERENCES users_new(id),
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    task_type VARCHAR(20) DEFAULT 'work'
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_users_new_username ON users_new(username);
CREATE INDEX IF NOT EXISTS idx_users_new_email ON users_new(email);
CREATE INDEX IF NOT EXISTS idx_users_new_is_active ON users_new(is_active);
CREATE INDEX IF NOT EXISTS idx_users_new_is_verified ON users_new(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_new_is_admin ON users_new(is_admin);

CREATE INDEX IF NOT EXISTS idx_records_new_user_id ON records_new(user_id);
CREATE INDEX IF NOT EXISTS idx_records_new_parent_id ON records_new(parent_id);
CREATE INDEX IF NOT EXISTS idx_records_new_status ON records_new(status);
CREATE INDEX IF NOT EXISTS idx_records_new_category ON records_new(category);
CREATE INDEX IF NOT EXISTS idx_records_new_priority ON records_new(priority);
CREATE INDEX IF NOT EXISTS idx_records_new_task_type ON records_new(task_type);
CREATE INDEX IF NOT EXISTS idx_records_new_progress ON records_new(progress);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_records_new_user_status ON records_new(user_id, status);
CREATE INDEX IF NOT EXISTS idx_records_new_user_category ON records_new(user_id, category);
CREATE INDEX IF NOT EXISTS idx_records_new_parent_status ON records_new(parent_id, status);

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_users_new_updated_at 
    AFTER UPDATE ON users_new 
    FOR EACH ROW 
    BEGIN
        UPDATE users_new SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_records_new_updated_at 
    AFTER UPDATE ON records_new 
    FOR EACH ROW 
    BEGIN
        UPDATE records_new SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- =============================================
-- Data Migration (to be run after application updates)
-- =============================================

-- Note: The actual data migration should be done in the application layer
-- because we need to generate UUIDs for each record and maintain relationships

-- Example migration queries (to be run from Python application):

-- 1. Migrate users with new UUIDs
-- INSERT INTO users_new SELECT 
--     (SELECT hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))) as id,
--     username, email, password_hash, first_name, last_name, avatar_url,
--     is_active, is_verified, is_admin, failed_login_attempts, last_failed_login,
--     account_locked_until, refresh_token, refresh_token_expires_at,
--     created_at, updated_at, last_login_at
-- FROM users;

-- 2. Migrate records with new UUIDs and updated foreign keys
-- This is more complex and should be done in the application layer

-- =============================================
-- Views for backward compatibility (optional)
-- =============================================

-- Create views that maintain the same interface
CREATE VIEW IF NOT EXISTS active_tasks_new AS
SELECT 
    r.*,
    COALESCE(subtask_counts.subtask_count, 0) as subtask_count,
    COALESCE(subtask_counts.completed_subtasks, 0) as completed_subtasks
FROM records_new r
LEFT JOIN (
    SELECT 
        parent_id,
        COUNT(*) as subtask_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_subtasks
    FROM records_new 
    WHERE parent_id IS NOT NULL AND status != 'deleted'
    GROUP BY parent_id
) subtask_counts ON r.id = subtask_counts.parent_id
WHERE r.category = 'task' 
  AND r.status = 'active' 
  AND r.parent_id IS NULL;

CREATE VIEW IF NOT EXISTS user_stats_new AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(r.id) as total_records,
    COUNT(CASE WHEN r.category = 'task' THEN 1 END) as total_tasks,
    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_tasks,
    AVG(r.progress) as avg_progress
FROM users_new u
LEFT JOIN records_new r ON u.id = r.user_id AND r.status != 'deleted'
GROUP BY u.id, u.username, u.email;
