"""
碎片时间利用服务
基于时间段、环境和任务特性提供智能任务推荐
"""

import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, time
from enum import Enum

from app.utils.openrouter_utils import query_openrouter

logger = logging.getLogger(__name__)


class TimeContext(Enum):
    """时间上下文枚举"""
    MORNING_COMMUTE = "morning_commute"      # 早晨通勤
    LUNCH_BREAK = "lunch_break"              # 午休时间
    EVENING_COMMUTE = "evening_commute"      # 晚间通勤
    WAITING_TIME = "waiting_time"            # 等待时间
    MEETING_BREAK = "meeting_break"          # 会议间隙
    BEFORE_SLEEP = "before_sleep"            # 睡前时间
    WEEKEND_LEISURE = "weekend_leisure"      # 周末休闲
    CUSTOM = "custom"                        # 自定义场景


class TaskDifficulty(Enum):
    """任务难度枚举"""
    LIGHT = "light"      # 轻度 - 5-10分钟
    MEDIUM = "medium"    # 中度 - 10-25分钟
    HEAVY = "heavy"      # 重度 - 25分钟以上


class FragmentedTimeService:
    """碎片时间利用服务类"""
        
    def analyze_time_context(self, current_time: datetime, available_minutes: int, 
                           environment: str = "mobile", user_energy: str = "medium") -> Dict:
        """
        分析当前时间上下文，识别碎片时间场景
        
        Args:
            current_time: 当前时间
            available_minutes: 可用时间（分钟）
            environment: 环境类型 (mobile/desktop/offline)
            user_energy: 用户精力水平 (high/medium/low)
            
        Returns:
            时间上下文分析结果
        """
        try:
            # 识别时间场景
            time_context = self._identify_time_context(current_time)
            
            # 确定任务难度级别
            difficulty_level = self._determine_difficulty_level(available_minutes, user_energy)
            
            # 生成场景分析
            context_analysis = {
                "time_context": time_context.value,
                "available_minutes": available_minutes,
                "difficulty_level": difficulty_level.value,
                "environment": environment,
                "user_energy": user_energy,
                "optimal_task_types": self._get_optimal_task_types(time_context, difficulty_level, environment),
                "focus_recommendations": self._get_focus_recommendations(time_context, user_energy),
                "productivity_tips": self._get_productivity_tips(time_context, available_minutes)
            }
            
            return context_analysis
            
        except Exception as e:
            logger.error(f"时间上下文分析失败: {str(e)}")
            return self._get_fallback_context()
    
    def recommend_fragmented_tasks(self, tasks: List[Dict], time_context: Dict) -> Dict:
        """
        基于时间上下文推荐适合的碎片时间任务
        
        Args:
            tasks: 用户任务列表
            time_context: 时间上下文信息
            
        Returns:
            任务推荐结果
        """
        try:
            # 构建推荐提示词
            prompt = self._build_recommendation_prompt(tasks, time_context)
            
            # 调用AI生成推荐
            response = query_openrouter(prompt)
            # 解析推荐结果
            recommendations = self._parse_recommendation_response(response)
            
            return {
                "success": True,
                "recommendations": recommendations,
                "context": time_context
            }
            
        except Exception as e:
            logger.error(f"碎片时间任务推荐失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "recommendations": self._get_fallback_recommendations(time_context)
            }
    
    def _identify_time_context(self, current_time: datetime) -> TimeContext:
        """识别时间上下文"""
        hour = current_time.hour
        weekday = current_time.weekday()  # 0=Monday, 6=Sunday
        
        # 工作日判断
        if weekday < 5:  # 周一到周五
            if 7 <= hour <= 9:
                return TimeContext.MORNING_COMMUTE
            elif 12 <= hour <= 14:
                return TimeContext.LUNCH_BREAK
            elif 17 <= hour <= 19:
                return TimeContext.EVENING_COMMUTE
            elif 21 <= hour <= 23:
                return TimeContext.BEFORE_SLEEP
            else:
                return TimeContext.WAITING_TIME
        else:  # 周末
            if 21 <= hour <= 23:
                return TimeContext.BEFORE_SLEEP
            else:
                return TimeContext.WEEKEND_LEISURE
    
    def _determine_difficulty_level(self, available_minutes: int, user_energy: str) -> TaskDifficulty:
        """确定任务难度级别"""
        if available_minutes <= 10:
            return TaskDifficulty.LIGHT
        elif available_minutes <= 25:
            if user_energy == "high":
                return TaskDifficulty.MEDIUM
            else:
                return TaskDifficulty.LIGHT
        else:
            if user_energy == "low":
                return TaskDifficulty.LIGHT
            elif user_energy == "medium":
                return TaskDifficulty.MEDIUM
            else:
                return TaskDifficulty.HEAVY
    
    def _get_optimal_task_types(self, context: TimeContext, difficulty: TaskDifficulty, environment: str) -> List[str]:
        """获取最适合的任务类型"""
        task_type_mapping = {
            TimeContext.MORNING_COMMUTE: {
                TaskDifficulty.LIGHT: ["阅读", "音频学习", "计划回顾"],
                TaskDifficulty.MEDIUM: ["邮件处理", "学习笔记", "任务规划"],
                TaskDifficulty.HEAVY: ["深度阅读", "在线课程", "项目规划"]
            },
            TimeContext.LUNCH_BREAK: {
                TaskDifficulty.LIGHT: ["轻松阅读", "社交互动", "放松练习"],
                TaskDifficulty.MEDIUM: ["技能学习", "创意思考", "问题解决"],
                TaskDifficulty.HEAVY: ["项目推进", "深度学习", "复杂分析"]
            },
            TimeContext.EVENING_COMMUTE: {
                TaskDifficulty.LIGHT: ["音乐放松", "简单阅读", "日程回顾"],
                TaskDifficulty.MEDIUM: ["播客学习", "思维整理", "明日计划"],
                TaskDifficulty.HEAVY: ["在线学习", "工作总结", "技能提升"]
            },
            TimeContext.WAITING_TIME: {
                TaskDifficulty.LIGHT: ["快速阅读", "消息回复", "灵感记录"],
                TaskDifficulty.MEDIUM: ["任务处理", "学习复习", "创意构思"],
                TaskDifficulty.HEAVY: ["项目工作", "深度思考", "技能练习"]
            },
            TimeContext.BEFORE_SLEEP: {
                TaskDifficulty.LIGHT: ["轻松阅读", "冥想练习", "日记记录"],
                TaskDifficulty.MEDIUM: ["反思总结", "明日规划", "知识回顾"],
                TaskDifficulty.HEAVY: ["学习巩固", "项目思考", "创意整理"]
            },
            TimeContext.WEEKEND_LEISURE: {
                TaskDifficulty.LIGHT: ["兴趣阅读", "休闲学习", "生活规划"],
                TaskDifficulty.MEDIUM: ["技能提升", "项目推进", "创意实践"],
                TaskDifficulty.HEAVY: ["深度学习", "重要项目", "系统思考"]
            }
        }
        
        return task_type_mapping.get(context, {}).get(difficulty, ["通用任务"])
    
    def _get_focus_recommendations(self, context: TimeContext, user_energy: str) -> List[str]:
        """获取专注建议"""
        focus_mapping = {
            TimeContext.MORNING_COMMUTE: [
                "利用通勤时间进行被动学习",
                "避免需要大量交互的任务",
                "准备一天的工作计划"
            ],
            TimeContext.LUNCH_BREAK: [
                "在放松和工作之间找平衡",
                "选择能快速切换状态的任务",
                "避免过于消耗精力的工作"
            ],
            TimeContext.EVENING_COMMUTE: [
                "利用时间进行知识消化",
                "为第二天做准备",
                "选择不需要高度集中的任务"
            ],
            TimeContext.WAITING_TIME: [
                "准备可随时中断的任务",
                "利用零散时间处理简单事务",
                "保持任务的灵活性"
            ],
            TimeContext.BEFORE_SLEEP: [
                "选择有助于放松的活动",
                "避免过于刺激的内容",
                "为良好睡眠做准备"
            ]
        }
        
        base_recommendations = focus_mapping.get(context, ["保持专注，合理安排时间"])
        
        # 根据精力水平调整建议
        if user_energy == "low":
            base_recommendations.append("选择轻松简单的任务")
        elif user_energy == "high":
            base_recommendations.append("可以尝试更有挑战性的任务")
            
        return base_recommendations
    
    def _get_productivity_tips(self, context: TimeContext, available_minutes: int) -> List[str]:
        """获取生产力建议"""
        base_tips = [
            "设定明确的时间界限",
            "选择可以快速开始的任务",
            "准备好必要的工具和资源"
        ]
        
        if available_minutes <= 10:
            base_tips.extend([
                "专注于单一简单任务",
                "避免需要复杂准备的工作",
                "利用预设的快捷操作"
            ])
        elif available_minutes <= 25:
            base_tips.extend([
                "可以处理中等复杂度的任务",
                "设定中间检查点",
                "准备任务切换方案"
            ])
        else:
            base_tips.extend([
                "可以进行深度工作",
                "设定多个里程碑",
                "准备延续到下次的方案"
            ])
            
        return base_tips
    
    def _build_recommendation_prompt(self, tasks: List[Dict], context: Dict) -> str:
        """构建任务推荐提示词"""
        
        tasks_context = self._build_tasks_context(tasks)
        
        prompt = f"""
你是一个专业的时间管理和效率优化专家，特别擅长碎片时间的利用。请基于当前的时间上下文和用户任务，提供智能的碎片时间任务推荐。

## 当前时间上下文
- 时间场景: {context['time_context']}
- 可用时间: {context['available_minutes']}分钟
- 任务难度级别: {context['difficulty_level']}
- 环境类型: {context['environment']}
- 用户精力水平: {context['user_energy']}
- 推荐任务类型: {', '.join(context['optimal_task_types'])}

## 用户任务列表
{tasks_context}

## 推荐要求
请从用户的任务列表中选择3-5个最适合当前碎片时间的任务，并提供具体的执行建议。

考虑因素：
1. **时间适配性**: 任务能否在可用时间内完成或取得明显进展
2. **环境适应性**: 任务是否适合当前的环境和设备
3. **精力匹配度**: 任务难度是否匹配用户当前的精力水平
4. **切换成本**: 任务开始和结束的复杂度
5. **价值产出**: 在有限时间内能产生的价值

## 输出格式
请严格按照以下JSON格式输出：

```json
{{
  "recommended_tasks": [
    {{
      "task_id": "原任务ID或标识",
      "title": "推荐任务标题",
      "estimated_time": 15,
      "suitability_score": 95,
      "execution_suggestion": "具体的执行建议和注意事项",
      "quick_start_steps": ["快速开始步骤1", "快速开始步骤2"],
      "success_criteria": "在有限时间内的成功标准",
      "continuation_plan": "如果时间不够，如何延续到下次"
    }}
  ],
  "context_insights": {{
    "time_utilization_strategy": "时间利用策略说明",
    "focus_optimization": "专注力优化建议",
    "efficiency_tips": ["效率提升技巧1", "效率提升技巧2"]
  }},
  "alternative_suggestions": [
    "如果推荐任务都不合适，可以考虑的替代活动1",
    "替代活动2",
    "替代活动3"
  ]
}}
```

请确保推荐内容实用、具体，能够帮助用户充分利用碎片时间。
"""
        
        return prompt
    
    def _build_tasks_context(self, tasks: List[Dict]) -> str:
        """构建任务上下文字符串"""
        if not tasks:
            return "用户暂无待办任务"
            
        context_parts = []
        for i, task in enumerate(tasks[:10], 1):  # 最多显示10个任务
            task_info = f"""
{i}. 【{task.get('priority', 'normal').upper()}】{task.get('content', '无标题任务')}
   类型: {task.get('task_type', 'general')}
   状态: {task.get('status', 'active')}
   进度: {task.get('progress', 0)}%
   预估时间: {task.get('estimated_hours', '未知')}小时
   进展记录: {task.get('progress_notes', '无') or '无'}
"""
            context_parts.append(task_info)
        
        return "\n".join(context_parts)
    
    def _parse_recommendation_response(self, response: str) -> Dict:
        """解析AI推荐响应"""
        try:
            # 提取JSON部分
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("响应中未找到JSON格式内容")
            
            json_content = response[start_idx:end_idx]
            recommendation_result = json.loads(json_content)
            
            # 验证必需字段
            required_fields = ['recommended_tasks', 'context_insights']
            for field in required_fields:
                if field not in recommendation_result:
                    raise ValueError(f"缺少必需字段: {field}")
            
            return recommendation_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"解析推荐响应失败: {str(e)}")
            return self._get_fallback_recommendations({})
    
    def _get_fallback_context(self) -> Dict:
        """获取备用时间上下文"""
        return {
            "time_context": "waiting_time",
            "available_minutes": 15,
            "difficulty_level": "medium",
            "environment": "mobile",
            "user_energy": "medium",
            "optimal_task_types": ["快速任务", "简单处理", "信息浏览"],
            "focus_recommendations": [
                "选择可随时中断的任务",
                "保持任务的简单性",
                "准备快速切换"
            ],
            "productivity_tips": [
                "设定明确的时间界限",
                "选择预先准备好的任务",
                "保持工具的便捷性"
            ]
        }
    
    def _get_fallback_recommendations(self, context: Dict) -> Dict:
        """获取备用推荐"""
        return {
            "recommended_tasks": [
                {
                    "task_id": "fallback_1",
                    "title": "快速任务回顾",
                    "estimated_time": 5,
                    "suitability_score": 80,
                    "execution_suggestion": "快速浏览待办任务列表，确认优先级",
                    "quick_start_steps": ["打开任务列表", "扫描高优先级任务"],
                    "success_criteria": "了解当前任务状态",
                    "continuation_plan": "标记需要重点关注的任务"
                },
                {
                    "task_id": "fallback_2", 
                    "title": "简单信息处理",
                    "estimated_time": 10,
                    "suitability_score": 75,
                    "execution_suggestion": "处理简单的消息回复或信息整理",
                    "quick_start_steps": ["检查消息通知", "快速回复简单询问"],
                    "success_criteria": "清理部分待处理信息",
                    "continuation_plan": "标记需要详细回复的消息"
                }
            ],
            "context_insights": {
                "time_utilization_strategy": "利用碎片时间处理简单任务，为重要工作节省整块时间",
                "focus_optimization": "保持轻度专注，避免深度思考任务",
                "efficiency_tips": [
                    "预先准备碎片时间任务清单",
                    "使用快捷工具和模板",
                    "设定明确的时间边界"
                ]
            },
            "alternative_suggestions": [
                "进行简单的呼吸练习或冥想",
                "浏览行业资讯或学习内容",
                "整理手机中的文件或照片"
            ]
        }


# 创建服务实例
fragmented_time_service = FragmentedTimeService()
