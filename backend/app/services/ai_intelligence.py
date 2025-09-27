"""
AI智能分析服务模块
提供基于任务进展的智能分析功能：执行策略建议、潜在机会发掘、任务拆分建议
"""

import json
from typing import Dict, List, Optional

from app.utils.openrouter_utils import query_openrouter


class AIIntelligenceService:
    """AI智能分析服务类"""
    
    def __init__(self):
        self.model = "google/gemini-2.5-flash"
    
    def analyze_task_progress(self, task_data: Dict, override_prompt: Optional[str] = None, extra_context: Optional[str] = None) -> Dict:
        """
        基于任务数据进行智能分析
        
        Args:
            task_data: 包含任务内容、进展记录、状态等信息的字典
            
        Returns:
            包含三个维度分析结果的字典：
            - execution_strategy: 执行策略建议
            - opportunities: 潜在机会发掘  
            - subtask_suggestions: 子任务拆分建议
            - prompt_used: 实际使用的提示词内容
        """
        
        # 构建上下文块（包含任务标题、详情、已完成与未完成子任务、以及用户提供的附加上下文）
        context_block = self._build_context_block(task_data, extra_context)

        # 使用覆盖提示词（带有 {{CONTEXT}} 宏变量）或默认提示词
        if override_prompt:
            prompt = override_prompt.replace('{{CONTEXT}}', context_block)
        else:
            prompt = self._build_analysis_prompt(task_data, context_block)
        
        try:
            response = query_openrouter(prompt)
            # 解析AI响应
            analysis_result = self._parse_ai_response(response)
            # 添加实际使用的提示词
            analysis_result['prompt_used'] = prompt
            return analysis_result
            
        except Exception as e:
            print(f"AI分析服务调用失败: {str(e)}")
            fallback_result = self._get_fallback_response()
            # 即使失败也返回提示词
            fallback_result['prompt_used'] = prompt
            return fallback_result
    
    def _build_analysis_prompt(self, task_data: Dict, context_block: str) -> str:
        """构建AI分析提示词（默认模板，包含上下文宏展开结果）"""

        prompt = f"""
你是一个专业的任务管理和项目分析专家。请基于以下任务上下文信息，提供详细的智能分析建议。

## 任务上下文
{context_block}

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

    def _build_5w1h_analysis_prompt(self, task_data: Dict, context_block: str) -> str:
        """构建5W1H分析专用提示词模板"""
        
        prompt = f"""
你是一个专业的任务分析专家，擅长使用5W1H框架进行深度分析。请基于以下任务上下文信息，使用5W1H框架进行全面分析。

## 任务上下文
{context_block}

## 5W1H分析框架要求
请从以下6个维度进行深入分析：

1. **What (什么)** - 任务本质分析
   - 核心目标和具体要做的事情
   - 任务的具体产出和成果
   - 关键的行动步骤

2. **Why (为什么)** - 价值意义分析  
   - 任务的根本价值和意义
   - 完成任务的好处和收益
   - 重要性评分(1-100)

3. **Who (谁)** - 相关人员分析
   - 任务执行者和决策者
   - 相关利益方和受影响的人
   - 需要协作的人员

4. **When (何时)** - 时间要求分析
   - 截止时间和时间敏感度
   - 优先级水平
   - 最佳执行时机

5. **Where (何地)** - 环境条件分析
   - 执行环境和地点要求
   - 所需的工作条件
   - 上下文环境因素

6. **How (如何)** - 执行方法分析
   - 具体的执行方法和策略
   - 所需资源和工具
   - 详细的执行步骤
   - 成功标准和衡量指标

## 输出格式
请严格按照以下JSON格式输出，确保分析深入且实用：

```json
{{
  "what": {{
    "core_objective": "核心目标描述",
    "specific_actions": ["具体行动1", "具体行动2", "具体行动3"],
    "expected_outcomes": ["预期成果1", "预期成果2"]
  }},
  "why": {{
    "value_proposition": "核心价值主张",
    "benefits": ["好处1", "好处2", "好处3"],
    "importance_score": 85,
    "motivation": "执行动机说明"
  }},
  "who": {{
    "stakeholders": ["相关人员1", "相关人员2"],
    "decision_maker": "主要决策者",
    "affected_parties": ["受影响方1", "受影响方2"],
    "collaborators": ["协作人员1", "协作人员2"]
  }},
  "when": {{
    "deadline": "截止时间或时间要求",
    "priority_level": "high/medium/low",
    "time_sensitivity": "时间敏感度分析",
    "optimal_timing": "最佳执行时机"
  }},
  "where": {{
    "environment": "执行环境描述",
    "location_requirements": "地点要求",
    "context": "上下文环境",
    "conditions": "所需条件"
  }},
  "how": {{
    "methodology": "主要执行方法",
    "required_resources": ["所需资源1", "所需资源2", "所需资源3"],
    "execution_steps": ["步骤1", "步骤2", "步骤3", "步骤4"],
    "success_criteria": "成功标准",
    "measurement_metrics": ["衡量指标1", "衡量指标2"]
  }},
  "analysis_summary": {{
    "key_insights": ["关键洞察1", "关键洞察2", "关键洞察3"],
    "potential_challenges": ["潜在挑战1", "潜在挑战2"],
    "recommendations": ["建议1", "建议2", "建议3"]
  }}
}}
```

请确保分析内容具体、实用、有针对性，避免空泛的描述。每个维度都要基于任务的实际情况进行深入思考。
"""
        
        return prompt

    def enhanced_task_decomposition(self, task_data: Dict, extra_context: Optional[str] = None) -> Dict:
        """
        增强的任务拆解算法
        基于复杂度、依赖关系和时间估算进行智能分解
        
        Args:
            task_data: 包含任务内容、进展记录、状态等信息的字典
            extra_context: 额外的上下文信息
            
        Returns:
            包含智能拆解结果的字典
        """
        context_block = self._build_context_block(task_data, extra_context)
        prompt = self._build_enhanced_decomposition_prompt(task_data, context_block)
        
        try:
            response = query_openrouter(prompt)
            # 解析AI响应
            decomposition_result = self._parse_decomposition_response(response)
            decomposition_result['prompt_used'] = prompt
            return decomposition_result
            
        except Exception as e:
            print(f"增强任务拆解失败: {str(e)}")
            fallback_result = self._get_decomposition_fallback()
            fallback_result['prompt_used'] = prompt
            return fallback_result

    def _build_enhanced_decomposition_prompt(self, task_data: Dict, context_block: str) -> str:
        """构建增强的任务拆解提示词模板"""
        
        prompt = f"""
你是一个专业的项目管理和任务分析专家，擅长将复杂任务分解为可执行的子任务。请基于以下任务信息进行智能拆解。

## 任务上下文
{context_block}

## 智能拆解要求

请从以下维度进行深入分析，并提供智能的任务拆解方案：

### 1. 复杂度分析
- 评估任务的整体复杂度（1-10分）
- 识别技术难点和知识要求
- 分析所需的技能和经验水平

### 2. 依赖关系分析
- 识别任务之间的前后依赖关系
- 分析并行执行的可能性
- 确定关键路径和瓶颈点

### 3. 时间估算优化
- 基于任务复杂度进行精确时间估算
- 考虑学习曲线和熟练度因素
- 预留缓冲时间应对风险

### 4. 难度梯度设计
- 按照从易到难的原则排序
- 确保每个子任务都有明确的成功标准
- 设计渐进式的技能提升路径

## 输出格式
请严格按照以下JSON格式输出：

```json
{{
  "task_analysis": {{
    "complexity_score": 7,
    "estimated_total_hours": 15,
    "main_challenges": ["挑战1", "挑战2", "挑战3"],
    "required_skills": ["技能1", "技能2", "技能3"],
    "risk_factors": ["风险1", "风险2"]
  }},
  "dependency_map": {{
    "critical_path": ["关键任务1", "关键任务2", "关键任务3"],
    "parallel_groups": [
      ["可并行任务1", "可并行任务2"],
      ["可并行任务3", "可并行任务4"]
    ],
    "bottlenecks": ["瓶颈任务1", "瓶颈任务2"]
  }},
  "enhanced_subtasks": [
    {{
      "id": "subtask_001",
      "title": "子任务标题",
      "description": "详细描述任务内容和目标",
      "complexity_level": "easy/medium/hard",
      "estimated_hours": 2.5,
      "buffer_time": 0.5,
      "priority": "high/medium/low",
      "dependencies": ["subtask_000"],
      "parallel_with": ["subtask_002"],
      "required_skills": ["技能1", "技能2"],
      "success_criteria": "明确的完成标准",
      "deliverables": ["交付物1", "交付物2"],
      "potential_blockers": ["可能的阻碍因素"],
      "learning_resources": ["学习资源1", "学习资源2"]
    }},
    {{
      "id": "subtask_002",
      "title": "另一个子任务",
      "description": "详细描述",
      "complexity_level": "medium",
      "estimated_hours": 3.0,
      "buffer_time": 1.0,
      "priority": "medium",
      "dependencies": [],
      "parallel_with": ["subtask_001"],
      "required_skills": ["技能3"],
      "success_criteria": "完成标准",
      "deliverables": ["交付物3"],
      "potential_blockers": ["阻碍因素"],
      "learning_resources": ["资源3"]
    }}
  ],
  "execution_strategy": {{
    "recommended_order": ["subtask_001", "subtask_002", "subtask_003"],
    "milestone_checkpoints": [
      {{
        "after_tasks": ["subtask_001", "subtask_002"],
        "milestone": "第一阶段完成",
        "review_points": ["检查点1", "检查点2"]
      }}
    ],
    "resource_allocation": {{
      "peak_workload_periods": ["时间段1", "时间段2"],
      "required_tools": ["工具1", "工具2"],
      "external_dependencies": ["外部依赖1", "外部依赖2"]
    }},
    "risk_mitigation": [
      {{
        "risk": "风险描述",
        "probability": "high/medium/low",
        "impact": "high/medium/low", 
        "mitigation_strategy": "应对策略"
      }}
    ]
  }},
  "optimization_suggestions": [
    "优化建议1：具体的改进方案",
    "优化建议2：效率提升方法",
    "优化建议3：质量保证措施"
  ]
}}
```

请确保分析深入、实用，每个子任务都具有可操作性和明确的成功标准。
"""
        
        return prompt

    def _parse_decomposition_response(self, response: str) -> Dict:
        """解析增强任务拆解的AI响应"""
        try:
            # 提取JSON部分
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("响应中未找到JSON格式内容")
            
            json_content = response[start_idx:end_idx]
            decomposition_result = json.loads(json_content)
            
            # 验证必需字段
            required_fields = ['task_analysis', 'enhanced_subtasks', 'execution_strategy']
            for field in required_fields:
                if field not in decomposition_result:
                    raise ValueError(f"缺少必需字段: {field}")
            
            return decomposition_result
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"解析增强拆解响应失败: {str(e)}")
            return self._get_decomposition_fallback()

    def _get_decomposition_fallback(self) -> Dict:
        """获取任务拆解的备用响应"""
        return {
            "task_analysis": {
                "complexity_score": 5,
                "estimated_total_hours": 8,
                "main_challenges": ["需要详细分析任务要求", "制定合适的执行计划"],
                "required_skills": ["任务分析", "项目管理"],
                "risk_factors": ["时间估算不准确", "需求理解偏差"]
            },
            "dependency_map": {
                "critical_path": ["需求分析", "方案设计", "具体实施"],
                "parallel_groups": [],
                "bottlenecks": ["需求分析阶段"]
            },
            "enhanced_subtasks": [
                {
                    "id": "subtask_001",
                    "title": "任务需求分析",
                    "description": "详细分析任务要求，明确目标和成功标准",
                    "complexity_level": "medium",
                    "estimated_hours": 2.0,
                    "buffer_time": 0.5,
                    "priority": "high",
                    "dependencies": [],
                    "parallel_with": [],
                    "required_skills": ["分析能力"],
                    "success_criteria": "完成需求文档",
                    "deliverables": ["需求分析报告"],
                    "potential_blockers": ["需求不清晰"],
                    "learning_resources": ["需求分析方法论"]
                },
                {
                    "id": "subtask_002", 
                    "title": "执行方案设计",
                    "description": "基于需求分析设计详细的执行方案",
                    "complexity_level": "medium",
                    "estimated_hours": 3.0,
                    "buffer_time": 1.0,
                    "priority": "high",
                    "dependencies": ["subtask_001"],
                    "parallel_with": [],
                    "required_skills": ["方案设计"],
                    "success_criteria": "完成可执行的方案",
                    "deliverables": ["执行方案文档"],
                    "potential_blockers": ["技术方案不可行"],
                    "learning_resources": ["项目管理最佳实践"]
                },
                {
                    "id": "subtask_003",
                    "title": "方案实施执行", 
                    "description": "按照设计的方案具体实施",
                    "complexity_level": "easy",
                    "estimated_hours": 3.0,
                    "buffer_time": 0.5,
                    "priority": "medium",
                    "dependencies": ["subtask_002"],
                    "parallel_with": [],
                    "required_skills": ["执行能力"],
                    "success_criteria": "完成预期目标",
                    "deliverables": ["实施结果"],
                    "potential_blockers": ["执行过程中的意外情况"],
                    "learning_resources": ["相关技术文档"]
                }
            ],
            "execution_strategy": {
                "recommended_order": ["subtask_001", "subtask_002", "subtask_003"],
                "milestone_checkpoints": [
                    {
                        "after_tasks": ["subtask_001"],
                        "milestone": "需求分析完成",
                        "review_points": ["需求确认", "方案可行性评估"]
                    }
                ],
                "resource_allocation": {
                    "peak_workload_periods": ["方案设计阶段"],
                    "required_tools": ["文档工具", "项目管理工具"],
                    "external_dependencies": ["相关资料获取"]
                },
                "risk_mitigation": [
                    {
                        "risk": "时间超期",
                        "probability": "medium",
                        "impact": "medium",
                        "mitigation_strategy": "分阶段检查进度，及时调整计划"
                    }
                ]
            },
            "optimization_suggestions": [
                "建议采用敏捷开发方法，分阶段交付",
                "定期回顾进展，及时调整策略",
                "预留充足的缓冲时间应对意外情况"
            ]
        }

    def _build_context_block(self, task_data: Dict, extra_context: Optional[str]) -> str:
        """构建统一的上下文文字块，供提示词宏 {{CONTEXT}} 使用"""
        title = task_data.get('content', '') or ''
        details = task_data.get('progress_notes', '') or '（无）'
        subtasks: List[Dict] = task_data.get('subtasks', []) or []

        completed = [s for s in subtasks if s.get('status') == 'completed']
        incomplete = [s for s in subtasks if s.get('status') != 'completed']

        def fmt_list(items: List[Dict]) -> str:
            if not items:
                return '（无）'
            return '\n'.join([f"- {i+1}. {it.get('content', '')}" for i, it in enumerate(items)])

        parts = [
            f"任务标题: {title}",
            f"任务详情: {details}",
            f"已完成子任务({len(completed)}):\n{fmt_list(completed)}",
            f"未完成子任务({len(incomplete)}):\n{fmt_list(incomplete)}",
        ]
        if extra_context and extra_context.strip():
            parts.append(f"补充上下文: {extra_context.strip()}")
        return '\n\n'.join(parts)
    
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
