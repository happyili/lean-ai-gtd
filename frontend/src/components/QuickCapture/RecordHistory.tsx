import { useState, useEffect } from 'react';

interface Record {
  id: number;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  status: string;
}

interface RecordHistoryProps {
  records: Record[];
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const categoryMap = {
  idea: { label: '想法', icon: '💡', color: 'bg-yellow-100 text-yellow-800' },
  task: { label: '任务', icon: '📋', color: 'bg-blue-100 text-blue-800' },
  note: { label: '笔记', icon: '📝', color: 'bg-green-100 text-green-800' },
  general: { label: '通用', icon: '📄', color: 'bg-gray-100 text-gray-800' }
};

export default function RecordHistory({ 
  records, 
  onDelete, 
  onSearch, 
  isCollapsed, 
  onToggleCollapse 
}: RecordHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = (id: number) => {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      // 3秒后自动取消确认状态
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className={`bg-white border-l border-gray-300 transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {/* 折叠/展开按钮 */}
      <div className="p-3 border-b border-gray-300">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-none transition-colors"
          title={isCollapsed ? '展开历史记录' : '折叠历史记录'}
        >
          {isCollapsed ? '📂' : '📁'}
          {!isCollapsed && <span className="ml-2 font-medium text-sm">历史记录</span>}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-300">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索记录..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* 记录列表 */}
          <div className="flex-1 overflow-y-auto max-h-96">
            {records.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? '未找到匹配的记录' : '暂无记录'}
              </div>
            ) : (
              <div className="py-2">
                {records.map((record) => {
                  const categoryInfo = categoryMap[record.category as keyof typeof categoryMap] || categoryMap.general;
                  
                  return (
                    <div key={record.id} className="group px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {/* 分类、时间和删除按钮 */}
                      <div className="flex justify-between items-start">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-none text-xs font-medium ${categoryInfo.color}`}>
                          <span className="mr-1">{categoryInfo.icon}</span>
                          {categoryInfo.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(record.created_at)}
                          </span>
                          {deleteConfirm === record.id ? (
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-none whitespace-nowrap"
                            >
                              确认删除
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(record.id)}
                              className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-none whitespace-nowrap"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* 内容 */}
                      <p className="text-sm text-gray-700 mt-1 leading-tight">
                        {truncateContent(record.content, 80)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 