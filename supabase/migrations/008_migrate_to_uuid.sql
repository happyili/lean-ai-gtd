-- Migration to UUID Primary Keys for Security
-- Date: 2025-01-27
-- Description: Replace auto-incrementing IDs with UUIDs for better security

-- =============================================
-- PostgreSQL Version
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create new tables with UUID primary keys
CREATE TABLE IF NOT EXISTS users_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS records_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general',
    parent_id UUID REFERENCES records_new(id),
    user_id UUID REFERENCES users_new(id),
    priority VARCHAR(20) DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_new_updated_at 
    BEFORE UPDATE ON users_new 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_new_updated_at 
    BEFORE UPDATE ON records_new 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SQLite Version (Alternative approach)
-- =============================================

-- For SQLite, we'll use a different approach since SQLite doesn't have native UUID support
-- We'll create a function to generate UUID-like strings

-- SQLite doesn't support UUID natively, so we'll use TEXT with a custom function
-- This would be implemented in the application layer for SQLite

-- =============================================
-- Migration Script (PostgreSQL)
-- =============================================

-- Step 1: Migrate data from old tables to new tables
-- This should be run after creating the new tables

-- Migrate users data
INSERT INTO users_new (
    id, username, email, password_hash, first_name, last_name, avatar_url,
    is_active, is_verified, is_admin, failed_login_attempts, last_failed_login,
    account_locked_until, refresh_token, refresh_token_expires_at,
    created_at, updated_at, last_login_at
)
SELECT 
    uuid_generate_v4() as id,  -- Generate new UUID for each user
    username, email, password_hash, first_name, last_name, avatar_url,
    is_active, is_verified, is_admin, failed_login_attempts, last_failed_login,
    account_locked_until, refresh_token, refresh_token_expires_at,
    created_at, updated_at, last_login_at
FROM users;

-- Migrate records data
INSERT INTO records_new (
    id, content, category, parent_id, user_id, priority, progress, progress_notes,
    created_at, updated_at, status, task_type
)
SELECT 
    uuid_generate_v4() as id,  -- Generate new UUID for each record
    r.content, r.category, 
    CASE 
        WHEN r.parent_id IS NOT NULL THEN 
            (SELECT rn.id FROM records_new rn 
             JOIN records ro ON ro.id = r.parent_id 
             WHERE ro.created_at = r.created_at LIMIT 1)
        ELSE NULL 
    END as parent_id,
    CASE 
        WHEN r.user_id IS NOT NULL THEN 
            (SELECT un.id FROM users_new un 
             JOIN users u ON u.id = r.user_id 
             WHERE u.username = un.username LIMIT 1)
        ELSE NULL 
    END as user_id,
    r.priority, r.progress, r.progress_notes,
    r.created_at, r.updated_at, r.status, r.task_type
FROM records r;

-- Step 2: Drop old tables and rename new tables
-- WARNING: This will permanently delete the old data structure
-- Make sure to backup your data before running this!

-- DROP TABLE IF EXISTS records CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ALTER TABLE users_new RENAME TO users;
-- ALTER TABLE records_new RENAME TO records;

-- Rename indexes
-- ALTER INDEX idx_users_new_username RENAME TO idx_users_username;
-- ALTER INDEX idx_users_new_email RENAME TO idx_users_email;
-- ALTER INDEX idx_users_new_is_active RENAME TO idx_users_is_active;
-- ALTER INDEX idx_users_new_is_verified RENAME TO idx_users_is_verified;
-- ALTER INDEX idx_users_new_is_admin RENAME TO idx_users_is_admin;

-- ALTER INDEX idx_records_new_user_id RENAME TO idx_records_user_id;
-- ALTER INDEX idx_records_new_parent_id RENAME TO idx_records_parent_id;
-- ALTER INDEX idx_records_new_status RENAME TO idx_records_status;
-- ALTER INDEX idx_records_new_category RENAME TO idx_records_category;
-- ALTER INDEX idx_records_new_priority RENAME TO idx_records_priority;
-- ALTER INDEX idx_records_new_task_type RENAME TO idx_records_task_type;
-- ALTER INDEX idx_records_new_progress RENAME TO idx_records_progress;

-- ALTER INDEX idx_records_new_user_status RENAME TO idx_records_user_status;
-- ALTER INDEX idx_records_new_user_category RENAME TO idx_records_user_category;
-- ALTER INDEX idx_records_new_parent_status RENAME TO idx_records_parent_status;

-- Rename triggers
-- ALTER TRIGGER update_users_new_updated_at ON users RENAME TO update_users_updated_at;
-- ALTER TRIGGER update_records_new_updated_at ON records RENAME TO update_records_updated_at;
