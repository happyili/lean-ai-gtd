"""
番茄钟智能服务 - AI生成高效番茄任务
基于用户的未完成任务生成最值得完成的top5番茄任务
"""

import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.record import Record
from app.models.pomodoro_task import PomodoroTask
from app.database import db
from app.utils.openrouter_utils import query_openrouter

logger = logging.getLogger(__name__)

class PomodoroIntelligenceService:
    """番茄钟AI智能服务"""
    
    # 高效工作法提示词模板
    POMODORO_SYSTEM_PROMPT = """你是一位高效工作专家，专门帮助用户通过番茄工作法提升工作效率。

工作原则：
1. 专注于最重要且紧急的任务
2. 将复杂任务分解为可在25分钟内完成的小任务
3. 优先处理有明确产出的任务
4. 考虑任务之间的依赖关系
5. 平衡不同类型的工作避免疲劳

你的任务是从用户的待办任务中选择并生成5个最值得在今天完成的番茄任务。

输出格式要求（严格按照JSON格式）：
{
  "pomodoro_tasks": [
    {
      "title": "简短清晰的任务标题（不超过50字）",
      "description": "任务的详细描述和执行要点（100-200字）",
      "related_task_ids": [原始任务ID列表],
      "priority_score": 优先级分数(1-100),
      "estimated_pomodoros": 预估需要的番茄钟数(1-4),
      "ai_reasoning": "选择此任务的原因和执行建议（50-100字）"
    }
  ]
}"""

    USER_PROMPT_TEMPLATE = """基于以下待办任务信息，请生成5个最值得今天完成的番茄任务：

## 待办任务列表（按优先级排序）：
{tasks_context}

## 当前时间：{current_time}

请分析这些任务的重要性、紧急程度、依赖关系和可执行性，生成5个最优的番茄任务。
每个番茄任务应该：
- 可在25分钟内有明显进展
- 有清晰的执行目标
- 符合高效工作原则

请严格按照JSON格式输出。"""

    @classmethod
    def generate_pomodoro_tasks(cls, user_id: int) -> Dict[str, Any]:
        """
        为用户生成番茄任务
        
        Args:
            user_id: 用户ID
            
        Returns:
            Dict containing success status and generated tasks or error message
        """
        try:
            logger.info(f"开始为用户 {user_id} 生成番茄任务")
            
            # 1. 获取用户的top10未完成任务
            top_tasks = cls._get_user_top_tasks(user_id)
            
            if not top_tasks:
                return {
                    'success': False,
                    'message': '没有找到待办任务，请先创建一些任务',
                    'tasks': []
                }
            
            # 2. 构建任务上下文
            tasks_context = cls._build_tasks_context(top_tasks)
            
            # 3. 调用AI生成番茄任务
            ai_response = cls._call_ai_for_pomodoro_tasks(tasks_context)
            
            if not ai_response['success']:
                return ai_response
            
            # 4. 解析AI响应
            pomodoro_tasks_data = cls._parse_ai_response(ai_response['response'])
            
            if not pomodoro_tasks_data:
                return {
                    'success': False,
                    'message': 'AI响应解析失败，请重试',
                    'tasks': []
                }
            
            # 5. 清除用户之前的番茄任务
            PomodoroTask.clear_user_tasks(user_id)
            
            # 6. 创建新的番茄任务
            created_tasks = cls._create_pomodoro_tasks(user_id, pomodoro_tasks_data, tasks_context)
            
            logger.info(f"成功为用户 {user_id} 生成了 {len(created_tasks)} 个番茄任务")
            
            return {
                'success': True,
                'message': f'成功生成{len(created_tasks)}个番茄任务',
                'tasks': [task.to_dict() for task in created_tasks]
            }
            
        except Exception as e:
            logger.error(f"生成番茄任务失败: {str(e)}")
            return {
                'success': False,
                'message': f'生成番茄任务失败: {str(e)}',
                'tasks': []
            }
    
    @classmethod
    def _get_user_top_tasks(cls, user_id: int) -> List[Record]:
        """获取用户的top10未完成任务"""
        # 定义优先级排序
        priority_order = db.case(
            (Record.priority == 'urgent', 1),
            (Record.priority == 'high', 2),
            (Record.priority == 'medium', 3),
            (Record.priority == 'low', 4),
            else_=5
        )
        
        return Record.query.filter(
            Record.user_id == user_id,
            Record.status.in_(['active']),  # 只要活跃状态的任务
            Record.category == 'task'  # 只要任务类型
        ).order_by(
            priority_order.asc(),  # 先按优先级排序
            Record.created_at.asc()  # 再按创建时间排序
        ).limit(10).all()
    
    @classmethod
    def _build_tasks_context(cls, tasks: List[Record]) -> str:
        """构建任务上下文字符串"""
        context_parts = []
        
        for i, task in enumerate(tasks, 1):
            # 获取子任务信息
            subtasks = task.get_subtasks()
            subtask_info = ""
            if subtasks:
                subtask_list = [f"- {st.content}" for st in subtasks[:3]]  # 最多显示3个子任务
                if len(subtasks) > 3:
                    subtask_list.append(f"- ...等{len(subtasks) - 3}个子任务")
                subtask_info = f"\n  子任务:\n  " + "\n  ".join(subtask_list)
            
            context = f"""
{i}. 【{task.priority.upper()}】{task.content}
   任务类型: {task.task_type}
   进度: {task.progress}%
   创建时间: {task.created_at.strftime('%Y-%m-%d %H:%M')}
   进展记录: {task.progress_notes or '无'}{subtask_info}
"""
            context_parts.append(context)
        
        return "\n".join(context_parts)
    
    @classmethod
    def _call_ai_for_pomodoro_tasks(cls, tasks_context: str) -> Dict[str, Any]:
        """调用AI生成番茄任务"""
        try:
            user_prompt = cls.USER_PROMPT_TEMPLATE.format(
                tasks_context=tasks_context,
                current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            )
            
            # 组合系统提示词和用户提示词
            full_prompt = f"{cls.POMODORO_SYSTEM_PROMPT}\n\nUser: {user_prompt}"
            
            response = query_openrouter(
                model="anthropic/claude-3.5-sonnet",
                prompt=full_prompt
            )
            
            if response:
                return {
                    'success': True,
                    'response': response
                }
            else:
                return {
                    'success': False,
                    'message': 'AI调用失败: 空响应'
                }
                
        except Exception as e:
            logger.error(f"AI调用异常: {str(e)}")
            return {
                'success': False,
                'message': f'AI调用异常: {str(e)}'
            }
    
    @classmethod
    def _parse_ai_response(cls, ai_response: str) -> Optional[List[Dict]]:
        """解析AI响应"""
        try:
            # 尝试从响应中提取JSON
            start_idx = ai_response.find('{')
            end_idx = ai_response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                logger.error("AI响应中没有找到JSON格式")
                return None
            
            json_str = ai_response[start_idx:end_idx]
            data = json.loads(json_str)
            
            pomodoro_tasks = data.get('pomodoro_tasks', [])
            
            # 验证数据格式
            if not isinstance(pomodoro_tasks, list) or len(pomodoro_tasks) == 0:
                logger.error("AI响应格式不正确：pomodoro_tasks不是有效列表")
                return None
            
            # 验证每个任务的必需字段
            required_fields = ['title', 'description', 'priority_score', 'estimated_pomodoros']
            for task in pomodoro_tasks:
                for field in required_fields:
                    if field not in task:
                        logger.error(f"任务缺少必需字段: {field}")
                        return None
            
            # 只保留前5个任务
            return pomodoro_tasks[:5]
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析错误: {str(e)}")
            logger.error(f"AI响应内容: {ai_response}")
            return None
        except Exception as e:
            logger.error(f"响应解析异常: {str(e)}")
            return None
    
    @classmethod
    def _create_pomodoro_tasks(cls, user_id: int, tasks_data: List[Dict], 
                             original_context: str) -> List[PomodoroTask]:
        """创建番茄任务实例"""
        created_tasks = []
        
        try:
            for i, task_data in enumerate(tasks_data, 1):
                # 处理related_task_ids
                related_task_ids = task_data.get('related_task_ids', [])
                if isinstance(related_task_ids, list):
                    related_task_ids_json = json.dumps(related_task_ids)
                else:
                    related_task_ids_json = None
                
                # 创建番茄任务
                pomodoro_task = PomodoroTask(
                    user_id=user_id,
                    title=task_data.get('title', ''),
                    description=task_data.get('description', ''),
                    related_task_ids=related_task_ids_json,
                    priority_score=int(task_data.get('priority_score', 50)),
                    estimated_pomodoros=max(1, min(4, int(task_data.get('estimated_pomodoros', 1)))),
                    order_index=i,
                    generation_context=original_context,
                    ai_reasoning=task_data.get('ai_reasoning', '')
                )
                
                db.session.add(pomodoro_task)
                created_tasks.append(pomodoro_task)
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"创建番茄任务失败: {str(e)}")
            db.session.rollback()
            raise e
        
        return created_tasks
    
    @classmethod
    def get_user_pomodoro_tasks(cls, user_id: int) -> List[Dict]:
        """获取用户的番茄任务"""
        tasks = PomodoroTask.get_user_current_tasks(user_id)
        return [task.to_dict() for task in tasks]
    
    @classmethod
    def add_single_task_to_pomodoro(cls, user_id: int, record_id: int) -> Dict[str, Any]:
        """
        将单个任务添加到番茄任务列表
        
        Args:
            user_id: 用户ID
            record_id: 任务记录ID
            
        Returns:
            Dict containing success status and created pomodoro task or error message
        """
        try:
            logger.info(f"将任务 {record_id} 添加到用户 {user_id} 的番茄任务列表")
            
            # 1. 获取原始任务
            record = Record.query.filter_by(id=record_id, user_id=user_id).first()
            if not record:
                return {
                    'success': False,
                    'message': '任务不存在或无权限访问'
                }
            
            # # 2. 检查是否已经是番茄任务
            # existing_pomodoro = PomodoroTask.query.filter(
            #     PomodoroTask.user_id == user_id,
            #     PomodoroTask.related_task_ids.contains(str(record_id))
            # ).first()
            
            # if existing_pomodoro:
            #     return {
            #         'success': False,
            #         'message': '该任务已经在番茄任务列表中'
            #     }
            
            # 3. 停止当前正在运行的任务
            active_task = PomodoroTask.query.filter_by(
                user_id=user_id, 
                status='active'
            ).first()
            
            if active_task:
                active_task.skip_task()
                logger.info(f"停止当前活跃任务 {active_task.id}")
            
            # 4. 创建番茄任务，设置order_index为0（最前面）
            pomodoro_task = PomodoroTask(
                user_id=user_id,
                title=record.content[:50] + ('...' if len(record.content) > 50 else ''),  # 限制标题长度
                description=f"基于任务: {record.content}\n\n优先级: {record.priority or 'medium'}\n任务类型: {record.task_type or 'work'}",
                related_task_ids=json.dumps([record_id]),
                priority_score=cls._calculate_priority_score(record.priority),
                estimated_pomodoros=1,  # 默认1个番茄钟
                order_index=0,  # 设置为0，排在最前面
                generation_context=f"手动添加的任务: {record.content}",
                ai_reasoning=f"用户手动选择的任务，优先级: {record.priority or 'medium'}"
            )
            
            db.session.add(pomodoro_task)
            db.session.flush()  # 获取ID
            
            # 5. 自动开始新任务
            pomodoro_task.start_pomodoro()
            
            # 6. 更新其他任务的order_index，为新任务让出位置
            PomodoroTask.query.filter(
                PomodoroTask.user_id == user_id,
                PomodoroTask.id != pomodoro_task.id
            ).update({PomodoroTask.order_index: PomodoroTask.order_index + 1})
            
            db.session.commit()
            
            logger.info(f"成功将任务 {record_id} 添加到用户 {user_id} 的番茄任务列表并自动开始")
            
            return {
                'success': True,
                'message': '任务已添加到番茄任务列表并自动开始',
                'task': pomodoro_task.to_dict()
            }
            
        except Exception as e:
            logger.error(f"添加任务到番茄列表失败: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'message': f'添加失败: {str(e)}'
            }
    
    @classmethod
    def _calculate_priority_score(cls, priority: str) -> int:
        """根据任务优先级计算分数"""
        priority_scores = {
            'urgent': 90,
            'high': 75,
            'medium': 50,
            'low': 25
        }
        return priority_scores.get(priority, 50)
    
    @classmethod
    def update_task_status(cls, task_id: int, user_id: int, action: str) -> Dict[str, Any]:
        """更新番茄任务状态"""
        try:
            task = PomodoroTask.query.filter_by(id=task_id, user_id=user_id).first()
            
            if not task:
                return {'success': False, 'message': '任务不存在'}
            
            if action == 'start':
                success = task.start_pomodoro()
            elif action == 'complete':
                success = task.complete_pomodoro()
            elif action == 'skip':
                success = task.skip_task()
            elif action == 'reset':
                success = task.reset_task()
            else:
                return {'success': False, 'message': '无效的操作'}
            
            if success:
                db.session.commit()
                return {
                    'success': True,
                    'message': '状态更新成功',
                    'task': task.to_dict()
                }
            else:
                return {'success': False, 'message': '状态更新失败'}
                
        except Exception as e:
            logger.error(f"更新任务状态失败: {str(e)}")
            db.session.rollback()
            return {'success': False, 'message': f'更新失败: {str(e)}'}
