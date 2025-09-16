-- Complete Schema Migration for AIGTD Database (Supabase Compatible)
-- This migration creates the complete schema based on current models
-- Date: 2025-01-27
-- Description: Complete schema setup for all tables including pomodoro_tasks, info_resources, and reminders

-- =============================================
-- 1. CREATE USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    
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
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',
    parent_id BIGINT REFERENCES records(id),
    user_id BIGINT REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    task_type VARCHAR(20) DEFAULT 'work'
);

-- =============================================
-- 3. CREATE POMODORO_TASKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS pomodoro_tasks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    
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
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Pomodoro statistics
    pomodoros_completed INTEGER DEFAULT 0,
    total_focus_time INTEGER DEFAULT 0,
    
    -- AI generation info
    generation_context TEXT,
    ai_reasoning TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. CREATE INFO_RESOURCES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS info_resources (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    resource_type VARCHAR(50) DEFAULT 'general',
    user_id BIGINT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. CREATE REMINDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS reminders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id),
    
    content VARCHAR(500) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    day_of_week INTEGER,  -- 0=Mon ... 6=Sun (only for weekly)
    remind_time VARCHAR(5) NOT NULL,  -- 'HH:MM' UTC
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_triggered_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
-- 7. CREATE TRIGGERS
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

-- Trigger for pomodoro_tasks table
DROP TRIGGER IF EXISTS update_pomodoro_tasks_updated_at ON pomodoro_tasks;
CREATE TRIGGER update_pomodoro_tasks_updated_at 
    BEFORE UPDATE ON pomodoro_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for info_resources table
DROP TRIGGER IF EXISTS update_info_resources_updated_at ON info_resources;
CREATE TRIGGER update_info_resources_updated_at 
    BEFORE UPDATE ON info_resources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reminders table
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at 
    BEFORE UPDATE ON reminders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. ADD CONSTRAINTS
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

-- Pomodoro tasks constraints
ALTER TABLE pomodoro_tasks DROP CONSTRAINT IF EXISTS chk_pomodoro_tasks_status;
ALTER TABLE pomodoro_tasks ADD CONSTRAINT chk_pomodoro_tasks_status 
    CHECK (status IN ('pending', 'active', 'completed', 'skipped'));

ALTER TABLE pomodoro_tasks DROP CONSTRAINT IF EXISTS chk_pomodoro_tasks_estimated_pomodoros;
ALTER TABLE pomodoro_tasks ADD CONSTRAINT chk_pomodoro_tasks_estimated_pomodoros 
    CHECK (estimated_pomodoros > 0);

ALTER TABLE pomodoro_tasks DROP CONSTRAINT IF EXISTS chk_pomodoro_tasks_order_index;
ALTER TABLE pomodoro_tasks ADD CONSTRAINT chk_pomodoro_tasks_order_index 
    CHECK (order_index >= 0 AND order_index <= 5);

-- Info resources constraints
ALTER TABLE info_resources DROP CONSTRAINT IF EXISTS chk_info_resources_status;
ALTER TABLE info_resources ADD CONSTRAINT chk_info_resources_status 
    CHECK (status IN ('active', 'archived', 'deleted'));

-- Reminders constraints
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS chk_reminders_frequency;
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_frequency 
    CHECK (frequency IN ('daily', 'weekly', 'weekdays'));

ALTER TABLE reminders DROP CONSTRAINT IF EXISTS chk_reminders_day_of_week;
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_day_of_week 
    CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6));

ALTER TABLE reminders DROP CONSTRAINT IF EXISTS chk_reminders_status;
ALTER TABLE reminders ADD CONSTRAINT chk_reminders_status 
    CHECK (status IN ('active', 'paused', 'deleted'));

-- =============================================
-- 9. INSERT DEFAULT ADMIN USER
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
-- 10. CREATE USEFUL VIEWS
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
-- 11. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE users IS 'User accounts and authentication information';
COMMENT ON TABLE records IS 'GTD records including tasks, ideas, and notes';
COMMENT ON TABLE pomodoro_tasks IS 'AI-generated focused work sessions';
COMMENT ON TABLE info_resources IS 'Information resources and knowledge base';
COMMENT ON TABLE reminders IS 'Scheduled reminders and notifications';

COMMENT ON COLUMN records.category IS 'Type of record: idea, task, note, general';
COMMENT ON COLUMN records.parent_id IS 'Parent task ID for subtasks (self-referencing)';
COMMENT ON COLUMN records.user_id IS 'Owner of the record';
COMMENT ON COLUMN records.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN records.progress IS 'Completion progress percentage (0-100)';
COMMENT ON COLUMN records.status IS 'Current status: active, completed, paused, cancelled, archived, deleted';
COMMENT ON COLUMN records.task_type IS 'Task category: work, hobby, life';

COMMENT ON COLUMN pomodoro_tasks.related_task_ids IS 'JSON array of related record IDs';
COMMENT ON COLUMN pomodoro_tasks.order_index IS 'Order in top 5 tasks (1-5)';
COMMENT ON COLUMN pomodoro_tasks.status IS 'Task status: pending, active, completed, skipped';

COMMENT ON COLUMN reminders.frequency IS 'Reminder frequency: daily, weekly, weekdays';
COMMENT ON COLUMN reminders.day_of_week IS 'Day of week for weekly reminders (0=Monday, 6=Sunday)';
COMMENT ON COLUMN reminders.remind_time IS 'Reminder time in HH:MM format (UTC)';