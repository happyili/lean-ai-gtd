from flask import Blueprint, jsonify, request
from app.models.record import Record
from app.models.user import User
from app.routes.auth import token_required
from app.services.ai_intelligence import AIIntelligenceService
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, and_, or_
import json

weekly_report_bp = Blueprint('weekly_report', __name__)

def ensure_timezone_aware(dt):
    """确保datetime对象有时区信息"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def generate_basic_summary(completed_tasks, new_tasks):
    """生成基础的任务总结（不依赖AI）"""
    summary_parts = []
    
    # 完成事项总结
    if completed_tasks:
        completed_summary = "**本周完成事项：**\n"
        completed_items = []
        for task in completed_tasks:
            content = task['content']
            if task.get('subtask_count', 0) > 0:
                completed_items.append(f"完成了「{content}」（包含{task['subtask_count']}个子任务）")
            else:
                completed_items.append(f"完成了「{content}」")
        
        if len(completed_items) == 1:
            completed_summary += completed_items[0] + "。"
        else:
            completed_summary += "、".join(completed_items) + "。"
        summary_parts.append(completed_summary)
    else:
        summary_parts.append("**本周完成事项：**\n无")
    
    # 新启动事项总结
    if new_tasks:
        new_summary = "**本周启动事项：**\n"
        # 按优先级排序
        priority_order = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}
        sorted_tasks = sorted(new_tasks, key=lambda x: priority_order.get(x.get('priority', 'medium'), 2))
        
        new_items = []
        for task in sorted_tasks:
            content = task['content']
            priority = task.get('priority', 'medium')
            task_type = task.get('task_type', 'work')
            
            if priority in ['urgent', 'high']:
                new_items.append(f"启动了高优先级任务「{content}」")
            else:
                new_items.append(f"启动了「{content}」")
        
        if len(new_items) == 1:
            new_summary += new_items[0] + "。"
        else:
            new_summary += "、".join(new_items) + "。"
        summary_parts.append(new_summary)
    else:
        summary_parts.append("**本周启动事项：**\n无")
    
    return "\n\n".join(summary_parts)

@weekly_report_bp.route('/api/weekly-report', methods=['GET'])
@token_required
def get_weekly_report(current_user):
    """获取周报数据
    
    查询参数:
    - task_type: 任务类型过滤 (work/hobby/life)
    - week_offset: 周偏移量，0=本周，-1=上周，1=下周
    """
    try:
        # 获取查询参数
        task_type = request.args.get('task_type', 'all')
        week_offset = int(request.args.get('week_offset', 0))
        
        # 计算周的开始和结束时间
        now = datetime.now(timezone.utc)
        # 获取本周一
        current_monday = now - timedelta(days=now.weekday())
        current_monday = current_monday.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 根据偏移量计算目标周
        target_monday = current_monday + timedelta(weeks=week_offset)
        target_sunday = target_monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        # 构建基础查询
        base_query = Record.query.filter(
            Record.user_id == current_user.id,
            Record.status != 'deleted'
        )
        
        # 添加任务类型过滤
        if task_type != 'all':
            base_query = base_query.filter(Record.task_type == task_type)
        
        # 1. 获取本周新增任务
        new_tasks_query = base_query.filter(
            Record.created_at >= target_monday,
            Record.created_at <= target_sunday,
            Record.category == 'task'
        )
        new_tasks = new_tasks_query.all()
        
        # 2. 获取本周完成的任务
        completed_tasks_query = base_query.filter(
            Record.updated_at >= target_monday,
            Record.updated_at <= target_sunday,
            Record.status == 'completed',
            Record.category == 'task'
        )
        completed_tasks = completed_tasks_query.all()
        
        # 3. 获取本周状态变更的任务（除了新增和完成）
        status_changed_tasks_query = base_query.filter(
            Record.updated_at >= target_monday,
            Record.updated_at <= target_sunday,
            Record.category == 'task',
            Record.status.in_(['active', 'paused', 'cancelled', 'archived'])
        ).filter(
            # 排除本周新增的任务
            Record.created_at < target_monday
        )
        status_changed_tasks = status_changed_tasks_query.all()
        
        # 4. 获取本周删除的任务
        deleted_tasks_query = base_query.filter(
            Record.updated_at >= target_monday,
            Record.updated_at <= target_sunday,
            Record.status == 'deleted',
            Record.category == 'task'
        )
        deleted_tasks = deleted_tasks_query.all()
        
        # 5. 分析高优先级任务的进展情况
        high_priority_tasks = base_query.filter(
            Record.priority.in_(['high', 'urgent']),
            Record.category == 'task',
            Record.status.in_(['active', 'paused'])
        ).all()
        
        # 找出长期没有进展的高优先级任务
        stagnant_high_priority = []
        for task in high_priority_tasks:
            # 确保task.updated_at有时区信息
            task_updated_at = ensure_timezone_aware(task.updated_at)
            
            # 如果任务超过7天没有更新，认为是停滞的
            days_since_update = (now - task_updated_at).days
            if days_since_update > 7:
                stagnant_high_priority.append({
                    'task': task.to_dict(include_subtasks=True),
                    'days_stagnant': days_since_update
                })
        
        # 6. 统计任务变更频率（用于判断规划合理性）
        frequent_changes = []
        for task in new_tasks + status_changed_tasks + deleted_tasks:
            # 统计该任务的历史变更次数
            task_history = Record.query.filter(
                Record.id == task.id,
                Record.user_id == current_user.id
            ).first()
            
            if task_history:
                # 确保task_history.created_at有时区信息
                task_created_at = ensure_timezone_aware(task_history.created_at)
                
                # 简单的变更频率计算：如果任务在短时间内多次变更状态
                creation_to_now = (now - task_created_at).days
                if creation_to_now >= 0:  # 修改条件，允许当天创建的任务
                    # 如果任务创建后很快就被删除或多次变更，标记为频繁变更
                    if (task.status == 'deleted' and creation_to_now <= 3) or \
                       (task in status_changed_tasks and creation_to_now <= 7):
                        frequent_changes.append(task.to_dict(include_subtasks=True))
        
        # 构建响应数据
        report_data = {
            'week_info': {
                'start_date': target_monday.isoformat(),
                'end_date': target_sunday.isoformat(),
                'week_offset': week_offset,
                'is_current_week': week_offset == 0
            },
            'task_type_filter': task_type,
            'new_tasks': [task.to_dict(include_subtasks=True) for task in new_tasks],
            'completed_tasks': [task.to_dict(include_subtasks=True) for task in completed_tasks],
            'status_changed_tasks': [task.to_dict(include_subtasks=True) for task in status_changed_tasks],
            'deleted_tasks': [task.to_dict(include_subtasks=True) for task in deleted_tasks],
            'stagnant_high_priority': stagnant_high_priority,
            'frequent_changes': frequent_changes,
            'summary': {
                'total_new': len(new_tasks),
                'total_completed': len(completed_tasks),
                'total_status_changed': len(status_changed_tasks),
                'total_deleted': len(deleted_tasks),
                'stagnant_high_priority_count': len(stagnant_high_priority),
                'frequent_changes_count': len(frequent_changes)
            }
        }
        
        return jsonify({
            'success': True,
            'data': report_data
        })
        
    except Exception as e:
        print(f"获取周报数据失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'获取周报数据失败: {str(e)}'
        }), 500

@weekly_report_bp.route('/api/weekly-report/task-summary', methods=['POST'])
@token_required
def generate_task_summary(current_user):
    """生成任务总结
    
    请求体:
    - report_data: 周报数据
    """
    try:
        data = request.get_json()
        if not data or 'report_data' not in data:
            return jsonify({
                'success': False,
                'error': '缺少周报数据'
            }), 400
        
        report_data = data['report_data']
        
        # 构建任务总结的提示词
        completed_tasks_info = []
        new_tasks_info = []
        
        # 分析完成的任务，包括父子任务关系
        for task in report_data['completed_tasks']:
            task_info = {
                'content': task['content'],
                'subtasks': task.get('subtasks', []),
                'subtask_count': task.get('subtask_count', 0)
            }
            completed_tasks_info.append(task_info)
        
        # 分析新增的任务
        for task in report_data['new_tasks']:
            task_info = {
                'content': task['content'],
                'task_type': task.get('task_type', 'work'),
                'priority': task.get('priority', 'medium'),
                'subtasks': task.get('subtasks', []),
                'subtask_count': task.get('subtask_count', 0)
            }
            new_tasks_info.append(task_info)
        
        # 构建AI提示词
        prompt = f"""
请基于以下数据生成简洁的任务总结，要求：

1. 用最精练的文字，不浮夸
2. 考虑父子任务关系
3. 分为两个部分：完成事项总结 和 新启动事项总结

## 本周完成的任务数据：
{json.dumps(completed_tasks_info, ensure_ascii=False, indent=2)}

## 本周新增的任务数据：
{json.dumps(new_tasks_info, ensure_ascii=False, indent=2)}

请按以下格式输出：

**本周完成事项：**
[用1-3句话总结完成的任务，如有子任务要体现父子关系和进度]

**本周启动事项：**
[用1-3句话总结新启动的任务，按重要程度排序]

要求：
- 文字简洁，避免冗余
- 体现任务间的逻辑关系
- 如果没有相关任务，直接说"无"
- 不要使用过于正式或浮夸的表达
"""
        
        # 调用AI服务
        try:
            from app.utils.openrouter_utils import query_openrouter
            ai_response = query_openrouter(prompt)
            
            return jsonify({
                'success': True,
                'task_summary': ai_response
            })
        except Exception as ai_error:
            print(f"AI服务调用失败: {str(ai_error)}")
            # 提供基础的任务总结作为fallback
            fallback_summary = generate_basic_summary(completed_tasks_info, new_tasks_info)
            return jsonify({
                'success': True,
                'task_summary': fallback_summary
            })
        
    except Exception as e:
        print(f"生成任务总结失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'生成任务总结失败: {str(e)}'
        }), 500

@weekly_report_bp.route('/api/weekly-report/ai-analysis', methods=['POST'])
@token_required
def generate_weekly_ai_analysis(current_user):
    """生成周报的AI分析
    
    请求体:
    - report_data: 周报数据
    - custom_context: 用户自定义上下文
    """
    try:
        data = request.get_json()
        if not data or 'report_data' not in data:
            return jsonify({
                'success': False,
                'error': '缺少周报数据'
            }), 400
        
        report_data = data['report_data']
        custom_context = data.get('custom_context', '')
        
        # 构建AI分析的提示词
        prompt = f"""
请基于以下周报数据，生成一份深度分析报告：

## 周报数据概览
- 时间范围: {report_data['week_info']['start_date']} 至 {report_data['week_info']['end_date']}
- 任务类型: {report_data['task_type_filter']}
- 新增任务: {report_data['summary']['total_new']}个
- 完成任务: {report_data['summary']['total_completed']}个
- 状态变更: {report_data['summary']['total_status_changed']}个
- 删除任务: {report_data['summary']['total_deleted']}个
- 停滞高优任务: {report_data['summary']['stagnant_high_priority_count']}个
- 频繁变更任务: {report_data['summary']['frequent_changes_count']}个

## 详细任务数据
### 新增任务:
{json.dumps([task['content'] for task in report_data['new_tasks']], ensure_ascii=False, indent=2)}

### 完成任务:
{json.dumps([task['content'] for task in report_data['completed_tasks']], ensure_ascii=False, indent=2)}

### 停滞的高优先级任务:
{json.dumps([item['task']['content'] + f" (停滞{item['days_stagnant']}天)" for item in report_data['stagnant_high_priority']], ensure_ascii=False, indent=2)}

### 频繁变更任务:
{json.dumps([task['content'] for task in report_data['frequent_changes']], ensure_ascii=False, indent=2)}

{'## 用户补充上下文' + chr(10) + custom_context if custom_context else ""}

请提供以下分析：

1. **执行效率分析**：
   - 任务完成率和执行质量评估
   - 新增vs完成的比例分析
   - 工作节奏和负载评估

2. **规划合理性分析**：
   - 频繁变更任务的原因分析
   - 任务删除模式的合理性评估
   - 规划稳定性建议

3. **优先级管理分析**：
   - 高优先级任务的执行情况
   - 停滞任务的影响分析
   - 优先级调整建议

4. **行动建议**：
   - 针对停滞任务的具体解决方案
   - 规划改进建议
   - 下周重点关注事项

请用中文回答，内容要具体、可操作，避免空泛的建议。
"""
        
        # 调用AI服务
        ai_service = AIIntelligenceService()
        analysis_result = ai_service.analyze_with_openrouter(
            prompt=prompt,
            context="周报AI分析",
            max_tokens=2000
        )
        
        if not analysis_result['success']:
            return jsonify({
                'success': False,
                'error': f'AI分析失败: {analysis_result["error"]}'
            }), 500
        
        return jsonify({
            'success': True,
            'ai_analysis': analysis_result['analysis']
        })
        
    except Exception as e:
        print(f"生成周报AI分析失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'生成周报AI分析失败: {str(e)}'
        }), 500
