"""
思考工具服务
提供结构化思考记录的管理功能
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.models.thinking_record import ThinkingRecord
from app.models.user import User
from app.database import db
from app.utils.openrouter_utils import query_openrouter

logger = logging.getLogger(__name__)


class ThinkingService:
    """思考工具服务类"""
    
    def create_thinking_record(self, user_id: int, template_id: str, 
                             template_name: str, questions: List[str], 
                             title: str = None) -> Dict[str, Any]:
        """
        创建新的思考记录
        
        Args:
            user_id: 用户ID
            template_id: 模板ID
            template_name: 模板名称
            questions: 问题列表
            title: 自定义标题
            
        Returns:
            创建结果
        """
        try:
            record = ThinkingRecord.create_new_record(
                user_id=user_id,
                template_id=template_id,
                template_name=template_name,
                questions=questions,
                title=title
            )
            
            logger.info(f"用户 {user_id} 创建思考记录: {record.id}")
            
            return {
                'success': True,
                'record_id': record.id,
                'record': record.to_dict(),
                'message': '思考记录创建成功'
            }
            
        except Exception as e:
            logger.error(f"创建思考记录失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '创建思考记录失败'
            }
    
    def get_user_thinking_records(self, user_id: int, limit: int = 20, 
                                offset: int = 0, template_id: str = None) -> Dict[str, Any]:
        """
        获取用户的思考记录列表
        
        Args:
            user_id: 用户ID
            limit: 限制数量
            offset: 偏移量
            template_id: 模板ID筛选
            
        Returns:
            思考记录列表
        """
        try:
            query = ThinkingRecord.query.filter_by(user_id=user_id)
            
            if template_id:
                query = query.filter_by(template_id=template_id)
            
            total_count = query.count()
            records = query.order_by(ThinkingRecord.updated_at.desc()).offset(offset).limit(limit).all()
            
            records_data = [record.to_dict() for record in records]
            
            return {
                'success': True,
                'records': records_data,
                'total_count': total_count,
                'has_more': (offset + limit) < total_count,
                'message': '获取思考记录成功'
            }
            
        except Exception as e:
            logger.error(f"获取思考记录失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '获取思考记录失败'
            }
    
    def get_thinking_record(self, record_id: int, user_id: int) -> Dict[str, Any]:
        """
        获取单个思考记录
        
        Args:
            record_id: 记录ID
            user_id: 用户ID
            
        Returns:
            思考记录详情
        """
        try:
            record = ThinkingRecord.query.filter_by(id=record_id, user_id=user_id).first()
            
            if not record:
                return {
                    'success': False,
                    'error': 'Record not found',
                    'message': '思考记录不存在'
                }
            
            return {
                'success': True,
                'record': record.to_dict(),
                'progress': record.get_progress_summary(),
                'message': '获取思考记录成功'
            }
            
        except Exception as e:
            logger.error(f"获取思考记录失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '获取思考记录失败'
            }
    
    def update_answer(self, record_id: int, user_id: int, 
                     question_index: int, answer: str) -> Dict[str, Any]:
        """
        更新思考记录的答案
        
        Args:
            record_id: 记录ID
            user_id: 用户ID
            question_index: 问题索引
            answer: 答案内容
            
        Returns:
            更新结果
        """
        try:
            record = ThinkingRecord.query.filter_by(id=record_id, user_id=user_id).first()
            
            if not record:
                return {
                    'success': False,
                    'error': 'Record not found',
                    'message': '思考记录不存在'
                }
            
            record.update_answer(question_index, answer)
            
            return {
                'success': True,
                'record': record.to_dict(),
                'progress': record.get_progress_summary(),
                'message': '答案更新成功'
            }
            
        except Exception as e:
            logger.error(f"更新答案失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '更新答案失败'
            }
    
    def generate_ai_summary(self, record_id: int, user_id: int) -> Dict[str, Any]:
        """
        生成AI总结和洞察
        
        Args:
            record_id: 记录ID
            user_id: 用户ID
            
        Returns:
            AI总结结果
        """
        try:
            record = ThinkingRecord.query.filter_by(id=record_id, user_id=user_id).first()
            
            if not record:
                return {
                    'success': False,
                    'error': 'Record not found',
                    'message': '思考记录不存在'
                }
            
            if not record.answers or len([a for a in record.answers.values() if a.strip()]) < 2:
                return {
                    'success': False,
                    'error': 'Insufficient answers',
                    'message': '需要至少回答2个问题才能生成AI总结'
                }
            
            # 构建AI提示词
            prompt = self._build_summary_prompt(record)
            # 调用AI生成总结
            response = query_openrouter(prompt)
            # 解析AI响应
            summary_data = self._parse_summary_response(response)
            
            # 更新记录
            record.update_summary_and_insights(
                summary=summary_data.get('summary', ''),
                insights=summary_data.get('insights', '')
            )
            
            return {
                'success': True,
                'summary': summary_data.get('summary', ''),
                'insights': summary_data.get('insights', ''),
                'key_points': summary_data.get('key_points', []),
                'recommendations': summary_data.get('recommendations', []),
                'message': 'AI总结生成成功'
            }
            
        except Exception as e:
            logger.error(f"生成AI总结失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '生成AI总结失败'
            }
    
    def mark_completed(self, record_id: int, user_id: int, 
                      time_spent: int = 0) -> Dict[str, Any]:
        """
        标记思考记录为完成
        
        Args:
            record_id: 记录ID
            user_id: 用户ID
            time_spent: 额外耗时（分钟）
            
        Returns:
            标记结果
        """
        try:
            record = ThinkingRecord.query.filter_by(id=record_id, user_id=user_id).first()
            
            if not record:
                return {
                    'success': False,
                    'error': 'Record not found',
                    'message': '思考记录不存在'
                }
            
            if time_spent > 0:
                record.add_time_spent(time_spent)
            
            record.mark_completed()
            
            return {
                'success': True,
                'record': record.to_dict(),
                'message': '思考记录已标记为完成'
            }
            
        except Exception as e:
            logger.error(f"标记完成失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '标记完成失败'
            }
    
    def delete_thinking_record(self, record_id: int, user_id: int) -> Dict[str, Any]:
        """
        删除思考记录
        
        Args:
            record_id: 记录ID
            user_id: 用户ID
            
        Returns:
            删除结果
        """
        try:
            record = ThinkingRecord.query.filter_by(id=record_id, user_id=user_id).first()
            
            if not record:
                return {
                    'success': False,
                    'error': 'Record not found',
                    'message': '思考记录不存在'
                }
            
            db.session.delete(record)
            db.session.commit()
            
            logger.info(f"用户 {user_id} 删除思考记录: {record_id}")
            
            return {
                'success': True,
                'message': '思考记录删除成功'
            }
            
        except Exception as e:
            logger.error(f"删除思考记录失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '删除思考记录失败'
            }
    
    def get_thinking_statistics(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """
        获取思考工具使用统计
        
        Args:
            user_id: 用户ID
            days: 统计天数
            
        Returns:
            统计数据
        """
        try:
            from datetime import timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # 基础统计
            total_records = ThinkingRecord.query.filter_by(user_id=user_id).count()
            completed_records = ThinkingRecord.query.filter_by(user_id=user_id, is_completed=1).count()
            recent_records = ThinkingRecord.query.filter(
                ThinkingRecord.user_id == user_id,
                ThinkingRecord.created_at >= start_date
            ).count()
            
            # 模板使用统计
            template_stats = db.session.query(
                ThinkingRecord.template_name,
                db.func.count(ThinkingRecord.id).label('count')
            ).filter_by(user_id=user_id).group_by(ThinkingRecord.template_name).all()
            
            # 总耗时
            total_time = db.session.query(
                db.func.sum(ThinkingRecord.total_time_spent)
            ).filter_by(user_id=user_id).scalar() or 0
            
            return {
                'success': True,
                'statistics': {
                    'total_records': total_records,
                    'completed_records': completed_records,
                    'completion_rate': (completed_records / total_records * 100) if total_records > 0 else 0,
                    'recent_records': recent_records,
                    'total_time_spent': total_time,
                    'average_time_per_record': (total_time / completed_records) if completed_records > 0 else 0,
                    'template_usage': [
                        {'template_name': name, 'count': count} 
                        for name, count in template_stats
                    ]
                },
                'message': '获取统计数据成功'
            }
            
        except Exception as e:
            logger.error(f"获取思考统计失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': '获取统计数据失败'
            }
    
    def _build_summary_prompt(self, record: ThinkingRecord) -> str:
        """构建AI总结提示词"""
        
        # 构建问答对
        qa_pairs = []
        for i, question in enumerate(record.questions):
            answer = record.answers.get(str(i), '').strip()
            if answer:
                qa_pairs.append(f"Q{i+1}: {question}\nA{i+1}: {answer}")
        
        qa_text = "\n\n".join(qa_pairs)
        
        prompt = f"""
请基于以下思考记录，生成一份简洁而有价值的总结和洞察。

## 思考模板: {record.template_name}
## 思考记录标题: {record.title}
## 问答内容:
{qa_text}

请按以下格式输出JSON：

```json
{{
  "summary": "简洁的思考总结，概括主要内容和结论",
  "insights": "关键洞察和发现，包括重要的认知或决策",
  "key_points": ["要点1", "要点2", "要点3"],
  "recommendations": ["建议1", "建议2", "建议3"]
}}
```

要求：
1. 总结要简洁明了，突出核心内容
2. 洞察要有价值，能帮助用户获得新的认知
3. 要点要具体，避免空泛的描述
4. 建议要可执行，具有实际指导意义
"""
        
        return prompt
    
    def _parse_summary_response(self, response: str) -> Dict[str, Any]:
        """解析AI总结响应"""
        try:
            # 提取JSON部分
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # 如果没有找到JSON，返回默认结构
                return {
                    'summary': response[:500] + '...' if len(response) > 500 else response,
                    'insights': '暂无特定洞察',
                    'key_points': [],
                    'recommendations': []
                }
                
        except json.JSONDecodeError:
            return {
                'summary': '总结生成失败，请稍后重试',
                'insights': '洞察生成失败',
                'key_points': [],
                'recommendations': []
            }


# 创建服务实例
thinking_service = ThinkingService()
