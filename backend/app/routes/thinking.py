"""
思考工具路由
提供结构化思考记录的CRUD API
"""

from flask import Blueprint, request, jsonify, g
from flask_cors import cross_origin
from app.routes.auth import token_required
from app.services.thinking_service import thinking_service
from app.utils.response_helpers import create_error_response, create_success_response, debug_log, ErrorCodes
import traceback

thinking_bp = Blueprint('thinking', __name__, url_prefix='/api/thinking')


@thinking_bp.route('/records', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def create_thinking_record():
    """创建新的思考记录"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return create_error_response(
                ErrorCodes.MISSING_REQUIRED_FIELD,
                '缺少请求数据',
                method='POST',
                endpoint='/api/thinking/records'
            )
        
        # 验证必需字段
        required_fields = ['template_id', 'template_name', 'questions']
        for field in required_fields:
            if field not in data:
                return create_error_response(
                    ErrorCodes.MISSING_REQUIRED_FIELD,
                    f'缺少必需字段: {field}',
                    method='POST',
                    endpoint='/api/thinking/records'
                )
        
        # 创建思考记录
        result = thinking_service.create_thinking_record(
            user_id=g.current_user.id,
            template_id=data['template_id'],
            template_name=data['template_name'],
            questions=data['questions'],
            title=data.get('title')
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='POST',
                endpoint='/api/thinking/records'
            )
        
    except Exception as e:
        debug_log.error("创建思考记录失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'创建思考记录失败: {str(e)}',
            method='POST',
            endpoint='/api/thinking/records'
        )


@thinking_bp.route('/records', methods=['GET', 'OPTIONS'])
@cross_origin()
@token_required
def get_thinking_records():
    """获取用户的思考记录列表"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        # 获取查询参数
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        template_id = request.args.get('template_id')
        
        if limit <= 0 or limit > 100:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'limit参数必须在1-100之间',
                method='GET',
                endpoint='/api/thinking/records'
            )
        
        # 获取思考记录
        result = thinking_service.get_user_thinking_records(
            user_id=g.current_user.id,
            limit=limit,
            offset=offset,
            template_id=template_id
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='GET',
                endpoint='/api/thinking/records'
            )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'limit和offset参数必须是有效的整数',
            method='GET',
            endpoint='/api/thinking/records'
        )
    except Exception as e:
        debug_log.error("获取思考记录失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'获取思考记录失败: {str(e)}',
            method='GET',
            endpoint='/api/thinking/records'
        )


@thinking_bp.route('/records/<int:record_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
@token_required
def get_thinking_record(record_id):
    """获取单个思考记录详情"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        result = thinking_service.get_thinking_record(
            record_id=record_id,
            user_id=g.current_user.id
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.RESOURCE_NOT_FOUND,
                result['message'],
                method='GET',
                endpoint=f'/api/thinking/records/{record_id}'
            )
        
    except Exception as e:
        debug_log.error("获取思考记录详情失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'获取思考记录详情失败: {str(e)}',
            method='GET',
            endpoint=f'/api/thinking/records/{record_id}'
        )


@thinking_bp.route('/records/<int:record_id>/answers', methods=['PUT', 'OPTIONS'])
@cross_origin()
@token_required
def update_answer(record_id):
    """更新思考记录的答案"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return create_error_response(
                ErrorCodes.MISSING_REQUIRED_FIELD,
                '缺少请求数据',
                method='PUT',
                endpoint=f'/api/thinking/records/{record_id}/answers'
            )
        
        # 验证必需字段
        if 'question_index' not in data or 'answer' not in data:
            return create_error_response(
                ErrorCodes.MISSING_REQUIRED_FIELD,
                '缺少question_index或answer字段',
                method='PUT',
                endpoint=f'/api/thinking/records/{record_id}/answers'
            )
        
        result = thinking_service.update_answer(
            record_id=record_id,
            user_id=g.current_user.id,
            question_index=data['question_index'],
            answer=data['answer']
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='PUT',
                endpoint=f'/api/thinking/records/{record_id}/answers'
            )
        
    except Exception as e:
        debug_log.error("更新思考记录答案失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'更新思考记录答案失败: {str(e)}',
            method='PUT',
            endpoint=f'/api/thinking/records/{record_id}/answers'
        )


@thinking_bp.route('/records/<int:record_id>/summary', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def generate_summary(record_id):
    """生成AI总结和洞察"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        result = thinking_service.generate_ai_summary(
            record_id=record_id,
            user_id=g.current_user.id
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='POST',
                endpoint=f'/api/thinking/records/{record_id}/summary'
            )
        
    except Exception as e:
        debug_log.error("生成AI总结失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'生成AI总结失败: {str(e)}',
            method='POST',
            endpoint=f'/api/thinking/records/{record_id}/summary'
        )


@thinking_bp.route('/records/<int:record_id>/complete', methods=['POST', 'OPTIONS'])
@cross_origin()
@token_required
def mark_completed(record_id):
    """标记思考记录为完成"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        data = request.get_json() or {}
        time_spent = data.get('time_spent', 0)
        
        result = thinking_service.mark_completed(
            record_id=record_id,
            user_id=g.current_user.id,
            time_spent=time_spent
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='POST',
                endpoint=f'/api/thinking/records/{record_id}/complete'
            )
        
    except Exception as e:
        debug_log.error("标记思考记录完成失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'标记思考记录完成失败: {str(e)}',
            method='POST',
            endpoint=f'/api/thinking/records/{record_id}/complete'
        )


@thinking_bp.route('/records/<int:record_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@token_required
def delete_thinking_record(record_id):
    """删除思考记录"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        result = thinking_service.delete_thinking_record(
            record_id=record_id,
            user_id=g.current_user.id
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='DELETE',
                endpoint=f'/api/thinking/records/{record_id}'
            )
        
    except Exception as e:
        debug_log.error("删除思考记录失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'删除思考记录失败: {str(e)}',
            method='DELETE',
            endpoint=f'/api/thinking/records/{record_id}'
        )


@thinking_bp.route('/statistics', methods=['GET', 'OPTIONS'])
@cross_origin()
@token_required
def get_thinking_statistics():
    """获取思考工具使用统计"""
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight success'}), 200
    
    try:
        days = int(request.args.get('days', 30))
        
        if days <= 0 or days > 365:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'days参数必须在1-365之间',
                method='GET',
                endpoint='/api/thinking/statistics'
            )
        
        result = thinking_service.get_thinking_statistics(
            user_id=g.current_user.id,
            days=days
        )
        
        if result['success']:
            return create_success_response(
                data=result,
                message=result['message']
            )
        else:
            return create_error_response(
                ErrorCodes.OPERATION_FAILED,
                result['message'],
                method='GET',
                endpoint='/api/thinking/statistics'
            )
        
    except ValueError:
        return create_error_response(
            ErrorCodes.INVALID_FIELD_VALUE,
            'days参数必须是有效的整数',
            method='GET',
            endpoint='/api/thinking/statistics'
        )
    except Exception as e:
        debug_log.error("获取思考统计失败", str(e), traceback.format_exc())
        return create_error_response(
            ErrorCodes.INTERNAL_ERROR,
            f'获取思考统计失败: {str(e)}',
            method='GET',
            endpoint='/api/thinking/statistics'
        )
