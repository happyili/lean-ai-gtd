from flask import Blueprint, request, jsonify
from app.database import db
from app.models.info_resource import InfoResource
from app.utils.auth_helpers import get_user_for_record_access, get_current_user
from app.utils.response_helpers import create_error_response, create_success_response, debug_log, ErrorCodes

def get_user_for_resource_access():
    """获取当前用户和访问级别（复用records.py的逻辑）"""
    try:
        # 尝试获取认证用户
        current_user = get_current_user()
        if current_user:
            return current_user, 'user', None
        else:
            return None, 'guest', None
    except Exception as e:
        # 认证失败，但允许访客访问
        return None, 'guest', str(e)

info_resources_bp = Blueprint('info_resources', __name__)

@info_resources_bp.route('/api/info-resources', methods=['POST'])
def create_info_resource():
    """创建新信息资源"""
    try:
        data = request.get_json()
        
        # 验证输入
        if not data or not data.get('title'):
            return create_error_response(
                ErrorCodes.MISSING_REQUIRED_FIELD,
                '资源标题不能为空',
                method='POST',
                endpoint='/api/info-resources'
            )
        
        title = data.get('title', '').strip()
        if len(title) > 200:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'title字段长度不能超过200字符',
                method='POST',
                endpoint='/api/info-resources'
            )
        
        content = data.get('content', '').strip()
        if not content:
            return create_error_response(
                ErrorCodes.MISSING_REQUIRED_FIELD,
                'content字段是必需的',
                method='POST',
                endpoint='/api/info-resources'
            )
        
        if len(content) > 10000:
            return create_error_response(
                ErrorCodes.INVALID_FIELD_VALUE,
                'content字段长度不能超过10000字符',
                method='POST',
                endpoint='/api/info-resources'
            )
        
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 资源类型验证
        resource_type = data.get('resource_type', 'general')
        if resource_type not in ['general', 'article', 'bookmark', 'note', 'reference', 'tutorial', 'other']:
            resource_type = 'general'
        
        # 创建信息资源
        info_resource = InfoResource(
            title=title,
            content=content,
            resource_type=resource_type,
            user_id=current_user.id if current_user else None
        )
        
        db.session.add(info_resource)
        db.session.commit()
        
        return create_success_response({
            'info_resource': info_resource.to_dict()
        }, '信息资源创建成功', method='POST', endpoint='/api/info-resources')
        
    except Exception as e:
        db.session.rollback()
        return create_error_response(
            ErrorCodes.DATABASE_ERROR,
            f'创建信息资源失败: {str(e)}',
            method='POST',
            endpoint='/api/info-resources'
        )

@info_resources_bp.route('/api/info-resources', methods=['GET'])
def get_info_resources():
    """获取信息资源列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        resource_type = request.args.get('resource_type', '')
        status = request.args.get('status', '')
        
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 构建查询 - 允许访客访问
        if access_level == 'user':
            # 登录用户只能查看自己的信息资源
            query = InfoResource.query.filter(InfoResource.user_id == current_user.id)
        else:
            # 未登录用户只能查看公共信息资源（user_id为NULL）
            query = InfoResource.query.filter(InfoResource.user_id.is_(None))
        
        # 默认只显示非删除状态的记录
        if not status or status == 'all':
            query = query.filter(InfoResource.status != 'deleted')
        else:
            query = query.filter_by(status=status)
        
        # 搜索功能
        if search:
            query = query.filter(
                db.or_(
                    InfoResource.title.contains(search),
                    InfoResource.content.contains(search)
                )
            )
        
        # 资源类型筛选
        if resource_type and resource_type in ['general', 'article', 'bookmark', 'note', 'reference', 'tutorial', 'other']:
            query = query.filter_by(resource_type=resource_type)
        
        # 分页查询
        resources = query.order_by(InfoResource.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'info_resources': [resource.to_dict() for resource in resources.items],
            'total': resources.total,
            'page': resources.page,
            'pages': resources.pages,
            'per_page': resources.per_page
        })
        
    except Exception as e:
        return create_error_response('DATABASE_ERROR', f'获取信息资源失败: {str(e)}')

@info_resources_bp.route('/api/info-resources/<int:resource_id>', methods=['GET'])
def get_info_resource(resource_id):
    """获取单个信息资源的详细信息"""
    try:
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 如果有认证错误（无效token），但仍然允许访客访问
        # 只有在明确需要认证的情况下才返回401
        
        # 查找信息资源
        if access_level == 'user':
            # 登录用户只能查看自己的信息资源
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id == current_user.id
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限查看'}), 404
        else:
            # 未登录用户只能查看公共信息资源
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id.is_(None)
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限查看'}), 404
        
        return jsonify({
            'info_resource': resource.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'获取信息资源失败: {str(e)}'}), 500

@info_resources_bp.route('/api/info-resources/<int:resource_id>', methods=['PUT'])
def update_info_resource(resource_id):
    """更新信息资源"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '请求数据不能为空'}), 400
        
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 如果有认证错误（无效token），但仍然允许访客访问
        # 只有在明确需要认证的情况下才返回401
        
        # 查找信息资源
        if access_level == 'user':
            # 登录用户只能更新自己的信息资源
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id == current_user.id
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限修改'}), 404
        else:
            # 未登录用户只能更新公共信息资源
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id.is_(None)
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限修改'}), 404
        
        # 更新字段
        if 'title' in data:
            title = data['title'].strip()
            if not title:
                return jsonify({'error': '资源标题不能为空'}), 400
            if len(title) > 200:
                return jsonify({'error': '资源标题不能超过200字符'}), 400
            resource.title = title
        
        if 'content' in data:
            content = data['content'].strip()
            if not content:
                return jsonify({'error': '资源内容不能为空'}), 400
            if len(content) > 10000:
                return jsonify({'error': '资源内容不能超过10000字符'}), 400
            resource.content = content
        
        if 'resource_type' in data:
            resource_type = data['resource_type']
            if resource_type in ['general', 'article', 'bookmark', 'note', 'reference', 'tutorial', 'other']:
                resource.resource_type = resource_type
        
        if 'status' in data:
            status = data['status']
            if status in ['active', 'archived', 'deleted']:
                resource.status = status
        
        db.session.commit()
        
        return jsonify({
            'message': '信息资源更新成功',
            'info_resource': resource.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'更新信息资源失败: {str(e)}'}), 500

@info_resources_bp.route('/api/info-resources/<int:resource_id>', methods=['DELETE'])
def delete_info_resource(resource_id):
    """删除信息资源（软删除）"""
    try:
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 如果有认证错误（无效token），但仍然允许访客访问
        # 只有在明确需要认证的情况下才返回401
        
        # 查找信息资源
        if access_level == 'user':
            # 登录用户只能删除自己的信息资源
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id == current_user.id
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限删除'}), 404
        else:
            # 未登录用户只能删除公共信息资源
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id.is_(None)
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限删除'}), 404
        
        # 软删除
        resource.soft_delete()
        db.session.commit()
        
        return jsonify({
            'message': '信息资源删除成功'
        })
        
    except Exception as e:
        return jsonify({'error': f'删除信息资源失败: {str(e)}'}), 500

@info_resources_bp.route('/api/info-resources/<int:resource_id>/archive', methods=['POST'])
def archive_info_resource(resource_id):
    """归档信息资源"""
    try:
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 如果有认证错误（无效token），但仍然允许访客访问
        # 只有在明确需要认证的情况下才返回401
        
        # 查找信息资源
        if access_level == 'user':
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id == current_user.id
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限操作'}), 404
        else:
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id.is_(None)
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限操作'}), 404
        
        # 归档
        resource.archive()
        db.session.commit()
        
        return jsonify({
            'message': '信息资源归档成功',
            'info_resource': resource.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'归档信息资源失败: {str(e)}'}), 500

@info_resources_bp.route('/api/info-resources/<int:resource_id>/restore', methods=['POST'])
def restore_info_resource(resource_id):
    """恢复信息资源"""
    try:
        # 获取当前用户
        current_user, access_level, auth_error = get_user_for_resource_access()
        
        # 如果有认证错误（无效token），但仍然允许访客访问
        # 只有在明确需要认证的情况下才返回401
        
        # 查找信息资源
        if access_level == 'user':
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id == current_user.id
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限操作'}), 404
        else:
            resource = InfoResource.query.filter(
                InfoResource.id == resource_id,
                InfoResource.user_id.is_(None)
            ).first()
            if not resource:
                return jsonify({'error': '信息资源不存在或无权限操作'}), 404
        
        # 恢复
        resource.restore()
        db.session.commit()
        
        return jsonify({
            'message': '信息资源恢复成功',
            'info_resource': resource.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'恢复信息资源失败: {str(e)}'}), 500
