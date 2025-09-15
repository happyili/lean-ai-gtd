-- Complete Schema Migration for AIGTD Database (SQLite)
-- This migration creates the complete schema based on current models
-- Date: 2025-01-27
-- Description: Complete schema setup for all tables including pomodoro_tasks, info_resources, and reminders

-- =============================================
-- 1. CREATE USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- =============================================
-- 2. CREATE RECORDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',
    parent_id INTEGER REFERENCES records(id),
    user_id INTEGER REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    task_type VARCHAR(20) DEFAULT 'work'
);

-- =============================================
-- 3. CREATE POMODORO_TASKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS pomodoro_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    -- AI generated task content
    title VARCHAR(200) NOT NULL,
    description TEXT,
    related_task_ids TEXT,  -- JSON format
    
    -- Task attributes
    priority_score INTEGER DEFAULT 0,
    estimated_pomodoros INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    
    -- Execution status
    status VARCHAR(20) DEFAULT 'pending',
    started_at DATETIME,
    completed_at DATETIME,
    
    -- Pomodoro statistics
    pomodoros_completed INTEGER DEFAULT 0,
    total_focus_time INTEGER DEFAULT 0,
    
    -- AI generation info
    generation_context TEXT,
    ai_reasoning TEXT,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. CREATE INFO_RESOURCES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS info_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    resource_type VARCHAR(50) DEFAULT 'general',
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. CREATE REMINDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    
    content VARCHAR(500) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    day_of_week INTEGER,  -- 0=Mon ... 6=Sun (only for weekly)
    remind_time VARCHAR(5) NOT NULL,  -- 'HH:MM' UTC
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_triggered_date DATE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. CREATE INDEXES
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

-- Pomodoro tasks indexes
CREATE INDEX IF NOT EXISTS idx_pomodoro_tasks_user_id ON pomodoro_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_tasks_status ON pomodoro_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pomodoro_tasks_order_index ON pomodoro_tasks(order_index);

-- Info resources indexes
CREATE INDEX IF NOT EXISTS idx_info_resources_user_id ON info_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_info_resources_status ON info_resources(status);
CREATE INDEX IF NOT EXISTS idx_info_resources_resource_type ON info_resources(resource_type);

-- Reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_frequency ON reminders(frequency);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_records_user_status ON records(user_id, status);
CREATE INDEX IF NOT EXISTS idx_records_user_category ON records(user_id, category);
CREATE INDEX IF NOT EXISTS idx_records_parent_status ON records(parent_id, status);

-- =============================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================

-- Trigger for users table
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users 
    FOR EACH ROW 
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger for records table
CREATE TRIGGER IF NOT EXISTS update_records_updated_at 
    AFTER UPDATE ON records 
    FOR EACH ROW 
    BEGIN
        UPDATE records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger for pomodoro_tasks table
CREATE TRIGGER IF NOT EXISTS update_pomodoro_tasks_updated_at 
    AFTER UPDATE ON pomodoro_tasks 
    FOR EACH ROW 
    BEGIN
        UPDATE pomodoro_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger for info_resources table
CREATE TRIGGER IF NOT EXISTS update_info_resources_updated_at 
    AFTER UPDATE ON info_resources 
    FOR EACH ROW 
    BEGIN
        UPDATE info_resources SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger for reminders table
CREATE TRIGGER IF NOT EXISTS update_reminders_updated_at 
    AFTER UPDATE ON reminders 
    FOR EACH ROW 
    BEGIN
        UPDATE reminders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- =============================================
-- 8. INSERT DEFAULT ADMIN USER
-- =============================================

-- Create default admin user (password: admin123)
INSERT OR IGNORE INTO users (
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
    1,
    1,
    1
);

-- =============================================
-- 9. CREATE USEFUL VIEWS
-- =============================================

-- View for active tasks with subtask counts
CREATE VIEW IF NOT EXISTS active_tasks AS
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
CREATE VIEW IF NOT EXISTS user_stats AS
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