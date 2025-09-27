"""
进度智能监控服务
提供任务完成率分析、时间效率评估、瓶颈自动识别等功能
"""

import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy import func, and_, or_

from app.models.record import Record
from app.models.user import User
from app.database import db
from app.utils.openrouter_utils import query_openrouter

logger = logging.getLogger(__name__)


class ProgressMonitoringService:
    """进度智能监控服务类"""

    def analyze_user_progress(self, user_id: int, days: int = 30) -> Dict:
        """
        分析用户进度情况
        
        Args:
            user_id: 用户ID
            days: 分析的天数范围
            
        Returns:
            进度分析结果
        """
        try:
            # 获取时间范围
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # 基础统计
            basic_stats = self._get_basic_statistics(user_id, start_date, end_date)
            
            # 完成率分析
            completion_analysis = self._analyze_completion_rates(user_id, start_date, end_date)
            
            # 时间效率分析
            efficiency_analysis = self._analyze_time_efficiency(user_id, start_date, end_date)
            
            # 瓶颈识别
            bottlenecks = self._identify_bottlenecks(user_id, start_date, end_date)
            
            # 趋势分析
            trends = self._analyze_trends(user_id, start_date, end_date)
            
            # 生成AI洞察
            ai_insights = self._generate_ai_insights({
                'basic_stats': basic_stats,
                'completion_analysis': completion_analysis,
                'efficiency_analysis': efficiency_analysis,
                'bottlenecks': bottlenecks,
                'trends': trends
            })
            
            return {
                'success': True,
                'analysis_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                },
                'basic_statistics': basic_stats,
                'completion_analysis': completion_analysis,
                'efficiency_analysis': efficiency_analysis,
                'bottlenecks': bottlenecks,
                'trends': trends,
                'ai_insights': ai_insights
            }
            
        except Exception as e:
            logger.error(f"用户进度分析失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'fallback_data': self._get_fallback_analysis()
            }
    
    def _get_basic_statistics(self, user_id: int, start_date: datetime, end_date: datetime) -> Dict:
        """获取基础统计数据"""
        
        # 总任务数
        total_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        # 已完成任务数
        completed_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'completed',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        # 进行中任务数
        active_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'active',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        # 暂停任务数
        paused_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'paused',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        # 按优先级统计
        priority_stats = {}
        for priority in ['high', 'medium', 'low']:
            priority_stats[priority] = {
                'total': Record.query.filter(
                    Record.user_id == user_id,
                    Record.category == 'task',
                    Record.priority == priority,
                    Record.created_at >= start_date,
                    Record.created_at <= end_date
                ).count(),
                'completed': Record.query.filter(
                    Record.user_id == user_id,
                    Record.category == 'task',
                    Record.priority == priority,
                    Record.status == 'completed',
                    Record.created_at >= start_date,
                    Record.created_at <= end_date
                ).count()
            }
        
        # 按任务类型统计
        type_stats = {}
        for task_type in ['work', 'personal', 'learning', 'health']:
            type_stats[task_type] = {
                'total': Record.query.filter(
                    Record.user_id == user_id,
                    Record.category == 'task',
                    Record.task_type == task_type,
                    Record.created_at >= start_date,
                    Record.created_at <= end_date
                ).count(),
                'completed': Record.query.filter(
                    Record.user_id == user_id,
                    Record.category == 'task',
                    Record.task_type == task_type,
                    Record.status == 'completed',
                    Record.created_at >= start_date,
                    Record.created_at <= end_date
                ).count()
            }
        
        # 计算完成率
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'active_tasks': active_tasks,
            'paused_tasks': paused_tasks,
            'completion_rate': round(completion_rate, 1),
            'priority_distribution': priority_stats,
            'type_distribution': type_stats
        }
    
    def _analyze_completion_rates(self, user_id: int, start_date: datetime, end_date: datetime) -> Dict:
        """分析完成率情况"""
        
        # 按周分析完成率
        weekly_completion = []
        current_date = start_date
        
        while current_date < end_date:
            week_end = min(current_date + timedelta(days=7), end_date)
            
            week_total = Record.query.filter(
                Record.user_id == user_id,
                Record.category == 'task',
                Record.created_at >= current_date,
                Record.created_at < week_end
            ).count()
            
            week_completed = Record.query.filter(
                Record.user_id == user_id,
                Record.category == 'task',
                Record.status == 'completed',
                Record.created_at >= current_date,
                Record.created_at < week_end
            ).count()
            
            week_rate = (week_completed / week_total * 100) if week_total > 0 else 0
            
            weekly_completion.append({
                'week_start': current_date.strftime('%Y-%m-%d'),
                'week_end': week_end.strftime('%Y-%m-%d'),
                'total_tasks': week_total,
                'completed_tasks': week_completed,
                'completion_rate': round(week_rate, 1)
            })
            
            current_date = week_end
        
        # 计算平均完成时间
        completed_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'completed',
            Record.created_at >= start_date,
            Record.created_at <= end_date,
            Record.updated_at.isnot(None)
        ).all()
        
        completion_times = []
        for task in completed_tasks:
            if task.updated_at and task.created_at:
                completion_time = (task.updated_at - task.created_at).days
                completion_times.append(completion_time)
        
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        return {
            'weekly_trends': weekly_completion,
            'average_completion_time_days': round(avg_completion_time, 1),
            'completion_time_distribution': {
                'same_day': len([t for t in completion_times if t == 0]),
                'within_week': len([t for t in completion_times if 0 < t <= 7]),
                'within_month': len([t for t in completion_times if 7 < t <= 30]),
                'over_month': len([t for t in completion_times if t > 30])
            }
        }
    
    def _analyze_time_efficiency(self, user_id: int, start_date: datetime, end_date: datetime) -> Dict:
        """分析时间效率"""
        
        # 获取有进度记录的任务
        tasks_with_progress = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.created_at >= start_date,
            Record.created_at <= end_date,
            Record.progress > 0
        ).all()
        
        # 分析进度更新频率
        progress_updates = defaultdict(int)
        stalled_tasks = []
        
        for task in tasks_with_progress:
            # 计算任务存在时间
            task_age = (datetime.now() - task.created_at).days
            
            # 如果任务超过7天没有进度更新，认为是停滞任务
            if task_age > 7 and task.progress < 100 and task.status == 'active':
                stalled_tasks.append({
                    'id': task.id,
                    'content': task.content,
                    'progress': task.progress,
                    'days_since_creation': task_age,
                    'priority': task.priority
                })
            
            # 统计进度分布
            progress_range = f"{(task.progress // 10) * 10}-{(task.progress // 10) * 10 + 9}%"
            progress_updates[progress_range] += 1
        
        # 效率评分
        efficiency_score = self._calculate_efficiency_score(user_id, start_date, end_date)
        
        return {
            'efficiency_score': efficiency_score,
            'progress_distribution': dict(progress_updates),
            'stalled_tasks': stalled_tasks,
            'stalled_tasks_count': len(stalled_tasks),
            'active_tasks_ratio': len([t for t in tasks_with_progress if t.status == 'active']) / len(tasks_with_progress) if tasks_with_progress else 0
        }
    
    def _identify_bottlenecks(self, user_id: int, start_date: datetime, end_date: datetime) -> Dict:
        """识别瓶颈"""
        
        # 长期未完成的高优先级任务
        high_priority_stuck = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.priority == 'high',
            Record.status.in_(['active', 'paused']),
            Record.created_at < datetime.now() - timedelta(days=7)
        ).all()
        
        # 频繁暂停的任务类型
        paused_by_type = defaultdict(int)
        paused_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'paused',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).all()
        
        for task in paused_tasks:
            paused_by_type[task.task_type or 'general'] += 1
        
        # 低完成率的任务类型
        low_completion_types = []
        for task_type in ['work', 'personal', 'learning', 'health']:
            total = Record.query.filter(
                Record.user_id == user_id,
                Record.category == 'task',
                Record.task_type == task_type,
                Record.created_at >= start_date,
                Record.created_at <= end_date
            ).count()
            
            completed = Record.query.filter(
                Record.user_id == user_id,
                Record.category == 'task',
                Record.task_type == task_type,
                Record.status == 'completed',
                Record.created_at >= start_date,
                Record.created_at <= end_date
            ).count()
            
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            if completion_rate < 50 and total >= 3:  # 完成率低于50%且任务数量>=3
                low_completion_types.append({
                    'type': task_type,
                    'completion_rate': round(completion_rate, 1),
                    'total_tasks': total,
                    'completed_tasks': completed
                })
        
        return {
            'stuck_high_priority_tasks': [
                {
                    'id': task.id,
                    'content': task.content,
                    'days_stuck': (datetime.now() - task.created_at).days,
                    'progress': task.progress,
                    'status': task.status
                } for task in high_priority_stuck
            ],
            'frequently_paused_types': dict(paused_by_type),
            'low_completion_rate_types': low_completion_types,
            'bottleneck_score': self._calculate_bottleneck_score(high_priority_stuck, paused_by_type, low_completion_types)
        }
    
    def _analyze_trends(self, user_id: int, start_date: datetime, end_date: datetime) -> Dict:
        """分析趋势"""
        
        # 按天统计任务创建和完成情况
        daily_stats = []
        current_date = start_date
        
        while current_date < end_date:
            next_date = current_date + timedelta(days=1)
            
            created = Record.query.filter(
                Record.user_id == user_id,
                Record.category == 'task',
                Record.created_at >= current_date,
                Record.created_at < next_date
            ).count()
            
            completed = Record.query.filter(
                Record.user_id == user_id,
                Record.category == 'task',
                Record.status == 'completed',
                Record.updated_at >= current_date,
                Record.updated_at < next_date
            ).count()
            
            daily_stats.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'created_tasks': created,
                'completed_tasks': completed,
                'net_change': completed - created
            })
            
            current_date = next_date
        
        # 计算趋势
        recent_week = daily_stats[-7:] if len(daily_stats) >= 7 else daily_stats
        previous_week = daily_stats[-14:-7] if len(daily_stats) >= 14 else []
        
        recent_avg_completion = sum(d['completed_tasks'] for d in recent_week) / len(recent_week) if recent_week else 0
        previous_avg_completion = sum(d['completed_tasks'] for d in previous_week) / len(previous_week) if previous_week else 0
        
        trend_direction = 'improving' if recent_avg_completion > previous_avg_completion else 'declining' if recent_avg_completion < previous_avg_completion else 'stable'
        
        return {
            'daily_statistics': daily_stats,
            'recent_week_avg_completion': round(recent_avg_completion, 1),
            'previous_week_avg_completion': round(previous_avg_completion, 1),
            'trend_direction': trend_direction,
            'trend_strength': abs(recent_avg_completion - previous_avg_completion)
        }
    
    def _calculate_efficiency_score(self, user_id: int, start_date: datetime, end_date: datetime) -> int:
        """计算效率评分 (0-100)"""
        
        # 基础完成率权重 40%
        total_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        completed_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'completed',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        completion_score = (completed_tasks / total_tasks * 40) if total_tasks > 0 else 0
        
        # 高优先级任务完成率权重 30%
        high_priority_total = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.priority == 'high',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        high_priority_completed = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.priority == 'high',
            Record.status == 'completed',
            Record.created_at >= start_date,
            Record.created_at <= end_date
        ).count()
        
        priority_score = (high_priority_completed / high_priority_total * 30) if high_priority_total > 0 else 30
        
        # 任务停滞惩罚 -20%
        stalled_tasks = Record.query.filter(
            Record.user_id == user_id,
            Record.category == 'task',
            Record.status == 'active',
            Record.created_at < datetime.now() - timedelta(days=7),
            Record.progress < 100
        ).count()
        
        stalled_penalty = min(stalled_tasks * 5, 20)
        
        # 一致性奖励 10%
        consistency_bonus = 10 if completed_tasks > 0 and total_tasks > 0 else 0
        
        efficiency_score = max(0, min(100, completion_score + priority_score - stalled_penalty + consistency_bonus))
        
        return round(efficiency_score)
    
    def _calculate_bottleneck_score(self, stuck_tasks: List, paused_types: Dict, low_completion_types: List) -> int:
        """计算瓶颈严重程度评分 (0-100，分数越高瓶颈越严重)"""
        
        score = 0
        
        # 停滞的高优先级任务
        score += len(stuck_tasks) * 15
        
        # 频繁暂停的任务类型
        score += sum(paused_types.values()) * 5
        
        # 低完成率任务类型
        score += len(low_completion_types) * 10
        
        return min(100, score)
    
    def _generate_ai_insights(self, analysis_data: Dict) -> Dict:
        """生成AI洞察和建议"""
        
        try:
            prompt = self._build_insights_prompt(analysis_data)
            response = query_openrouter(prompt)
            return self._parse_insights_response(response)
            
        except Exception as e:
            logger.error(f"AI洞察生成失败: {str(e)}")
            return self._get_fallback_insights(analysis_data)
    
    def _build_insights_prompt(self, data: Dict) -> str:
        """构建AI洞察提示词"""
        
        prompt = f"""
你是一个专业的生产力分析专家，请基于以下用户任务管理数据提供深度洞察和改进建议。

## 用户数据分析

### 基础统计
- 总任务数: {data['basic_stats']['total_tasks']}
- 完成任务数: {data['basic_stats']['completed_tasks']}
- 整体完成率: {data['basic_stats']['completion_rate']}%
- 进行中任务: {data['basic_stats']['active_tasks']}
- 暂停任务: {data['basic_stats']['paused_tasks']}

### 效率分析
- 效率评分: {data['efficiency_analysis']['efficiency_score']}/100
- 停滞任务数: {data['efficiency_analysis']['stalled_tasks_count']}
- 平均完成时间: {data['completion_analysis']['average_completion_time_days']} 天

### 瓶颈识别
- 瓶颈严重程度: {data['bottlenecks']['bottleneck_score']}/100
- 停滞的高优先级任务: {len(data['bottlenecks']['stuck_high_priority_tasks'])} 个
- 低完成率任务类型: {len(data['bottlenecks']['low_completion_rate_types'])} 个

### 趋势分析
- 趋势方向: {data['trends']['trend_direction']}
- 近期周平均完成: {data['trends']['recent_week_avg_completion']} 个/天

## 分析要求

请提供以下维度的深度洞察：

1. **核心问题识别** - 找出最主要的生产力问题
2. **优势分析** - 识别用户做得好的方面
3. **改进建议** - 提供3-5个具体的改进措施
4. **风险预警** - 识别可能影响未来表现的风险因素
5. **个性化建议** - 基于数据特征提供定制化建议

## 输出格式

请严格按照以下JSON格式输出：

```json
{{
  "overall_assessment": {{
    "performance_level": "excellent/good/average/poor",
    "key_strengths": ["优势1", "优势2", "优势3"],
    "main_challenges": ["挑战1", "挑战2", "挑战3"],
    "summary": "整体评估总结"
  }},
  "core_insights": [
    {{
      "category": "completion_rate/efficiency/bottlenecks/trends",
      "insight": "具体洞察内容",
      "evidence": "支持证据",
      "impact_level": "high/medium/low"
    }}
  ],
  "actionable_recommendations": [
    {{
      "title": "建议标题",
      "description": "详细描述",
      "priority": "high/medium/low",
      "expected_impact": "预期影响",
      "implementation_difficulty": "easy/medium/hard",
      "timeline": "建议时间框架"
    }}
  ],
  "risk_alerts": [
    {{
      "risk_type": "风险类型",
      "description": "风险描述",
      "probability": "high/medium/low",
      "mitigation_strategy": "缓解策略"
    }}
  ],
  "motivation_message": "鼓励性总结信息"
}}
```

请确保分析深入、建议实用，能够真正帮助用户提升任务管理效率。
"""
        
        return prompt
    
    def _parse_insights_response(self, response: str) -> Dict:
        """解析AI洞察响应"""
        
        try:
            # 提取JSON部分
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("响应中未找到JSON格式内容")
            
            json_content = response[start_idx:end_idx]
            insights_result = json.loads(json_content)
            
            return insights_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"解析AI洞察响应失败: {str(e)}")
            return self._get_fallback_insights({})
    
    def _get_fallback_insights(self, data: Dict) -> Dict:
        """获取备用洞察"""
        
        return {
            "overall_assessment": {
                "performance_level": "average",
                "key_strengths": ["任务创建规律", "基础功能使用正常", "持续记录进展"],
                "main_challenges": ["完成率有待提升", "任务管理效率需要优化", "时间规划需要改进"],
                "summary": "整体表现中等，有明确的改进空间和潜力"
            },
            "core_insights": [
                {
                    "category": "completion_rate",
                    "insight": "任务完成率需要关注，建议优化任务规划和执行策略",
                    "evidence": "基于当前完成率数据分析",
                    "impact_level": "high"
                }
            ],
            "actionable_recommendations": [
                {
                    "title": "优化任务拆分",
                    "description": "将大任务分解为更小的可管理子任务，提高完成率",
                    "priority": "high",
                    "expected_impact": "提升20-30%的任务完成率",
                    "implementation_difficulty": "easy",
                    "timeline": "立即开始，持续优化"
                },
                {
                    "title": "建立每日回顾习惯",
                    "description": "每天花5-10分钟回顾任务进展，及时调整计划",
                    "priority": "medium",
                    "expected_impact": "提升任务执行的一致性",
                    "implementation_difficulty": "easy",
                    "timeline": "本周开始实施"
                }
            ],
            "risk_alerts": [
                {
                    "risk_type": "任务积压",
                    "description": "未完成任务可能会持续积累，影响整体效率",
                    "probability": "medium",
                    "mitigation_strategy": "定期清理和重新评估任务优先级"
                }
            ],
            "motivation_message": "每一个小的改进都是进步！继续保持记录和规划的好习惯，逐步优化你的任务管理系统。"
        }
    
    def _get_fallback_analysis(self) -> Dict:
        """获取备用分析结果"""
        
        return {
            'basic_statistics': {
                'total_tasks': 0,
                'completed_tasks': 0,
                'active_tasks': 0,
                'paused_tasks': 0,
                'completion_rate': 0,
                'priority_distribution': {},
                'type_distribution': {}
            },
            'completion_analysis': {
                'weekly_trends': [],
                'average_completion_time_days': 0,
                'completion_time_distribution': {}
            },
            'efficiency_analysis': {
                'efficiency_score': 50,
                'progress_distribution': {},
                'stalled_tasks': [],
                'stalled_tasks_count': 0
            },
            'bottlenecks': {
                'stuck_high_priority_tasks': [],
                'frequently_paused_types': {},
                'low_completion_rate_types': [],
                'bottleneck_score': 0
            },
            'trends': {
                'daily_statistics': [],
                'trend_direction': 'stable'
            }
        }


# 创建服务实例
progress_monitoring_service = ProgressMonitoringService()
