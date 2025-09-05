from flask import Blueprint, request, jsonify
from app.models.record import Record, db
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
        record = Record(
            content=content,
            category=category
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
        
        # 构建查询
        query = Record.query.filter_by(status='active')
        
        if search:
            query = query.filter(Record.content.contains(search))
        
        if category and category in ['idea', 'task', 'note', 'general']:
            query = query.filter_by(category=category)
        
        # 分页查询
        records = query.order_by(Record.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'records': [record.to_dict() for record in records.items],
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