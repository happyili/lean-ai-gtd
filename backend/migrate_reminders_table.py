#!/usr/bin/env python3
"""
Create reminders table for scheduled reminders (SQLite / PostgreSQL compatible)
"""

from flask import Flask
from app.database.init import init_database
from app.database import db


def migrate_reminders_table():
    # Build minimal app to init DB without importing full routes
    app = Flask(__name__)
    init_database(app)
    with app.app_context():
        engine = db.engine

        # Check if table exists
        if engine.dialect.has_table(engine.connect(), 'reminders'):
            print('✅ reminders table already exists')
            return

        # Create table using raw SQL for compatibility
        driver = engine.name
        print(f"Using DB driver: {driver}")

        # Common columns with portable types
        create_sql = (
            "CREATE TABLE reminders ("
            " id BIGINT PRIMARY KEY"
            + (" GENERATED ALWAYS AS IDENTITY" if driver == 'postgresql' else "")
            + (" AUTOINCREMENT" if driver == 'sqlite' else "")
            + ", user_id BIGINT NULL,"
            " content VARCHAR(500) NOT NULL,"
            " frequency VARCHAR(20) NOT NULL DEFAULT 'daily',"
            " day_of_week INTEGER NULL,"
            " remind_time VARCHAR(5) NOT NULL,"
            " status VARCHAR(20) NOT NULL DEFAULT 'active',"
            " last_triggered_date DATE NULL,"
            " created_at TIMESTAMP NULL,"
            " updated_at TIMESTAMP NULL,"
            " CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)"
            ")"
        )

        with engine.begin() as conn:
            conn.execute(db.text(create_sql))
            # Indexes
            conn.execute(db.text("CREATE INDEX IF NOT EXISTS idx_reminders_user_status ON reminders(user_id, status)"))
            conn.execute(db.text("CREATE INDEX IF NOT EXISTS idx_reminders_schedule ON reminders(frequency, day_of_week, remind_time)"))

        print('✅ reminders table created')


if __name__ == '__main__':
    migrate_reminders_table()
