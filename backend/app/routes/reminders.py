from flask import Blueprint, request, jsonify
from datetime import datetime, timezone, date
from app.database import db
from app.models.reminder import Reminder
from app.utils.auth_helpers import get_current_user


def _get_access_context():
    try:
        current_user = get_current_user()
        if current_user:
            return current_user, 'user', None
        return None, 'guest', None
    except Exception as e:
        return None, 'guest', str(e)


reminders_bp = Blueprint('reminders', __name__)


@reminders_bp.route('/api/reminders', methods=['POST'])
def create_reminder():
    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    frequency = data.get('frequency') or 'daily'
    day_of_week = data.get('day_of_week')
    remind_time = (data.get('remind_time') or '').strip()

    if not content:
        return jsonify({'error': '提醒内容不能为空'}), 400
    if frequency not in ['daily', 'weekly', 'weekdays']:
        return jsonify({'error': '频次无效'}), 400
    if frequency == 'weekly':
        try:
            dow = int(day_of_week)
            if dow < 0 or dow > 6:
                raise ValueError()
        except Exception:
            return jsonify({'error': '每周提醒需要有效的day_of_week(0-6)'}), 400
    if not remind_time or len(remind_time) != 5 or ':' not in remind_time:
        return jsonify({'error': '提醒时间格式应为HH:MM(UTC)'}), 400

    current_user, access, _ = _get_access_context()

    reminder = Reminder(
        user_id=current_user.id if current_user else None,
        content=content,
        frequency=frequency,
        day_of_week=day_of_week if frequency == 'weekly' else None,
        remind_time=remind_time,
        status='active',
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.session.add(reminder)
    db.session.commit()

    return jsonify({'message': '创建成功', 'reminder': reminder.to_dict()}), 201


@reminders_bp.route('/api/reminders', methods=['GET'])
def list_reminders():
    search = request.args.get('search', '')
    status = request.args.get('status', 'active')

    current_user, access, _ = _get_access_context()
    query = Reminder.query
    if access == 'user':
        query = query.filter(Reminder.user_id == current_user.id)
    else:
        query = query.filter(Reminder.user_id.is_(None))

    if status and status != 'all':
        query = query.filter(Reminder.status == status)
    else:
        query = query.filter(Reminder.status != 'deleted')

    if search:
        query = query.filter(Reminder.content.contains(search))

    items = [r.to_dict() for r in query.order_by(Reminder.created_at.desc()).all()]
    return jsonify({'reminders': items, 'total': len(items)})


@reminders_bp.route('/api/reminders/<int:reminder_id>', methods=['PUT'])
def update_reminder(reminder_id):
    data = request.get_json() or {}

    current_user, access, _ = _get_access_context()
    if access == 'user':
        r = Reminder.query.filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    else:
        r = Reminder.query.filter(Reminder.id == reminder_id, Reminder.user_id.is_(None)).first()
    if not r:
        return jsonify({'error': '提醒不存在或无权限'}), 404

    if 'content' in data:
        content = (data.get('content') or '').strip()
        if not content:
            return jsonify({'error': '提醒内容不能为空'}), 400
        r.content = content

    if 'frequency' in data:
        freq = data.get('frequency')
        if freq not in ['daily', 'weekly', 'weekdays']:
            return jsonify({'error': '频次无效'}), 400
        r.frequency = freq
        if freq != 'weekly':
            r.day_of_week = None

    if 'day_of_week' in data and r.frequency == 'weekly':
        try:
            dow = int(data.get('day_of_week'))
            if dow < 0 or dow > 6:
                raise ValueError()
            r.day_of_week = dow
        except Exception:
            return jsonify({'error': 'day_of_week需在0-6'}), 400

    if 'remind_time' in data:
        rt = (data.get('remind_time') or '').strip()
        if not rt or len(rt) != 5 or ':' not in rt:
            return jsonify({'error': '提醒时间格式应为HH:MM(UTC)'}), 400
        r.remind_time = rt

    if 'status' in data:
        st = data.get('status')
        if st not in ['active', 'paused', 'deleted']:
            return jsonify({'error': '状态无效'}), 400
        r.status = st

    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '更新成功', 'reminder': r.to_dict()})


@reminders_bp.route('/api/reminders/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    current_user, access, _ = _get_access_context()
    if access == 'user':
        r = Reminder.query.filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    else:
        r = Reminder.query.filter(Reminder.id == reminder_id, Reminder.user_id.is_(None)).first()
    if not r:
        return jsonify({'error': '提醒不存在或无权限'}), 404
    r.status = 'deleted'
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '删除成功'})


@reminders_bp.route('/api/reminders/<int:reminder_id>/pause', methods=['POST'])
def pause_reminder(reminder_id):
    current_user, access, _ = _get_access_context()
    query = Reminder.query
    r = (query.filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first() if access == 'user'
         else query.filter(Reminder.id == reminder_id, Reminder.user_id.is_(None)).first())
    if not r:
        return jsonify({'error': '提醒不存在或无权限'}), 404
    r.status = 'paused'
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已暂停', 'reminder': r.to_dict()})


@reminders_bp.route('/api/reminders/<int:reminder_id>/resume', methods=['POST'])
def resume_reminder(reminder_id):
    current_user, access, _ = _get_access_context()
    query = Reminder.query
    r = (query.filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first() if access == 'user'
         else query.filter(Reminder.id == reminder_id, Reminder.user_id.is_(None)).first())
    if not r:
        return jsonify({'error': '提醒不存在或无权限'}), 404
    r.status = 'active'
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已恢复', 'reminder': r.to_dict()})


@reminders_bp.route('/api/reminders/due', methods=['GET'])
def get_due_reminders():
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    current_user, access, _ = _get_access_context()
    query = Reminder.query
    query = query.filter(Reminder.status == 'active')
    if access == 'user':
        query = query.filter(Reminder.user_id == current_user.id)
    else:
        query = query.filter(Reminder.user_id.is_(None))

    due = []
    for r in query.all():
        if r.is_due_today(now_utc):
            due.append(r.to_dict())
    return jsonify({'reminders': due, 'count': len(due)})


@reminders_bp.route('/api/reminders/<int:reminder_id>/acknowledge', methods=['POST'])
def acknowledge_reminder(reminder_id):
    current_user, access, _ = _get_access_context()
    query = Reminder.query
    r = (query.filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first() if access == 'user'
         else query.filter(Reminder.id == reminder_id, Reminder.user_id.is_(None)).first())
    if not r:
        return jsonify({'error': '提醒不存在或无权限'}), 404
    r.acknowledge_today()
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已确认', 'reminder': r.to_dict()})

