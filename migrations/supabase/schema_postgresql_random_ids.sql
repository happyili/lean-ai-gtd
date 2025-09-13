-- PostgreSQL Full Migration Schema for Random ID System
-- 基于随机ID的PostgreSQL完整数据库架构
-- 用于Supabase和其他PostgreSQL环境

-- ============================================
-- 删除现有表（如果存在）
-- ============================================
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 用户表 (users) - 使用随机ID
-- ============================================
CREATE TABLE users (
    -- 主键：48位随机ID，使用BIGINT存储
    id BIGINT PRIMARY KEY NOT NULL,
    
    -- 基本用户信息
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- 可选个人信息
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar_url VARCHAR(255),
    
    -- 账户状态
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- 安全相关字段
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    last_failed_login TIMESTAMP,
    account_locked_until TIMESTAMP,
    
    -- 认证令牌
    refresh_token VARCHAR(255),
    refresh_token_expires_at TIMESTAMP,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMP
);

-- ============================================
-- 用户表索引
-- ============================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================
-- 记录表 (records) - 任务/想法/笔记
-- ============================================
CREATE TABLE records (
    -- 主键：48位随机ID，使用BIGINT存储
    id BIGINT PRIMARY KEY NOT NULL,
    
    -- 核心内容
    content TEXT NOT NULL,
    category VARCHAR(20) DEFAULT 'general' NOT NULL,
    
    -- 层级关系
    parent_id BIGINT REFERENCES records(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    -- 任务属性
    priority VARCHAR(20) DEFAULT 'medium' NOT NULL
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    progress INTEGER DEFAULT 0 NOT NULL
        CHECK (progress >= 0 AND progress <= 100),
    progress_notes TEXT,
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'active' NOT NULL
        CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'archived', 'deleted')),
    task_type VARCHAR(20) DEFAULT 'work' NOT NULL
        CHECK (task_type IN ('work', 'hobby', 'life')),
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- 记录表索引
-- ============================================
CREATE INDEX idx_records_parent_id ON records(parent_id);
CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_category ON records(category);
CREATE INDEX idx_records_task_type ON records(task_type);
CREATE INDEX idx_records_priority ON records(priority);
CREATE INDEX idx_records_created_at ON records(created_at);
CREATE INDEX idx_records_updated_at ON records(updated_at);

-- 复合索引用于常见查询
CREATE INDEX idx_records_user_status ON records(user_id, status);
CREATE INDEX idx_records_parent_status ON records(parent_id, status);
CREATE INDEX idx_records_user_category ON records(user_id, category);

-- ============================================
-- 更新时间戳触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为用户表创建触发器
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为记录表创建触发器
CREATE TRIGGER update_records_updated_at
    BEFORE UPDATE ON records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 示例数据插入（可选）
-- ============================================
-- 注意：实际使用时应通过应用程序的RandomIDGenerator生成ID
-- 这里使用示例ID仅用于演示

-- 示例用户（管理员）
INSERT INTO users (
    id, username, email, password_hash, first_name, last_name,
    is_active, is_verified, is_admin, created_at, updated_at
) VALUES (
    281474976710656, -- 示例随机ID
    'admin',
    'admin@aigtd.com',
    'pbkdf2:sha256:600000$admin$1234567890abcdef',
    'Admin',
    'User',
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 示例普通用户
INSERT INTO users (
    id, username, email, password_hash, first_name, last_name,
    is_active, is_verified, is_admin, created_at, updated_at
) VALUES (
    281474976710657, -- 示例随机ID
    'demo_user',
    'demo@aigtd.com',
    'pbkdf2:sha256:600000$demo$1234567890abcdef',
    'Demo',
    'User',
    TRUE,
    TRUE,
    FALSE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 示例父任务
INSERT INTO records (
    id, content, category, user_id, priority, status, task_type,
    created_at, updated_at
) VALUES (
    281474976710658, -- 示例随机ID
    '项目规划和架构设计',
    'task',
    281474976710657, -- demo_user的ID
    'high',
    'active',
    'work',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 示例子任务
INSERT INTO records (
    id, content, category, parent_id, user_id, priority, status, task_type,
    created_at, updated_at
) VALUES 
(
    281474976710659, -- 示例随机ID
    '设计数据库架构',
    'task',
    281474976710658, -- 父任务ID
    281474976710657, -- demo_user的ID
    'high',
    'completed',
    'work',
    NOW(),
    NOW()
),
(
    281474976710660, -- 示例随机ID
    '实现用户认证系统',
    'task',
    281474976710658, -- 父任务ID
    281474976710657, -- demo_user的ID
    'medium',
    'active',
    'work',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 权限设置（适用于Supabase等）
-- ============================================
-- 为应用用户授予必要权限
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON records TO anon, authenticated;

-- ============================================
-- 注释说明
-- ============================================
COMMENT ON TABLE users IS '用户表 - 使用48位随机ID确保数据安全性';
COMMENT ON COLUMN users.id IS '用户唯一标识 - 48位随机生成的BIGINT';
COMMENT ON COLUMN users.failed_login_attempts IS '失败登录尝试次数，用于账户安全';
COMMENT ON COLUMN users.account_locked_until IS '账户锁定截止时间';

COMMENT ON TABLE records IS '记录表 - 支持任务、想法、笔记等多种类型';
COMMENT ON COLUMN records.id IS '记录唯一标识 - 48位随机生成的BIGINT';
COMMENT ON COLUMN records.parent_id IS '父记录ID，支持层级结构（如父任务-子任务）';
COMMENT ON COLUMN records.category IS '记录分类：task任务, idea想法, note笔记, general常规';
COMMENT ON COLUMN records.task_type IS '任务类型：work工作, hobby业余, life生活';
COMMENT ON COLUMN records.priority IS '优先级：low低, medium中, high高, urgent紧急';
COMMENT ON COLUMN records.status IS '状态：active活跃, completed完成, paused暂停, cancelled取消, archived归档, deleted删除';
COMMENT ON COLUMN records.progress IS '任务进度百分比 (0-100)';

-- ============================================
-- 版本信息
-- ============================================
-- Schema Version: 2.0.0 (Random ID Implementation)
-- Created: 2024-09-13
-- Compatible with: PostgreSQL 12+, Supabase
-- Features: Random IDs, Parent-Child relationships, Full-text search ready