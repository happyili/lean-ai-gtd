-- SQLite Full Migration Schema for Random ID System
-- 基于随机ID的SQLite完整数据库架构
-- 用于本地开发和轻量级部署

-- ============================================
-- SQLite特定设置
-- ============================================
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;

-- ============================================
-- 删除现有表（如果存在）
-- ============================================
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS users;

-- ============================================
-- 用户表 (users) - 使用随机ID
-- ============================================
CREATE TABLE users (
    -- 主键：48位随机ID，使用INTEGER存储（SQLite的INTEGER可以存储64位）
    id INTEGER PRIMARY KEY NOT NULL,
    
    -- 基本用户信息
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- 可选个人信息
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    
    -- 账户状态（SQLite使用INTEGER表示BOOLEAN：1=TRUE, 0=FALSE）
    is_active INTEGER DEFAULT 1 NOT NULL CHECK (is_active IN (0, 1)),
    is_verified INTEGER DEFAULT 0 NOT NULL CHECK (is_verified IN (0, 1)),
    is_admin INTEGER DEFAULT 0 NOT NULL CHECK (is_admin IN (0, 1)),
    
    -- 安全相关字段
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    last_failed_login TEXT, -- SQLite使用TEXT存储日期时间（ISO8601格式）
    account_locked_until TEXT,
    
    -- 认证令牌
    refresh_token TEXT,
    refresh_token_expires_at TEXT,
    
    -- 时间戳
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
    last_login_at TEXT
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
    -- 主键：48位随机ID，使用INTEGER存储
    id INTEGER PRIMARY KEY NOT NULL,
    
    -- 核心内容
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' NOT NULL,
    
    -- 层级关系
    parent_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- 任务属性
    priority TEXT DEFAULT 'medium' NOT NULL
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    progress INTEGER DEFAULT 0 NOT NULL
        CHECK (progress >= 0 AND progress <= 100),
    progress_notes TEXT,
    
    -- 状态管理
    status TEXT DEFAULT 'active' NOT NULL
        CHECK (status IN ('active', 'completed', 'paused', 'cancelled', 'archived', 'deleted')),
    task_type TEXT DEFAULT 'work' NOT NULL
        CHECK (task_type IN ('work', 'hobby', 'life')),
    
    -- 时间戳
    created_at TEXT DEFAULT (datetime('now')) NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL
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
-- 用户表更新时间戳触发器
CREATE TRIGGER update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at OR NEW.updated_at IS NULL
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 记录表更新时间戳触发器
CREATE TRIGGER update_records_updated_at
    AFTER UPDATE ON records
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at OR NEW.updated_at IS NULL
BEGIN
    UPDATE records SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- 全文搜索支持（可选）
-- ============================================
-- 为记录内容创建全文搜索索引
-- CREATE VIRTUAL TABLE records_fts USING fts5(
--     content, 
--     progress_notes,
--     content='records',
--     content_rowid='id'
-- );

-- 全文搜索触发器（当启用FTS时使用）
-- CREATE TRIGGER records_fts_insert AFTER INSERT ON records BEGIN
--     INSERT INTO records_fts(rowid, content, progress_notes) 
--     VALUES (new.id, new.content, new.progress_notes);
-- END;

-- CREATE TRIGGER records_fts_delete AFTER DELETE ON records BEGIN
--     INSERT INTO records_fts(records_fts, rowid, content, progress_notes) 
--     VALUES('delete', old.id, old.content, old.progress_notes);
-- END;

-- CREATE TRIGGER records_fts_update AFTER UPDATE ON records BEGIN
--     INSERT INTO records_fts(records_fts, rowid, content, progress_notes) 
--     VALUES('delete', old.id, old.content, old.progress_notes);
--     INSERT INTO records_fts(rowid, content, progress_notes) 
--     VALUES (new.id, new.content, new.progress_notes);
-- END;

-- ============================================
-- 示例数据插入（可选）
-- ============================================
-- 注意：实际使用时应通过应用程序的RandomIDGenerator生成ID
-- 这里使用示例ID仅用于演示

-- 示例用户（管理员）
INSERT OR IGNORE INTO users (
    id, username, email, password_hash, first_name, last_name,
    is_active, is_verified, is_admin, created_at, updated_at
) VALUES (
    281474976710656, -- 示例随机ID
    'admin',
    'admin@aigtd.com',
    'pbkdf2:sha256:600000$admin$1234567890abcdef',
    'Admin',
    'User',
    1, -- TRUE
    1, -- TRUE
    1, -- TRUE
    datetime('now'),
    datetime('now')
);

-- 示例普通用户
INSERT OR IGNORE INTO users (
    id, username, email, password_hash, first_name, last_name,
    is_active, is_verified, is_admin, created_at, updated_at
) VALUES (
    281474976710657, -- 示例随机ID
    'demo_user',
    'demo@aigtd.com',
    'pbkdf2:sha256:600000$demo$1234567890abcdef',
    'Demo',
    'User',
    1, -- TRUE
    1, -- TRUE
    0, -- FALSE
    datetime('now'),
    datetime('now')
);

-- 示例父任务
INSERT OR IGNORE INTO records (
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
    datetime('now'),
    datetime('now')
);

-- 示例子任务
INSERT OR IGNORE INTO records (
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
    datetime('now'),
    datetime('now')
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
    datetime('now'),
    datetime('now')
);

-- 示例想法记录
INSERT OR IGNORE INTO records (
    id, content, category, user_id, priority, status, task_type,
    created_at, updated_at
) VALUES (
    281474976710661, -- 示例随机ID
    '考虑添加AI辅助功能来提升用户体验',
    'idea',
    281474976710657, -- demo_user的ID
    'medium',
    'active',
    'work',
    datetime('now'),
    datetime('now')
);

-- 示例笔记
INSERT OR IGNORE INTO records (
    id, content, category, user_id, priority, status, task_type,
    created_at, updated_at
) VALUES (
    281474976710662, -- 示例随机ID
    '随机ID系统迁移完成记录：
    - 48位随机ID确保安全性
    - 保持父子任务关系
    - 支持导入导出功能
    - 兼容PostgreSQL和SQLite',
    'note',
    281474976710657, -- demo_user的ID
    'low',
    'active',
    'work',
    datetime('now'),
    datetime('now')
);

-- ============================================
-- 数据完整性检查视图
-- ============================================
-- 创建视图用于检查数据完整性
CREATE VIEW v_data_integrity_check AS
SELECT 
    'orphaned_records' as check_type,
    COUNT(*) as count,
    'Records with non-existent parent_id' as description
FROM records r
WHERE r.parent_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM records p WHERE p.id = r.parent_id)

UNION ALL

SELECT 
    'orphaned_user_records' as check_type,
    COUNT(*) as count,
    'Records with non-existent user_id' as description
FROM records r
WHERE r.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id)

UNION ALL

SELECT 
    'circular_references' as check_type,
    COUNT(*) as count,
    'Records that reference themselves as parent' as description
FROM records r
WHERE r.id = r.parent_id;

-- ============================================
-- 统计信息视图
-- ============================================
CREATE VIEW v_database_stats AS
SELECT 
    'users' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
FROM users

UNION ALL

SELECT 
    'records' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM records

UNION ALL

SELECT 
    'parent_tasks' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM records
WHERE parent_id IS NULL

UNION ALL

SELECT 
    'subtasks' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM records
WHERE parent_id IS NOT NULL;

-- ============================================
-- 数据库信息注释
-- ============================================
-- Schema Version: 2.0.0 (Random ID Implementation)
-- Created: 2024-09-13
-- Compatible with: SQLite 3.25+
-- Features: 
--   - 48位随机ID确保数据安全性
--   - 父子任务层级关系支持
--   - 完整的约束检查
--   - 自动更新时间戳
--   - 数据完整性检查视图
--   - 可选全文搜索支持
--   - 性能优化索引

-- ============================================
-- 使用说明
-- ============================================
-- 1. 执行此脚本创建完整的数据库结构
-- 2. 应用程序必须使用RandomIDGenerator生成ID
-- 3. 时间戳格式：ISO8601 (YYYY-MM-DD HH:MM:SS)
-- 4. 布尔值：1=TRUE, 0=FALSE
-- 5. 外键约束已启用，注意删除顺序
-- 6. 可选择启用全文搜索（取消注释FTS相关代码）

-- ============================================
-- 性能建议
-- ============================================
-- 1. 定期运行 VACUUM 命令整理数据库
-- 2. 使用 ANALYZE 命令更新统计信息
-- 3. 监控 v_data_integrity_check 视图
-- 4. 根据查询模式调整索引策略