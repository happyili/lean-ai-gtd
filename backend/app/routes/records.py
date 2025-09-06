from flask import Blueprint, request, jsonify
from app.models.record import Record, db
from app.services.ai_intelligence import ai_intelligence_service
from datetime import datetime

records_bp = Blueprint('records', __name__)

@records_bp.route('/api/records', methods=['POST'])
def create_record():
    """创建新记录"""
    try:
        data = request.get_json()
        
        # 验证输入
        if not data or not data.get('content'):
            return jsonify({'error': '记录内容不能为空'}), 400
        
        content = data.get('content', '').strip()
        if len(content) > 5000:
            return jsonify({'error': '记录内容不能超过5000字符'}), 400
        
        category = data.get('category', 'general')
        if category not in ['idea', 'task', 'note', 'general']:
            category = 'general'
        
        # 创建记录
        parent_id = data.get('parent_id')
        if parent_id:
            # 验证父任务是否存在且为任务类型
            parent_record = Record.query.get(parent_id)
            if not parent_record or not parent_record.is_task():
                return jsonify({'error': '父任务不存在或不是任务类型'}), 400
        
        record = Record(
            content=content,
            category=category,
            parent_id=parent_id
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            'message': '记录创建成功',
            'record': record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建记录失败: {str(e)}'}), 500

@records_bp.route('/api/records', methods=['GET'])
def get_records():
    """获取记录列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        category = request.args.get('category', '')
        status = request.args.get('status', '')
        priority = request.args.get('priority', '')
        
        # 构建查询
        query = Record.query
        
        # 默认只显示非删除状态的记录
        if not status or status == 'all':
            query = query.filter(Record.status != 'deleted')
        elif status == 'pending':
            # 待办：显示所有非完成且非取消的任务
            query = query.filter(Record.status.notin_(['completed', 'cancelled', 'deleted']))
        else:
            query = query.filter_by(status=status)
        
        if search:
            query = query.filter(Record.content.contains(search))
        
        if category and category in ['idea', 'task', 'note', 'general']:
            query = query.filter_by(category=category)
        
        if priority and priority in ['low', 'medium', 'high', 'urgent']:
            query = query.filter_by(priority=priority)
        
        # 检查是否只获取顶级任务（不包含子任务）
        include_subtasks = request.args.get('include_subtasks', 'false').lower() == 'true'
        if not include_subtasks:
            query = query.filter(Record.parent_id.is_(None))
        
        # 分页查询
        records = query.order_by(Record.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'records': [record.to_dict(include_subtasks=include_subtasks) for record in records.items],
            'total': records.total,
            'page': records.page,
            'pages': records.pages,
            'per_page': records.per_page
        })
        
    except Exception as e:
        return jsonify({'error': f'获取记录失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    """删除记录（软删除）"""
    try:
        record = Record.query.get_or_404(record_id)
        record.status = 'deleted'
        record.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': '记录删除成功'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除记录失败: {str(e)}'}), 500

@records_bp.route('/api/records/search', methods=['GET'])
def search_records():
    """搜索记录"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'records': []}), 200
        
        # 搜索记录内容
        records = Record.query.filter(
            Record.status == 'active',
            Record.content.contains(query)
        ).order_by(Record.created_at.desc()).limit(50).all()
        
        return jsonify({
            'records': [record.to_dict() for record in records],
            'total': len(records)
        })
        
    except Exception as e:
        return jsonify({'error': f'搜索失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>/subtasks', methods=['GET'])
def get_subtasks(record_id):
    """获取指定任务的子任务"""
    try:
        parent_record = Record.query.get_or_404(record_id)
        
        if not parent_record.is_task():
            return jsonify({'error': '只有任务类型才能查看子任务'}), 400
        
        subtasks = parent_record.get_subtasks()
        
        return jsonify({
            'parent_task': parent_record.to_dict(),
            'subtasks': [subtask.to_dict() for subtask in subtasks],
            'total': len(subtasks)
        })
        
    except Exception as e:
        return jsonify({'error': f'获取子任务失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>/subtasks', methods=['POST'])
def create_subtask(record_id):
    """为指定任务创建子任务"""
    try:
        parent_record = Record.query.get_or_404(record_id)
        
        if not parent_record.is_task():
            return jsonify({'error': '只有任务类型才能添加子任务'}), 400
        
        data = request.get_json()
        if not data or not data.get('content'):
            return jsonify({'error': '子任务内容不能为空'}), 400
        
        content = data.get('content', '').strip()
        if len(content) > 5000:
            return jsonify({'error': '子任务内容不能超过5000字符'}), 400
        
        category = data.get('category', 'task')
        if category not in ['idea', 'task', 'note', 'general']:
            category = 'task'
        
        # 创建子任务
        subtask = parent_record.add_subtask(content, category)
        db.session.add(subtask)
        db.session.commit()
        
        return jsonify({
            'message': '子任务创建成功',
            'subtask': subtask.to_dict(),
            'parent_task': parent_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建子任务失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>', methods=['GET'])
def get_record(record_id):
    """获取单个记录的详细信息（包含子任务）"""
    try:
        record = Record.query.get_or_404(record_id)
        include_subtasks = request.args.get('include_subtasks', 'false').lower() == 'true'
        
        return jsonify({
            'record': record.to_dict(include_subtasks=include_subtasks)
        })
        
    except Exception as e:
        return jsonify({'error': f'获取记录失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>', methods=['PUT'])
def update_record(record_id):
    """更新记录"""
    try:
        record = Record.query.get_or_404(record_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求数据不能为空'}), 400
        
        # 更新允许的字段
        if 'content' in data:
            content = data.get('content', '').strip()
            if not content:
                return jsonify({'error': '记录内容不能为空'}), 400
            if len(content) > 5000:
                return jsonify({'error': '记录内容不能超过5000字符'}), 400
            record.content = content
        
        if 'status' in data:
            status = data.get('status')
            if status not in ['active', 'completed', 'paused', 'cancelled', 'archived', 'deleted']:
                return jsonify({'error': '无效的状态值'}), 400
            record.status = status
        
        if 'priority' in data:
            priority = data.get('priority')
            if priority not in ['low', 'medium', 'high', 'urgent']:
                return jsonify({'error': '无效的优先级值'}), 400
            record.priority = priority
        
        if 'progress_notes' in data:
            progress_notes = data.get('progress_notes', '')
            if len(progress_notes) > 10000:  # 限制进展记录长度
                return jsonify({'error': '进展记录不能超过10000字符'}), 400
            record.progress_notes = progress_notes
        
        if 'progress' in data:
            progress = data.get('progress', 0)
            if not isinstance(progress, int) or progress < 0 or progress > 100:
                return jsonify({'error': '进度值必须在0-100之间'}), 400
            record.progress = progress
        
        record.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': '记录更新成功',
            'record': record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新记录失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>/ai-analysis', methods=['POST'])
def analyze_task_with_ai(record_id):
    """使用AI分析任务进展并提供智能建议"""
    try:
        record = Record.query.get_or_404(record_id)
        
        # 只分析任务类型的记录
        if not record.is_task():
            return jsonify({'error': '只能对任务类型进行AI分析'}), 400
        
        # 获取子任务信息
        subtasks = record.get_subtasks()
        
        # 构建任务数据
        task_data = {
            'content': record.content,
            'progress_notes': getattr(record, 'progress_notes', ''),
            'status': record.status,
            'priority': record.priority,
            'subtasks': [
                {
                    'content': subtask.content,
                    'status': subtask.status,
                    'priority': subtask.priority
                } for subtask in subtasks
            ]
        }
        
        # 调用AI分析服务
        analysis_result = ai_intelligence_service.analyze_task_progress(task_data)
        
        return jsonify({
            'message': 'AI分析完成',
            'task_id': record_id,
            'analysis': analysis_result
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'AI分析失败: {str(e)}'}), 500

@records_bp.route('/api/records/<int:record_id>/create-subtasks-from-ai', methods=['POST'])
def create_subtasks_from_ai_suggestions(record_id):
    """基于AI建议批量创建子任务"""
    try:
        record = Record.query.get_or_404(record_id)
        
        if not record.is_task():
            return jsonify({'error': '只能为任务类型创建子任务'}), 400
        
        data = request.get_json()
        if not data or 'subtask_suggestions' not in data:
            return jsonify({'error': '缺少子任务建议数据'}), 400
        
        subtask_suggestions = data['subtask_suggestions']
        created_subtasks = []
        
        # 批量创建子任务
        for suggestion in subtask_suggestions:
            if not suggestion.get('title'):
                continue
                
            # 组合标题和描述作为内容
            content = suggestion['title']
            if suggestion.get('description'):
                content += f" - {suggestion['description']}"
            
            # 映射优先级
            priority_mapping = {
                'high': 'high',
                'medium': 'medium', 
                'low': 'low'
            }
            priority = priority_mapping.get(suggestion.get('priority', 'medium'), 'medium')
            
            # 创建子任务
            subtask = record.add_subtask(content, 'task')
            subtask.priority = priority
            db.session.add(subtask)
            
            created_subtasks.append({
                'content': content,
                'priority': priority,
                'estimated_time': suggestion.get('estimated_time', ''),
                'dependencies': suggestion.get('dependencies', [])
            })
        
        db.session.commit()
        
        return jsonify({
            'message': f'成功创建 {len(created_subtasks)} 个子任务',
            'created_subtasks': created_subtasks,
            'parent_task': record.to_dict(include_subtasks=True)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建子任务失败: {str(e)}'}), 500 