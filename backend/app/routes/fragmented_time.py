"""
碎片时间管理路由
提供基于时间上下文的任务推荐API
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import traceback

from app.models.record import Record
from app.routes.auth import token_required
from app.services.fragmented_time_service import FragmentedTimeService
from app.utils.auth_helpers import get_user_for_record_access
from app.utils.response_helpers import create_error_response, create_success_response, debug_log, ErrorCodes

# 创建服务实例
fragmented_time_service = FragmentedTimeService()

fragmented_time_bp = Blueprint('fragmented_time', __name__)


@fragmented_time_bp.route('/api/fragmented-time/analyze-context', methods=['POST'])
def analyze_time_context():
    """分析当前时间上下文，识别碎片时间场景"""
    try:
        data = request.get_json() or {}
        
        # 获取参数
        available_minutes = data.get('available_minutes', 15)
        environment = data.get('environment', 'mobile')
        user_energy = data.get('user_energy', 'medium')
        current_time = datetime.now()
        
        # 验证参数
        if not isinstance(available_minutes, int) or available_minutes <= 0:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'available_minutes必须是正整数',
                method='POST',
                endpoint='/api/fragmented-time/analyze-context'
            )
        
        if environment not in ['mobile', 'desktop', 'offline']:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'environment必须是mobile、desktop或offline之一',
                method='POST',
                endpoint='/api/fragmented-time/analyze-context'
            )
        
        if user_energy not in ['high', 'medium', 'low']:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'user_energy必须是high、medium或low之一',
                method='POST',
                endpoint='/api/fragmented-time/analyze-context'
            )
        
        # 分析时间上下文
        context_analysis = fragmented_time_service.analyze_time_context(
            current_time=current_time,
            available_minutes=available_minutes,
            environment=environment,
            user_energy=user_energy
        )
        
        return create_success_response(
            data=context_analysis,
            message='时间上下文分析完成'
        )
        
    except Exception as e:
        debug_log.error("时间上下文分析失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'时间上下文分析失败: {str(e)}',
            method='POST',
            endpoint='/api/fragmented-time/analyze-context'
        )


@fragmented_time_bp.route('/api/fragmented-time/recommend-tasks', methods=['POST'])
@token_required
def recommend_fragmented_tasks(current_user):
    """基于时间上下文推荐适合的碎片时间任务"""
    try:
        data = request.get_json() or {}
        
        # 获取时间上下文参数
        available_minutes = data.get('available_minutes', 15)
        environment = data.get('environment', 'mobile')
        user_energy = data.get('user_energy', 'medium')
        
        # 分析时间上下文
        time_context = fragmented_time_service.analyze_time_context(
            current_time=datetime.now(),
            available_minutes=available_minutes,
            environment=environment,
            user_energy=user_energy
        )
        
        # 获取用户的活跃任务
        query = Record.query.filter_by(user_id=current_user.id, status='active')
        
        # 按优先级和创建时间排序
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        tasks = query.all()
        
        # 按优先级排序
        tasks.sort(key=lambda x: (
            priority_order.get(x.priority, 1),
            x.created_at
        ), reverse=True)
        
        # 限制任务数量
        tasks = tasks[:20]
        
        # 转换为字典格式
        tasks_data = []
        for task in tasks:
            task_dict = {
                'id': task.id,
                'content': task.content,
                'priority': task.priority,
                'status': task.status,
                'task_type': task.task_type,
                'progress': task.progress,
                'progress_notes': task.progress_notes,
                'estimated_hours': getattr(task, 'estimated_hours', None),
                'created_at': task.created_at.isoformat()
            }
            tasks_data.append(task_dict)
        
        # 生成任务推荐
        recommendations = fragmented_time_service.recommend_fragmented_tasks(
            tasks=tasks_data,
            time_context=time_context
        )
        
        return create_success_response(
            data=recommendations,
            message='碎片时间任务推荐完成'
        )
        
    except Exception as e:
        debug_log.error("碎片时间任务推荐失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'碎片时间任务推荐失败: {str(e)}',
            method='POST',
            endpoint='/api/fragmented-time/recommend-tasks'
        )


@fragmented_time_bp.route('/api/fragmented-time/quick-actions', methods=['GET'])
@token_required
def get_quick_actions(current_user):
    """获取快速行动建议（无需AI分析的预设推荐）"""
    try:
        # 获取查询参数
        available_minutes = int(request.args.get('available_minutes', 15))
        environment = request.args.get('environment', 'mobile')
        
        # 生成快速行动建议
        quick_actions = []
        
        if available_minutes <= 5:
            quick_actions = [
                {
                    "title": "快速任务检查",
                    "description": "查看今日待办任务，确认优先级",
                    "estimated_time": 2,
                    "action_type": "review"
                },
                {
                    "title": "消息快速回复",
                    "description": "回复简单的消息和通知",
                    "estimated_time": 5,
                    "action_type": "communication"
                },
                {
                    "title": "灵感记录",
                    "description": "记录突然想到的想法或创意",
                    "estimated_time": 3,
                    "action_type": "capture"
                }
            ]
        elif available_minutes <= 15:
            quick_actions = [
                {
                    "title": "任务进度更新",
                    "description": "更新现有任务的进展状态",
                    "estimated_time": 10,
                    "action_type": "update"
                },
                {
                    "title": "简单任务处理",
                    "description": "完成一个简单的待办事项",
                    "estimated_time": 15,
                    "action_type": "execution"
                },
                {
                    "title": "学习内容浏览",
                    "description": "阅读一篇短文或观看短视频学习",
                    "estimated_time": 12,
                    "action_type": "learning"
                },
                {
                    "title": "明日计划准备",
                    "description": "为明天的工作做简单规划",
                    "estimated_time": 8,
                    "action_type": "planning"
                }
            ]
        else:
            quick_actions = [
                {
                    "title": "深度任务推进",
                    "description": "专注完成一个重要任务的部分内容",
                    "estimated_time": 25,
                    "action_type": "deep_work"
                },
                {
                    "title": "任务拆解规划",
                    "description": "将复杂任务分解为可执行的子任务",
                    "estimated_time": 20,
                    "action_type": "planning"
                },
                {
                    "title": "技能学习实践",
                    "description": "进行一次完整的技能学习或练习",
                    "estimated_time": 30,
                    "action_type": "learning"
                },
                {
                    "title": "项目进度回顾",
                    "description": "回顾项目进展，调整后续计划",
                    "estimated_time": 18,
                    "action_type": "review"
                }
            ]
        
        # 根据环境调整建议
        if environment == 'offline':
            quick_actions = [action for action in quick_actions 
                           if action['action_type'] in ['planning', 'review', 'capture']]
        
        return create_success_response(
            data={
                "quick_actions": quick_actions,
                "context": {
                    "available_minutes": available_minutes,
                    "environment": environment,
                    "total_suggestions": len(quick_actions)
                }
            },
            message='快速行动建议获取成功'
        )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'available_minutes必须是有效的整数',
            method='GET',
            endpoint='/api/fragmented-time/quick-actions'
        )
    except Exception as e:
        debug_log.error("获取快速行动建议失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'获取快速行动建议失败: {str(e)}',
            method='GET',
            endpoint='/api/fragmented-time/quick-actions'
        )


@fragmented_time_bp.route('/api/fragmented-time/time-contexts', methods=['GET'])
def get_time_contexts():
    """获取所有可用的时间上下文类型"""
    try:
        contexts = [
            {
                "id": "morning_commute",
                "name": "早晨通勤",
                "description": "上班路上的时间",
                "typical_duration": "15-45分钟",
                "optimal_activities": ["音频学习", "新闻浏览", "日程回顾"]
            },
            {
                "id": "lunch_break",
                "name": "午休时间", 
                "description": "午餐后的休息时间",
                "typical_duration": "30-60分钟",
                "optimal_activities": ["轻松学习", "任务规划", "创意思考"]
            },
            {
                "id": "evening_commute",
                "name": "晚间通勤",
                "description": "下班回家的路上",
                "typical_duration": "15-45分钟", 
                "optimal_activities": ["播客收听", "日程总结", "明日准备"]
            },
            {
                "id": "waiting_time",
                "name": "等待时间",
                "description": "各种等待场景",
                "typical_duration": "5-30分钟",
                "optimal_activities": ["快速任务", "消息处理", "灵感记录"]
            },
            {
                "id": "meeting_break",
                "name": "会议间隙",
                "description": "会议之间的空隙时间",
                "typical_duration": "10-20分钟",
                "optimal_activities": ["邮件检查", "任务更新", "准备工作"]
            },
            {
                "id": "before_sleep",
                "name": "睡前时间",
                "description": "睡觉前的放松时间",
                "typical_duration": "20-60分钟",
                "optimal_activities": ["轻松阅读", "反思总结", "冥想练习"]
            },
            {
                "id": "weekend_leisure",
                "name": "周末休闲",
                "description": "周末的自由时间",
                "typical_duration": "30-120分钟",
                "optimal_activities": ["深度学习", "创意项目", "技能提升"]
            }
        ]
        
        return create_success_response(
            data={"time_contexts": contexts},
            message='时间上下文类型获取成功'
        )
        
    except Exception as e:
        debug_log.error("获取时间上下文失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'获取时间上下文失败: {str(e)}',
            method='GET',
            endpoint='/api/fragmented-time/time-contexts'
        )
