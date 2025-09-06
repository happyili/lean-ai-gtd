"""
AI智能分析服务模块
提供基于任务进展的智能分析功能：执行策略建议、潜在机会发掘、任务拆分建议
"""

import sys
import os
import json
from typing import Dict, List, Optional

# 添加项目根目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from openrouter_utils import query_openrounter


class AIIntelligenceService:
    """AI智能分析服务类"""
    
    def __init__(self):
        self.model = "google/gemini-2.5-flash"
    
    def analyze_task_progress(self, task_data: Dict) -> Dict:
        """
        基于任务数据进行智能分析
        
        Args:
            task_data: 包含任务内容、进展记录、状态等信息的字典
            
        Returns:
            包含三个维度分析结果的字典：
            - execution_strategy: 执行策略建议
            - opportunities: 潜在机会发掘  
            - subtask_suggestions: 子任务拆分建议
        """
        
        prompt = self._build_analysis_prompt(task_data)
        
        try:
            response = query_openrounter(
                model=self.model,
                prompt=prompt
            )
            
            # 解析AI响应
            analysis_result = self._parse_ai_response(response)
            return analysis_result
            
        except Exception as e:
            print(f"AI分析服务调用失败: {str(e)}")
            return self._get_fallback_response()
    
    def _build_analysis_prompt(self, task_data: Dict) -> str:
        """构建AI分析提示词"""
        
        task_content = task_data.get('content', '')
        progress_notes = task_data.get('progress_notes', '无进展记录')
        status = task_data.get('status', 'active')
        priority = task_data.get('priority', 'medium')
        subtasks = task_data.get('subtasks', [])
        
        status_map = {
            'active': '进行中',
            'completed': '已完成',
            'paused': '暂停',
            'cancelled': '已取消'
        }
        
        priority_map = {
            'low': '低',
            'medium': '中',
            'high': '高', 
            'urgent': '紧急'
        }
        
        subtask_info = ""
        if subtasks:
            subtask_info = f"\n现有子任务({len(subtasks)}个):\n"
            for i, subtask in enumerate(subtasks, 1):
                subtask_info += f"{i}. {subtask.get('content', '')} - {status_map.get(subtask.get('status', 'active'), '未知状态')}\n"
        
        prompt = f"""
你是一个专业的任务管理和项目分析专家。请基于以下任务信息，提供详细的智能分析建议。

## 任务信息
**任务内容:** {task_content}
**当前状态:** {status_map.get(status, '未知')}
**优先级:** {priority_map.get(priority, '未知')}
**进展记录:** {progress_notes}
{subtask_info}

## 分析要求
请从以下三个维度进行深入分析，并以JSON格式输出结果：

1. **执行策略建议(execution_strategy)**
   - 分析当前任务的执行情况和瓶颈
   - 提供具体的执行方法和步骤建议
   - 建议优化的执行顺序和重点关注领域
   - 给出时间管理和资源分配建议

2. **潜在机会发掘(opportunities)**
   - 识别任务中的潜在价值和机会点
   - 发现可能的延伸方向和拓展空间
   - 分析任务完成后的后续机会
   - 提供创新思路和增值建议

3. **子任务拆分建议(subtask_suggestions)**
   - 将主任务分解为具体的可执行子任务
   - 每个子任务应该具体、可衡量、可在合理时间内完成
   - 考虑子任务之间的依赖关系和执行顺序
   - 提供3-8个具体的子任务建议

## 输出格式
请严格按照以下JSON格式输出，确保内容实用且具体：

```json
{{
  "execution_strategy": {{
    "summary": "执行策略总结（50字以内）",
    "key_points": [
      "具体执行要点1",
      "具体执行要点2",
      "具体执行要点3"
    ],
    "recommendations": [
      "详细建议1",
      "详细建议2"
    ]
  }},
  "opportunities": {{
    "summary": "机会发掘总结（50字以内）",
    "potential_areas": [
      "潜在机会领域1",
      "潜在机会领域2",
      "潜在机会领域3"
    ],
    "value_propositions": [
      "价值主张1",
      "价值主张2"
    ]
  }},
  "subtask_suggestions": [
    {{
      "title": "子任务标题1",
      "description": "子任务详细描述",
      "priority": "high/medium/low",
      "estimated_time": "预估时间",
      "dependencies": ["依赖的其他子任务"]
    }},
    {{
      "title": "子任务标题2", 
      "description": "子任务详细描述",
      "priority": "high/medium/low",
      "estimated_time": "预估时间",
      "dependencies": []
    }}
  ]
}}
```

请确保分析内容针对性强、实用性高，避免泛泛而谈。
"""
        
        return prompt
    
    def _parse_ai_response(self, response: str) -> Dict:
        """解析AI响应内容"""
        try:
            # 提取JSON部分
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("响应中未找到JSON格式内容")
            
            json_content = response[start_idx:end_idx]
            analysis_result = json.loads(json_content)
            
            # 验证必需字段
            required_fields = ['execution_strategy', 'opportunities', 'subtask_suggestions']
            for field in required_fields:
                if field not in analysis_result:
                    raise ValueError(f"缺少必需字段: {field}")
            
            return analysis_result
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"解析AI响应失败: {str(e)}")
            return self._get_fallback_response()
    
    def _get_fallback_response(self) -> Dict:
        """获取备用响应（当AI调用失败时使用）"""
        return {
            "execution_strategy": {
                "summary": "建议分阶段执行，优先解决核心问题",
                "key_points": [
                    "明确当前任务的核心目标",
                    "识别并优先解决关键瓶颈",
                    "制定详细的执行时间表"
                ],
                "recommendations": [
                    "建议将大任务拆分成小的可执行步骤",
                    "定期回顾进展并调整策略"
                ]
            },
            "opportunities": {
                "summary": "关注任务完成过程中的学习和拓展机会",
                "potential_areas": [
                    "知识和技能的积累",
                    "相关领域的延伸探索",
                    "经验总结和方法论建立"
                ],
                "value_propositions": [
                    "通过完成此任务提升相关能力",
                    "为后续类似任务建立可复用的方法"
                ]
            },
            "subtask_suggestions": [
                {
                    "title": "fallback任务需求分析",
                    "description": "详细分析任务要求和成功标准",
                    "priority": "high",
                    "estimated_time": "1-2小时",
                    "dependencies": []
                },
                {
                    "title": "fallback制定执行计划",
                    "description": "基于需求分析制定详细的执行计划",
                    "priority": "high", 
                    "estimated_time": "2-3小时",
                    "dependencies": ["任务需求分析"]
                },
                {
                    "title": "fallback开始核心执行",
                    "description": "按照计划开始执行核心工作内容",
                    "priority": "medium",
                    "estimated_time": "待定",
                    "dependencies": ["制定执行计划"]
                }
            ]
        }


# 创建服务实例
ai_intelligence_service = AIIntelligenceService()