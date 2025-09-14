import { useState } from 'react';
import { apiPut, apiDelete, apiPost } from '@/utils/api';
import { 
  formatDetailedDate
} from '@/utils/uiComponents';

interface InfoResource {
  id: number;
  title: string;
  content: string;
  resource_type: string;
  user_id?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface InfoResourceDetailProps {
  resource: InfoResource;
  onClose: () => void;
  onUpdate: (resource: InfoResource) => void;
  onDelete: (resourceId: number) => void;
}

const resourceTypeMap = {
  'general': '通用',
  'article': '文章',
  'bookmark': '书签',
  'note': '笔记',
  'reference': '参考',
  'tutorial': '教程',
  'other': '其他'
};

const statusMap = {
  'active': '活跃',
  'archived': '已归档',
  'deleted': '已删除'
};

const getResourceTypeStyle = (type: string) => {
  const styles = {
    'general': 'bg-gray-100 text-gray-800',
    'article': 'bg-blue-100 text-blue-800',
    'bookmark': 'bg-green-100 text-green-800',
    'note': 'bg-yellow-100 text-yellow-800',
    'reference': 'bg-purple-100 text-purple-800',
    'tutorial': 'bg-orange-100 text-orange-800',
    'other': 'bg-gray-100 text-gray-800'
  };
  return styles[type as keyof typeof styles] || styles.general;
};

const getStatusStyle = (status: string) => {
  const styles = {
    'active': 'bg-green-100 text-green-800',
    'archived': 'bg-yellow-100 text-yellow-800',
    'deleted': 'bg-red-100 text-red-800'
  };
  return styles[status as keyof typeof styles] || styles.active;
};

export default function InfoResourceDetail({ 
  resource, 
  onClose, 
  onUpdate, 
  onDelete 
}: InfoResourceDetailProps) {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(resource.title);
  const [editedContent, setEditedContent] = useState(resource.content);
  const [editedResourceType, setEditedResourceType] = useState(resource.resource_type);
  const [status, setStatus] = useState(resource.status);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // 更新资源
  const handleUpdate = async () => {
    if (!editedTitle.trim()) {
      showNotification('标题不能为空', 'error');
      return;
    }

    try {
      const response = await apiPut(`/api/info-resources/${resource.id}`, {
        title: editedTitle.trim(),
        content: editedContent.trim(),
        resource_type: editedResourceType,
        status: status
      }, '更新信息资源');

      const data = await response.json();
      showNotification('信息资源更新成功', 'success');
      setIsEditing(false);
      onUpdate(data.info_resource);
    } catch (error) {
      console.error('更新信息资源失败:', error);
      showNotification('更新信息资源失败', 'error');
    }
  };

  // 删除资源
  const handleDelete = async () => {
    try {
      await apiDelete(`/api/info-resources/${resource.id}`, '删除信息资源');

      showNotification('信息资源删除成功', 'success');
      onDelete(resource.id);
      onClose();
    } catch (error) {
      console.error('删除信息资源失败:', error);
      showNotification('删除信息资源失败', 'error');
    }
  };

  // 归档资源
  const handleArchive = async () => {
    try {
      const response = await apiPost(`/api/info-resources/${resource.id}/archive`, {}, '归档信息资源');

      const data = await response.json();
      showNotification('信息资源归档成功', 'success');
      onUpdate(data.info_resource);
    } catch (error) {
      console.error('归档信息资源失败:', error);
      showNotification('归档信息资源失败', 'error');
    }
  };

  // 恢复资源
  const handleRestore = async () => {
    try {
      const response = await apiPost(`/api/info-resources/${resource.id}/restore`, {}, '恢复信息资源');

      const data = await response.json();
      showNotification('信息资源恢复成功', 'success');
      onUpdate(data.info_resource);
    } catch (error) {
      console.error('恢复信息资源失败:', error);
      showNotification('恢复信息资源失败', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">信息资源详情</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 通知 */}
        {notification && (
          <div className={`px-6 py-3 ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isEditing ? (
            // 编辑模式
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">资源类型</label>
                  <select
                    value={editedResourceType}
                    onChange={(e) => setEditedResourceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(resourceTypeMap).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">活跃</option>
                    <option value="archived">已归档</option>
                    <option value="deleted">已删除</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  保存更改
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(resource.title);
                    setEditedContent(resource.content);
                    setEditedResourceType(resource.resource_type);
                    setStatus(resource.status);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            // 查看模式
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{resource.title}</h1>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${getResourceTypeStyle(resource.resource_type)}`}>
                      {resourceTypeMap[resource.resource_type as keyof typeof resourceTypeMap]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(resource.status)}`}>
                      {statusMap[resource.status as keyof typeof statusMap]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50"
                  >
                    编辑
                  </button>
                  {resource.status === 'active' ? (
                    <button
                      onClick={handleArchive}
                      className="px-3 py-1 text-yellow-600 hover:text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-50"
                    >
                      归档
                    </button>
                  ) : (
                    <button
                      onClick={handleRestore}
                      className="px-3 py-1 text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50"
                    >
                      恢复
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 py-1 text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* 内容 */}
              <div>
                <h3 className="text-lg font-medium mb-3">内容</h3>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {resource.content}
                  </div>
                </div>
              </div>

              {/* 元信息 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">元信息</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">创建时间:</span>
                    <br />
                    {formatDetailedDate(resource.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">更新时间:</span>
                    <br />
                    {formatDetailedDate(resource.updated_at)}
                  </div>
                  <div>
                    <span className="font-medium">资源ID:</span>
                    <br />
                    {resource.id}
                  </div>
                  <div>
                    <span className="font-medium">用户ID:</span>
                    <br />
                    {resource.user_id || '访客'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 删除确认对话框 */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">确认删除</h3>
              <p className="text-gray-600 mb-6">确定要删除这个信息资源吗？此操作不可撤销。</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
