# AIGTD Database Migration Guide

## 📋 Overview

This guide explains how to use the complete database schema migrations for the AIGTD (AI Getting Things Done) application. The migrations create a complete database schema with users and records tables, including all necessary indexes, constraints, triggers, and views.

## 🗂️ Migration Files

### Available Migrations

1. **`006_complete_schema_postgresql.sql`** - Complete schema for PostgreSQL/Supabase
2. **`007_complete_schema_sqlite.sql`** - Complete schema for SQLite (local development)
3. **`test_migration.py`** - Test script to verify migration correctness

### Legacy Migrations (for reference)
- `001_create_records_table.sql` - Initial records table
- `002_add_task_type_column.sql` - Added task_type column
- `003_create_users_table.sql` - Added users table

## 🚀 Usage Instructions

### For PostgreSQL/Supabase

```bash
# Apply the complete schema migration
psql -h your-host -U your-user -d your-database -f supabase/migrations/006_complete_schema_postgresql.sql

# Or using Supabase CLI
supabase db reset
supabase db push
```

### For SQLite (Local Development)

```bash
# Apply the complete schema migration
sqlite3 data/aigtd.db < supabase/migrations/007_complete_schema_sqlite.sql
```

### Testing the Migration

```bash
# Run the test script to verify everything works
python3 test_migration.py
```

## 📊 Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL/INTEGER | Primary key |
| `username` | VARCHAR(80) | Unique username |
| `email` | VARCHAR(120) | Unique email address |
| `password_hash` | VARCHAR(255) | Hashed password |
| `first_name` | VARCHAR(50) | User's first name |
| `last_name` | VARCHAR(50) | User's last name |
| `avatar_url` | VARCHAR(255) | Profile picture URL |
| `is_active` | BOOLEAN | Account active status |
| `is_verified` | BOOLEAN | Email verification status |
| `is_admin` | BOOLEAN | Admin privileges |
| `failed_login_attempts` | INTEGER | Failed login counter |
| `last_failed_login` | TIMESTAMP | Last failed login time |
| `account_locked_until` | TIMESTAMP | Account lock expiration |
| `refresh_token` | VARCHAR(255) | JWT refresh token |
| `refresh_token_expires_at` | TIMESTAMP | Refresh token expiration |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `last_login_at` | TIMESTAMP | Last successful login |

### Records Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL/INTEGER | Primary key |
| `content` | TEXT | Record content |
| `category` | VARCHAR(20) | Type: idea/task/note/general |
| `parent_id` | INTEGER | Parent task ID (for subtasks) |
| `user_id` | INTEGER | Owner user ID |
| `priority` | VARCHAR(20) | Priority: low/medium/high/urgent |
| `progress` | INTEGER | Progress percentage (0-100) |
| `progress_notes` | TEXT | Progress notes and issues |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `status` | VARCHAR(20) | Status: active/completed/paused/cancelled/archived/deleted |
| `task_type` | VARCHAR(20) | Category: work/hobby/life |

## 🔍 Features Included

### Indexes
- **Users**: username, email, is_active, is_verified, is_admin
- **Records**: user_id, parent_id, status, category, priority, task_type, progress
- **Composite**: user_id+status, user_id+category, parent_id+status

### Constraints
- **Records category**: Must be one of idea/task/note/general
- **Records priority**: Must be one of low/medium/high/urgent
- **Records status**: Must be one of active/completed/paused/cancelled/archived/deleted
- **Records task_type**: Must be one of work/hobby/life
- **Records progress**: Must be between 0 and 100

### Triggers
- **Auto-update timestamps**: Automatically updates `updated_at` when records are modified

### Views
- **active_tasks**: Shows active tasks with subtask counts
- **user_stats**: Shows user statistics including task counts and progress

### Default Data
- **Admin user**: Username `admin`, password `admin123`, email `admin@aigtd.com`

## 🧪 Testing

The `test_migration.py` script verifies:

1. ✅ All tables are created successfully
2. ✅ All required columns exist with correct types
3. ✅ Data can be inserted and retrieved
4. ✅ Foreign key relationships work
5. ✅ Indexes are created
6. ✅ Triggers function correctly

### Running Tests

```bash
# Test SQLite migration
python3 test_migration.py

# Expected output:
# 🚀 Starting AIGTD Database Migration Tests
# ✅ SQLite Migration PASSED
# ✅ Supabase Migration PASSED
# 🎉 All tests passed! Migration is ready to use.
```

## 🔧 Customization

### Adding New Columns

To add new columns to existing tables:

```sql
-- Example: Add a new column to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Don't forget to add an index if needed
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

### Adding New Tables

To add new tables:

```sql
-- Example: Add a new table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
```

## 🚨 Important Notes

### PostgreSQL vs SQLite Differences

| Feature | PostgreSQL | SQLite |
|---------|------------|--------|
| Primary Key | `SERIAL PRIMARY KEY` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| Timestamps | `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` | `DATETIME DEFAULT CURRENT_TIMESTAMP` |
| Booleans | `TRUE/FALSE` | `1/0` |
| Triggers | `CREATE OR REPLACE FUNCTION` | `CREATE TRIGGER IF NOT EXISTS` |
| Constraints | `CHECK` constraints supported | Limited constraint support |

### Migration Order

1. Always run migrations in order (001, 002, 003, etc.)
2. The complete schema migrations (006, 007) can replace all previous migrations
3. Test migrations in a development environment first

### Backup Recommendations

```bash
# PostgreSQL backup
pg_dump -h your-host -U your-user your-database > backup.sql

# SQLite backup
cp data/aigtd.db data/aigtd_backup_$(date +%Y%m%d_%H%M%S).db
```

## 📞 Support

If you encounter issues with the migrations:

1. Check the test script output for specific errors
2. Verify your database connection and permissions
3. Ensure you're using the correct migration file for your database type
4. Check the application logs for detailed error messages

## 🔄 Version History

- **v1.0** (2025-09-10): Initial complete schema migration
- **v0.3**: Added users table and user_id foreign key
- **v0.2**: Added task_type column
- **v0.1**: Initial records table creation
