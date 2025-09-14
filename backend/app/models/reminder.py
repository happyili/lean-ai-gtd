from app.database import db
from datetime import datetime, date


class Reminder(db.Model):
    __tablename__ = 'reminders'

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=True)

    content = db.Column(db.String(500), nullable=False)
    frequency = db.Column(db.String(20), nullable=False, default='daily')  # daily | weekly | weekdays
    day_of_week = db.Column(db.Integer, nullable=True)  # 0=Mon ... 6=Sun (only for weekly)
    remind_time = db.Column(db.String(5), nullable=False)  # 'HH:MM' UTC
    status = db.Column(db.String(20), nullable=False, default='active')  # active | paused | deleted
    last_triggered_date = db.Column(db.Date, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref='reminders')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'frequency': self.frequency,
            'day_of_week': self.day_of_week,
            'remind_time': self.remind_time,
            'status': self.status,
            'last_triggered_date': self.last_triggered_date.isoformat() if self.last_triggered_date else None,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updated_at': self.updated_at.isoformat() + 'Z' if self.updated_at else None,
        }

    def is_due_today(self, now_utc: datetime) -> bool:
        if self.status != 'active':
            return False
        # avoid duplicate trigger on same day
        if self.last_triggered_date and self.last_triggered_date == now_utc.date():
            return False

        # frequency check
        weekday = now_utc.weekday()  # 0=Mon
        if self.frequency == 'weekdays' and weekday >= 5:
            return False
        if self.frequency == 'weekly':
            if self.day_of_week is None or self.day_of_week != weekday:
                return False

        # time check
        try:
            hh, mm = self.remind_time.split(':')
            target_minutes = int(hh) * 60 + int(mm)
            now_minutes = now_utc.hour * 60 + now_utc.minute
            return now_minutes >= target_minutes
        except Exception:
            return False

    def acknowledge_today(self):
        self.last_triggered_date = date.today()
        return True

