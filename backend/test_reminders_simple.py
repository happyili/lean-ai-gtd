#!/usr/bin/env python3
"""
定时提醒模块简单测试（无需HTTP）
验证数据库操作、到期计算与确认逻辑
"""

from datetime import datetime, timedelta
from pathlib import Path
import sys

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app import create_app
from app.database import db
from app.models.user import User
from app.models.reminder import Reminder


def ensure_user():
    u = User.query.filter_by(username='test_reminders').first()
    if not u:
        u = User(username='test_reminders', email='test@reminders.com', password_hash='x')
        db.session.add(u)
        db.session.commit()
    return u


def create_samples(user_id):
    # cleanup
    Reminder.query.filter_by(user_id=user_id).delete()
    db.session.commit()

    now = datetime.utcnow()
    hhmm_now = now.strftime('%H:%M')
    hhmm_future = (now + timedelta(minutes=10)).strftime('%H:%M')

    items = [
        Reminder(user_id=user_id, content='每日提醒-现在', frequency='daily', remind_time=hhmm_now, status='active'),
        Reminder(user_id=user_id, content='每日提醒-未来', frequency='daily', remind_time=hhmm_future, status='active'),
        Reminder(user_id=user_id, content='工作日提醒-现在', frequency='weekdays', remind_time=hhmm_now, status='active'),
    ]
    for r in items:
        db.session.add(r)
    db.session.commit()
    return items


def compute_due(user_id):
    # emulate route logic
    now = datetime.utcnow()
    due = []
    for r in Reminder.query.filter_by(user_id=user_id, status='active').all():
        if r.is_due_today(now):
            due.append(r)
    return due


def main():
    app = create_app()
    with app.app_context():
        user = ensure_user()
        create_samples(user.id)
        due = compute_due(user.id)
        assert any('每日提醒-现在' in r.content for r in due), '应包含立即到期的每日提醒'
        # acknowledge one
        r = next(x for x in due if '每日提醒-现在' in x.content)
        r.acknowledge_today()
        db.session.commit()
        due2 = compute_due(user.id)
        assert not any('每日提醒-现在' in x.content for x in due2), '确认后同日不再重复提醒'
        print('✅ Reminders simple test passed')


if __name__ == '__main__':
    main()

