"""
番茄任务API路由
提供番茄任务的生成、查询和管理功能
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from functools import wraps
import jwt
from app.models.user import User
from app.services.pomodoro_intelligence import PomodoroIntelligenceService
from app.database.init import db
import logging

logger = logging.getLogger(__name__)

def token_required(f):
    """JWT token验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': '无效的token格式'}), 401
        
        if not token:
            return jsonify({'message': '缺少token'}), 401
        
        try:
            from flask import current_app
            data = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': '用户不存在'}), 401
            g.current_user = current_user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '无效的token'}), 401
        except Exception as e:
            return jsonify({'message': f'Token验证失败: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    return decorated

# 创建蓝图
pomodoro_bp = Blueprint('pomodoro', __name__, url_prefix='/api/pomodoro')

@pomodoro_bp.route('/tasks/generate', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def generate_pomodoro_tasks():
    """生成AI番茄任务"""
    try:
        user_id = g.current_user.id
        
        result = PomodoroIntelligenceService.generate_pomodoro_tasks(user_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': {
                    'tasks': result['tasks'],
                    'count': len(result['tasks'])
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f"生成番茄任务失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'生成失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks', methods=['GET', 'OPTIONS'])
@cross_origin()
@token_required
def get_pomodoro_tasks():
    """获取用户的番茄任务列表"""
    try:
        user_id = g.current_user.id
        
        tasks = PomodoroIntelligenceService.get_user_pomodoro_tasks(user_id)
        
        return jsonify({
            'success': True,
            'data': {
                'tasks': tasks,
                'count': len(tasks)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"获取番茄任务失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks/<int:task_id>/start', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def start_pomodoro_task(task_id):
    """开始番茄任务"""
    try:
        user_id = g.current_user.id
        
        result = PomodoroIntelligenceService.update_task_status(
            task_id, user_id, 'start'
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': result['task']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f"开始番茄任务失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'操作失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks/<int:task_id>/complete', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def complete_pomodoro_task(task_id):
    """完成番茄任务"""
    try:
        user_id = g.current_user.id
        
        # 获取专注时间（可选参数，默认25分钟）
        focus_minutes = request.json.get('focus_minutes', 25) if request.json else 25
        
        result = PomodoroIntelligenceService.update_task_status(
            task_id, user_id, 'complete'
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': result['task']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f"完成番茄任务失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'操作失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks/<int:task_id>/skip', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def skip_pomodoro_task(task_id):
    """跳过番茄任务"""
    try:
        user_id = g.current_user.id
        
        result = PomodoroIntelligenceService.update_task_status(
            task_id, user_id, 'skip'
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': result['task']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f"跳过番茄任务失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'操作失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks/<int:task_id>/reset', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def reset_pomodoro_task(task_id):
    """重置番茄任务为未开始状态"""
    try:
        user_id = g.current_user.id

        result = PomodoroIntelligenceService.update_task_status(
            task_id, user_id, 'reset'
        )

        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': result['task']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400

    except Exception as e:
        logger.error(f"重置番茄任务失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'操作失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks/add-single', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def add_single_task_to_pomodoro():
    """将单个任务添加到番茄任务列表"""
    try:
        user_id = g.current_user.id
        
        # 获取请求数据
        data = request.get_json()
        if not data or 'record_id' not in data:
            return jsonify({
                'success': False,
                'message': '缺少record_id参数'
            }), 400
        
        record_id = data['record_id']
        
        result = PomodoroIntelligenceService.add_single_task_to_pomodoro(user_id, record_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'data': result['task']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f"添加任务到番茄列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'添加失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/tasks/<int:task_id>/delete', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@token_required
def delete_pomodoro_task(task_id):
    """删除番茄任务"""
    try:
        user_id = g.current_user.id
        
        # 查找任务
        from app.models.pomodoro_task import PomodoroTask
        task = PomodoroTask.query.filter_by(id=task_id, user_id=user_id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'message': '任务不存在'
            }), 404
        
        # 如果正在运行的任务被删除，停止计时器
        if task.status == 'active':
            task.skip_task()
        
        # 删除任务
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '任务已删除'
        }), 200
        
    except Exception as e:
        logger.error(f"删除番茄任务失败: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'删除失败: {str(e)}'
        }), 500

@pomodoro_bp.route('/stats', methods=['GET', 'OPTIONS'])
@cross_origin()
@token_required
def get_pomodoro_stats():
    """获取番茄钟统计信息"""
    try:
        user_id = g.current_user.id
        
        from app.models.pomodoro_task import PomodoroTask
        from sqlalchemy import func
        
        # 获取统计数据
        stats_query = PomodoroTask.query.filter_by(user_id=user_id)
        
        total_tasks = stats_query.count()
        completed_tasks = stats_query.filter_by(status='completed').count()
        active_tasks = stats_query.filter_by(status='active').count()
        pending_tasks = stats_query.filter_by(status='pending').count()
        skipped_tasks = stats_query.filter_by(status='skipped').count()
        
        # 计算总番茄钟数和专注时间
        totals = stats_query.with_entities(
            func.sum(PomodoroTask.pomodoros_completed).label('total_pomodoros'),
            func.sum(PomodoroTask.total_focus_time).label('total_focus_time')
        ).first()
        
        total_pomodoros = totals.total_pomodoros or 0
        total_focus_time = totals.total_focus_time or 0
        
        # 计算今日数据
        from datetime import datetime, date
        today = date.today()
        today_tasks = stats_query.filter(
            func.date(PomodoroTask.created_at) == today
        )
        
        today_completed = today_tasks.filter_by(status='completed').count()
        today_totals = today_tasks.with_entities(
            func.sum(PomodoroTask.pomodoros_completed).label('today_pomodoros'),
            func.sum(PomodoroTask.total_focus_time).label('today_focus_time')
        ).first()
        
        today_pomodoros = today_totals.today_pomodoros or 0
        today_focus_time = today_totals.today_focus_time or 0
        
        return jsonify({
            'success': True,
            'data': {
                'total_stats': {
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'active_tasks': active_tasks,
                    'pending_tasks': pending_tasks,
                    'skipped_tasks': skipped_tasks,
                    'total_pomodoros': total_pomodoros,
                    'total_focus_time': total_focus_time,
                    'completion_rate': round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0
                },
                'today_stats': {
                    'today_completed_tasks': today_completed,
                    'today_pomodoros': today_pomodoros,
                    'today_focus_time': today_focus_time,
                    'today_focus_hours': round(today_focus_time / 60, 1)
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"获取统计信息失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取失败: {str(e)}'
        }), 500
