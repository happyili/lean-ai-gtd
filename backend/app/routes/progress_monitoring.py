"""
进度监控路由
提供任务完成率分析、效率评估、瓶颈识别等API
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback

from app.routes.auth import token_required
from app.services.progress_monitoring_service import ProgressMonitoringService
from app.utils.response_helpers import create_error_response, create_success_response, debug_log, ErrorCodes

# 创建服务实例
progress_monitoring_service = ProgressMonitoringService()

progress_monitoring_bp = Blueprint('progress_monitoring', __name__)


@progress_monitoring_bp.route('/api/progress/analyze', methods=['POST'])
@token_required
def analyze_user_progress(current_user):
    """分析用户进度情况"""
    try:
        data = request.get_json() or {}
        
        # 获取分析天数参数
        days = data.get('days', 30)
        
        # 验证参数
        if not isinstance(days, int) or days <= 0 or days > 365:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'days参数必须是1-365之间的整数',
                method='POST',
                endpoint='/api/progress/analyze'
            )
        
        # 执行进度分析
        analysis_result = progress_monitoring_service.analyze_user_progress(
            user_id=current_user.id,
            days=days
        )
        
        if analysis_result['success']:
            return create_success_response(
                data=analysis_result,
                message='用户进度分析完成'
            )
        else:
            return create_error_response(
                ErrorCodes.ANALYSIS_FAILED,
                f"进度分析失败: {analysis_result.get('error', '未知错误')}",
                method='POST',
                endpoint='/api/progress/analyze'
            )
        
    except Exception as e:
        debug_log.error("用户进度分析失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'用户进度分析失败: {str(e)}',
            method='POST',
            endpoint='/api/progress/analyze'
        )


@progress_monitoring_bp.route('/api/progress/summary', methods=['GET'])
@token_required
def get_progress_summary(current_user):
    """获取进度摘要信息"""
    try:
        # 获取查询参数
        days = int(request.args.get('days', 7))
        
        if days <= 0 or days > 90:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'days参数必须是1-90之间的整数',
                method='GET',
                endpoint='/api/progress/summary'
            )
        
        # 执行快速分析
        analysis_result = progress_monitoring_service.analyze_user_progress(
            user_id=current_user.id,
            days=days
        )
        
        if not analysis_result['success']:
            return create_error_response(
                ErrorCodes.ANALYSIS_FAILED,
                f"进度摘要获取失败: {analysis_result.get('error', '未知错误')}",
                method='GET',
                endpoint='/api/progress/summary'
            )
        
        # 提取摘要信息
        summary = {
            'analysis_period': analysis_result['analysis_period'],
            'basic_stats': {
                'total_tasks': analysis_result['basic_statistics']['total_tasks'],
                'completed_tasks': analysis_result['basic_statistics']['completed_tasks'],
                'completion_rate': analysis_result['basic_statistics']['completion_rate'],
                'active_tasks': analysis_result['basic_statistics']['active_tasks']
            },
            'efficiency_score': analysis_result['efficiency_analysis']['efficiency_score'],
            'trend_direction': analysis_result['trends']['trend_direction'],
            'bottleneck_score': analysis_result['bottlenecks']['bottleneck_score'],
            'key_insights': analysis_result['ai_insights']['overall_assessment']['key_strengths'][:2] if 'ai_insights' in analysis_result else [],
            'top_recommendations': analysis_result['ai_insights']['actionable_recommendations'][:2] if 'ai_insights' in analysis_result else []
        }
        
        return create_success_response(
            data=summary,
            message='进度摘要获取成功'
        )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'days参数必须是有效的整数',
            method='GET',
            endpoint='/api/progress/summary'
        )
    except Exception as e:
        debug_log.error("进度摘要获取失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'进度摘要获取失败: {str(e)}',
            method='GET',
            endpoint='/api/progress/summary'
        )


@progress_monitoring_bp.route('/api/progress/bottlenecks', methods=['GET'])
@token_required
def get_bottlenecks(current_user):
    """获取瓶颈分析"""
    try:
        # 获取查询参数
        days = int(request.args.get('days', 30))
        
        if days <= 0 or days > 90:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'days参数必须是1-90之间的整数',
                method='GET',
                endpoint='/api/progress/bottlenecks'
            )
        
        # 执行瓶颈分析
        analysis_result = progress_monitoring_service.analyze_user_progress(
            user_id=current_user.id,
            days=days
        )
        
        if not analysis_result['success']:
            return create_error_response(
                ErrorCodes.ANALYSIS_FAILED,
                f"瓶颈分析失败: {analysis_result.get('error', '未知错误')}",
                method='GET',
                endpoint='/api/progress/bottlenecks'
            )
        
        # 返回瓶颈信息
        bottlenecks_data = {
            'bottleneck_score': analysis_result['bottlenecks']['bottleneck_score'],
            'stuck_high_priority_tasks': analysis_result['bottlenecks']['stuck_high_priority_tasks'],
            'frequently_paused_types': analysis_result['bottlenecks']['frequently_paused_types'],
            'low_completion_rate_types': analysis_result['bottlenecks']['low_completion_rate_types'],
            'recommendations': [
                rec for rec in analysis_result['ai_insights']['actionable_recommendations'] 
                if rec['priority'] == 'high'
            ] if 'ai_insights' in analysis_result else [],
            'risk_alerts': analysis_result['ai_insights']['risk_alerts'] if 'ai_insights' in analysis_result else []
        }
        
        return create_success_response(
            data=bottlenecks_data,
            message='瓶颈分析完成'
        )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'days参数必须是有效的整数',
            method='GET',
            endpoint='/api/progress/bottlenecks'
        )
    except Exception as e:
        debug_log.error("瓶颈分析失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'瓶颈分析失败: {str(e)}',
            method='GET',
            endpoint='/api/progress/bottlenecks'
        )


@progress_monitoring_bp.route('/api/progress/trends', methods=['GET'])
@token_required
def get_progress_trends(current_user):
    """获取进度趋势数据"""
    try:
        # 获取查询参数
        days = int(request.args.get('days', 30))
        
        if days <= 0 or days > 90:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'days参数必须是1-90之间的整数',
                method='GET',
                endpoint='/api/progress/trends'
            )
        
        # 执行趋势分析
        analysis_result = progress_monitoring_service.analyze_user_progress(
            user_id=current_user.id,
            days=days
        )
        
        if not analysis_result['success']:
            return create_error_response(
                ErrorCodes.ANALYSIS_FAILED,
                f"趋势分析失败: {analysis_result.get('error', '未知错误')}",
                method='GET',
                endpoint='/api/progress/trends'
            )
        
        # 返回趋势数据
        trends_data = {
            'daily_statistics': analysis_result['trends']['daily_statistics'],
            'weekly_completion_trends': analysis_result['completion_analysis']['weekly_trends'],
            'trend_direction': analysis_result['trends']['trend_direction'],
            'trend_strength': analysis_result['trends']['trend_strength'],
            'recent_performance': {
                'recent_week_avg': analysis_result['trends']['recent_week_avg_completion'],
                'previous_week_avg': analysis_result['trends']['previous_week_avg_completion']
            },
            'completion_time_distribution': analysis_result['completion_analysis']['completion_time_distribution']
        }
        
        return create_success_response(
            data=trends_data,
            message='趋势分析完成'
        )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'days参数必须是有效的整数',
            method='GET',
            endpoint='/api/progress/trends'
        )
    except Exception as e:
        debug_log.error("趋势分析失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'趋势分析失败: {str(e)}',
            method='GET',
            endpoint='/api/progress/trends'
        )


@progress_monitoring_bp.route('/api/progress/efficiency', methods=['GET'])
@token_required
def get_efficiency_analysis(current_user):
    """获取效率分析"""
    try:
        # 获取查询参数
        days = int(request.args.get('days', 30))
        
        if days <= 0 or days > 90:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'days参数必须是1-90之间的整数',
                method='GET',
                endpoint='/api/progress/efficiency'
            )
        
        # 执行效率分析
        analysis_result = progress_monitoring_service.analyze_user_progress(
            user_id=current_user.id,
            days=days
        )
        
        if not analysis_result['success']:
            return create_error_response(
                ErrorCodes.ANALYSIS_FAILED,
                f"效率分析失败: {analysis_result.get('error', '未知错误')}",
                method='GET',
                endpoint='/api/progress/efficiency'
            )
        
        # 返回效率数据
        efficiency_data = {
            'efficiency_score': analysis_result['efficiency_analysis']['efficiency_score'],
            'progress_distribution': analysis_result['efficiency_analysis']['progress_distribution'],
            'stalled_tasks': analysis_result['efficiency_analysis']['stalled_tasks'],
            'average_completion_time': analysis_result['completion_analysis']['average_completion_time_days'],
            'priority_performance': analysis_result['basic_statistics']['priority_distribution'],
            'type_performance': analysis_result['basic_statistics']['type_distribution'],
            'improvement_suggestions': [
                rec for rec in analysis_result['ai_insights']['actionable_recommendations']
                if 'efficiency' in rec['description'].lower() or 'time' in rec['description'].lower()
            ] if 'ai_insights' in analysis_result else []
        }
        
        return create_success_response(
            data=efficiency_data,
            message='效率分析完成'
        )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'days参数必须是有效的整数',
            method='GET',
            endpoint='/api/progress/efficiency'
        )
    except Exception as e:
        debug_log.error("效率分析失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'效率分析失败: {str(e)}',
            method='GET',
            endpoint='/api/progress/efficiency'
        )
