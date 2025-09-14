import { useState, useEffect } from 'react';
import { buildUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  formatDate,
  DeleteButton,
  getDropdownStyle,
  getDropdownItemStyle
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

interface InfoResourceListProps {
  onViewDetail?: (resource: InfoResource) => void;
  onDelete?: (resourceId: number) => void;
  showNotification?: (message: string, type: 'success' | 'error') => void;
}

const resourceTypeMap = {
  'general': { label: '通用', color: 'default' },
  'article': { label: '文章', color: 'info' },
  'bookmark': { label: '书签', color: 'success' },
  'note': { label: '笔记', color: 'warning' },
  'reference': { label: '参考', color: 'purple' },
  'tutorial': { label: '教程', color: 'orange' },
  'other': { label: '其他', color: 'default' }
};

const statusMap = {
  'active': { label: '活跃', color: 'success' },
  'archived': { label: '已归档', color: 'warning' },
  'deleted': { label: '已删除', color: 'error' }
};

const getResourceTypeStyle = (color: string) => {
  const styles = {
    'default': { backgroundColor: 'var(--background-secondary)', color: 'var(--text-muted)' },
    'info': { backgroundColor: 'var(--info-bg)', color: 'var(--info)' },
    'success': { backgroundColor: 'var(--success-bg)', color: 'var(--success)' },
    'warning': { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
    'purple': { backgroundColor: 'var(--accent-purple-bg)', color: 'var(--accent-purple)' },
    'orange': { backgroundColor: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' },
    'error': { backgroundColor: 'var(--error-bg)', color: 'var(--error)' }
  };
  return styles[color as keyof typeof styles] || styles.default;
};

const getStatusStyle = (color: string) => {
  const styles = {
    'success': { backgroundColor: 'var(--success-bg)', color: 'var(--success)' },
    'warning': { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' },
    'error': { backgroundColor: 'var(--error-bg)', color: 'var(--error)' },
    'default': { backgroundColor: 'var(--background-secondary)', color: 'var(--text-muted)' }
  };
  return styles[color as keyof typeof styles] || styles.default;
};

export default function InfoResourceList({ 
  onViewDetail: _onViewDetail, 
  onDelete: _onDelete, 
  showNotification 
}: InfoResourceListProps) {
  const { isAuthenticated, accessToken } = useAuth();
  const [resources, setResources] = useState<InfoResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingResource, setEditingResource] = useState<number | null>(null);
  const [editingResourceTitle, setEditingResourceTitle] = useState<{[key: number]: string}>({});
  const [editingResourceContent, setEditingResourceContent] = useState<{[key: number]: string}>({});
  const [editingResourceType, setEditingResourceType] = useState<{[key: number]: string}>({});
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceContent, setNewResourceContent] = useState('');
  const [newResourceType, setNewResourceType] = useState('general');
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResources, setTotalResources] = useState(0);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<number | null>(null);
  const [resourceTypeDropdownOpen, setResourceTypeDropdownOpen] = useState<number | null>(null);
  const [expandedResource, setExpandedResource] = useState<number | null>(null);
  const [showStatsDetail, setShowStatsDetail] = useState(false);

  // 计算信息资源统计数据
  const calculateResourceStats = () => {
    const totalResources = resources.length;
    
    // 获取本周开始时间
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // 统计各种状态的资源
    const activeResources = resources.filter(resource => resource.status === 'active').length;
    const archivedResources = resources.filter(resource => resource.status === 'archived').length;
    
    // 本周新增的资源
    const thisWeekNew = resources.filter(resource => {
      return new Date(resource.created_at) >= startOfWeek;
    }).length;
    
    // 按类型统计
    const generalResources = resources.filter(resource => resource.resource_type === 'general').length;
    const articleResources = resources.filter(resource => resource.resource_type === 'article').length;
    const bookmarkResources = resources.filter(resource => resource.resource_type === 'bookmark').length;
    const noteResources = resources.filter(resource => resource.resource_type === 'note').length;
    const referenceResources = resources.filter(resource => resource.resource_type === 'reference').length;
    const tutorialResources = resources.filter(resource => resource.resource_type === 'tutorial').length;
    
    return {
      totalResources,
      activeResources,
      archivedResources,
      thisWeekNew,
      generalResources,
      articleResources,
      bookmarkResources,
      noteResources,
      referenceResources,
      tutorialResources
    };
  };

  const stats = calculateResourceStats();

  // 获取信息资源列表
  const fetchResources = async (page = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page: page,
        per_page: 30
      };

      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (resourceTypeFilter !== 'all') params.resource_type = resourceTypeFilter;

      const url = buildUrl('/api/info-resources', params);
      const response = await fetch(url, {
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResources(data.info_resources || []);
      setTotalPages(data.pages || 1);
      setTotalResources(data.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('获取信息资源失败:', error);
      showNotification?.('获取信息资源失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 创建新信息资源
  const createResource = async () => {
    if (!newResourceTitle.trim()) {
      showNotification?.('标题不能为空', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const url = buildUrl('/api/info-resources', {});
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newResourceTitle.trim(),
          content: newResourceContent.trim() || '',
          resource_type: newResourceType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      showNotification?.('信息资源创建成功', 'success');
      
      // 重置表单
      setNewResourceTitle('');
      setNewResourceContent('');
      setNewResourceType('general');
      setIsAddingResource(false);
      
      // 刷新列表
      fetchResources(1);
    } catch (error) {
      console.error('创建信息资源失败:', error);
      showNotification?.('创建信息资源失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新信息资源
  const updateResource = async (resourceId: number) => {
    const title = editingResourceTitle[resourceId];
    const content = editingResourceContent[resourceId];
    const resourceType = editingResourceType[resourceId];

    if (!title?.trim()) {
      showNotification?.('标题不能为空', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const url = buildUrl(`/api/info-resources/${resourceId}`, {});
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content?.trim() || '',
          resource_type: resourceType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification?.('信息资源更新成功', 'success');
      setEditingResource(null);
      
      // 刷新列表
      fetchResources(currentPage);
    } catch (error) {
      console.error('更新信息资源失败:', error);
      showNotification?.('更新信息资源失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新资源状态
  const handleUpdateStatus = async (resourceId: number, newStatus: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/info-resources/${resourceId}`,
          { status: newStatus },
          '更新资源状态',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/info-resources/${resourceId}`,
          { status: newStatus },
          '更新资源状态'
        );
      }

      // 更新本地状态
      setResources(prevResources => 
        prevResources.map(resource => 
          resource.id === resourceId 
            ? { ...resource, status: newStatus }
            : resource
        )
      );
    } catch (error) {
      console.error('更新资源状态失败:', error);
      showNotification?.(error instanceof Error ? error.message : '更新资源状态失败', 'error');
    }
  };

  // 更新资源类型
  const handleUpdateResourceType = async (resourceId: number, newResourceType: string) => {
    try {
      const { apiPut, apiPutPublic } = await import('@/utils/api');
      
      if (isAuthenticated && accessToken) {
        await apiPut(
          `/api/info-resources/${resourceId}`,
          { resource_type: newResourceType },
          '更新资源类型',
          accessToken
        );
      } else {
        await apiPutPublic(
          `/api/info-resources/${resourceId}`,
          { resource_type: newResourceType },
          '更新资源类型'
        );
      }

      // 更新本地状态
      setResources(prevResources => 
        prevResources.map(resource => 
          resource.id === resourceId 
            ? { ...resource, resource_type: newResourceType }
            : resource
        )
      );
    } catch (error) {
      console.error('更新资源类型失败:', error);
      showNotification?.(error instanceof Error ? error.message : '更新资源类型失败', 'error');
    }
  };

  // 删除信息资源
  const deleteResource = async (resourceId: number) => {
    setIsLoading(true);
    try {
      const url = buildUrl(`/api/info-resources/${resourceId}`, {});
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      showNotification?.('信息资源删除成功', 'success');
      setDeleteConfirm(null);
      
      // 刷新列表
      fetchResources(currentPage);
    } catch (error) {
      console.error('删除信息资源失败:', error);
      showNotification?.('删除信息资源失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // 监听来自banner的搜索和筛选事件
  useEffect(() => {
    const handleSearch = (e: any) => {
      setSearchQuery(e.detail.query);
    };

    const handleFilter = (e: any) => {
      if (e.detail.type === 'status') {
        setStatusFilter(e.detail.value);
      } else if (e.detail.type === 'resourceType') {
        setResourceTypeFilter(e.detail.value);
      }
    };

    window.addEventListener('infoResourceSearch', handleSearch);
    window.addEventListener('infoResourceFilter', handleFilter);

    return () => {
      window.removeEventListener('infoResourceSearch', handleSearch);
      window.removeEventListener('infoResourceFilter', handleFilter);
    };
  }, []);

  // 初始化加载和筛选变化时重新加载 - 合并为一个useEffect避免重复调用
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await fetchResources(1);
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [statusFilter, resourceTypeFilter]);

  // 开始编辑
  const startEditing = (resource: InfoResource) => {
    setEditingResource(resource.id);
    setEditingResourceTitle({ [resource.id]: resource.title });
    setEditingResourceContent({ [resource.id]: resource.content });
    setEditingResourceType({ [resource.id]: resource.resource_type });
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingResource(null);
    setEditingResourceTitle({});
    setEditingResourceContent({});
    setEditingResourceType({});
  };

  // 保存编辑
  const saveEdit = async (resourceId: number) => {
    const title = editingResourceTitle[resourceId]?.trim();
    
    if (!title) return;

    try {
      await updateResource(resourceId);
      setEditingResource(null);
      setEditingResourceTitle(prev => {
        const newState = { ...prev };
        delete newState[resourceId];
        return newState;
      });
      setEditingResourceContent(prev => {
        const newState = { ...prev };
        delete newState[resourceId];
        return newState;
      });
      setEditingResourceType(prev => {
        const newState = { ...prev };
        delete newState[resourceId];
        return newState;
      });
    } catch (error) {
      console.error('保存编辑失败:', error);
    }
  };

  // 处理资源点击展开/收起
  const handleResourceClick = (resource: InfoResource) => {
    if (expandedResource === resource.id) {
      setExpandedResource(null);
    } else {
      setExpandedResource(resource.id);
    }
  };

  // 处理删除确认
  const handleDelete = async (id: number) => {
    if (deleteConfirm === id) {
      await deleteResource(id);
    } else {
      setDeleteConfirm(id);
      // 3秒后自动取消确认状态
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // 生成分页按钮
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // 翻页处理函数
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      fetchResources(page);
    }
  };

  return (
    <div className="h-full flex flex-col card">
      {/* 头部 */}
      <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-heading-2" style={{ color: 'var(--text-primary)' }}>信息资源</h2>
          <div className="flex items-center space-x-3">
            {/* 详细统计 */}
            <div className="relative">
              <button
                onClick={() => setShowStatsDetail(!showStatsDetail)}
                className="px-4 py-1 rounded-xl cursor-pointer hover:shadow-sm transition-all flex items-center space-x-2"
                style={{ 
                  backgroundColor: 'var(--card-background)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--text-primary)' }}>
                      {stats.totalResources}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      总资源
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--success)' }}>
                      {stats.activeResources}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      活跃
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-body-small font-bold" style={{ color: 'var(--primary)' }}>
                      {stats.thisWeekNew}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      本周新增
                    </div>
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {showStatsDetail ? '▲' : '▼'}
                </span>
              </button>
              
              {/* 展开的详细统计 */}
              {showStatsDetail && (
                <div 
                  className="absolute top-full right-0 mt-2 p-4 card shadow-lg z-50 w-80"
                  style={{ 
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div className="space-y-3">
                    {/* 资源状态分布 */}
                    <div>
                      <h4 className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        资源状态分布
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded" style={{ backgroundColor: 'var(--success-bg)' }}>
                          <div className="text-sm font-bold" style={{ color: 'var(--success)' }}>{stats.activeResources}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>活跃</div>
                        </div>
                        <div className="p-2 rounded" style={{ backgroundColor: 'var(--warning-bg)' }}>
                          <div className="text-sm font-bold" style={{ color: 'var(--warning)' }}>{stats.archivedResources}</div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>已归档</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 资源类型分布 */}
                    <div>
                      <h4 className="text-body-small font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        资源类型分布
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--primary)' }}></div>
                          <span>通用: {stats.generalResources}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--info)' }}></div>
                          <span>文章: {stats.articleResources}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--success)' }}></div>
                          <span>书签: {stats.bookmarkResources}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--warning)' }}></div>
                          <span>笔记: {stats.noteResources}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--accent-purple)' }}></div>
                          <span>参考: {stats.referenceResources}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: 'var(--accent-amber)' }}></div>
                          <span>教程: {stats.tutorialResources}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsAddingResource(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              添加资源
            </button>
          </div>
        </div>
      </div>


      {/* 添加新资源表单 */}
      {isAddingResource && (
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--card-background)' }}>
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="资源标题"
                value={newResourceTitle}
                onChange={(e) => setNewResourceTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <textarea
                placeholder="资源内容"
                value={newResourceContent}
                onChange={(e) => setNewResourceContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={newResourceType}
                onChange={(e) => setNewResourceType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(resourceTypeMap).map(([value, info]) => (
                  <option key={value} value={value}>{info.label}</option>
                ))}
              </select>
              <button
                onClick={createResource}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsAddingResource(false);
                  setNewResourceTitle('');
                  setNewResourceContent('');
                  setNewResourceType('general');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 资源列表 - 采用TaskList的紧凑风格 */}
      <div className="flex-1 overflow-y-auto">
        {/* 始终显示的资源输入框 */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--background-secondary)' }}>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={newResourceTitle}
                onChange={(e) => setNewResourceTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createResource();
                  }
                }}
                placeholder="▶ 输入新资源标题..."
                className="w-full px-2 py-1 rounded-lg form-input text-body"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={createResource}
                disabled={!newResourceTitle.trim()}
                className="px-2 py-1 rounded-lg btn-primary text-xs font-medium"
                style={{ 
                  background: newResourceTitle.trim() ? 'var(--primary)' : 'var(--text-disabled)',
                  color: 'white',
                  border: `1px solid ${newResourceTitle.trim() ? 'var(--primary)' : 'var(--text-disabled)'}`
                }}
              >
                + 资源
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-body font-semibold" style={{ color: 'var(--text-muted)' }}>加载中...</div>
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
            <div className="text-4xl mb-3">📚</div>
            <div className="text-body-large font-semibold">暂无信息资源</div>
            <div className="text-body-small mt-1">点击上方"+ 资源"开始添加</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {resources.map((resource) => {
              const resourceTypeInfo = resourceTypeMap[resource.resource_type as keyof typeof resourceTypeMap] || resourceTypeMap.general;
              const statusInfo = statusMap[resource.status as keyof typeof statusMap] || statusMap.active;
              const isExpanded = expandedResource === resource.id;
              
              return (
                <div key={resource.id} className="group" 
                  style={{ 
                    borderColor: 'var(--border-light)',
                    borderBottom: '1px solid var(--border-light)'
                  }}>
                  {/* 资源单行显示 */}
                  <div 
                    className="flex items-center justify-between p-3 hover:bg-opacity-50 transition-all"
                    style={{ 
                      backgroundColor: isExpanded ? 'var(--background-secondary)' : 'transparent',
                      paddingLeft: '1rem',
                      paddingRight: 0
                    }}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {/* 展开/收缩指示器 */}
                      <button 
                        className="text-xs cursor-pointer hover:opacity-70 transition-opacity" 
                        style={{ color: 'var(--text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResourceClick(resource);
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      
                      {/* 资源内容 */}
                      <div className="flex-1 min-w-0">
                        {editingResource === resource.id ? (
                          <input
                            type="text"
                            value={editingResourceTitle[resource.id] || ''}
                            onChange={(e) => setEditingResourceTitle({ ...editingResourceTitle, [resource.id]: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveEdit(resource.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            onBlur={() => saveEdit(resource.id)}
                            className="w-full px-2 py-1 text-body font-medium rounded form-input"
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)'
                            }}
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-body font-medium cursor-pointer hover:underline task-content-truncated task-content-responsive main-task-width block" 
                            style={{ 
                              color: 'var(--text-primary)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(resource);
                            }}
                            title={resource.title}
                          >
                            {/* 为guest用户的资源添加GUEST标签 */}
                            {resource.user_id === null && (
                              <span className="inline-block text-xs px-2 py-1 rounded mr-2 font-medium" style={{ backgroundColor: 'var(--background-secondary)', color: 'var(--text-muted)' }}>
                                GUEST
                              </span>
                            )}
                            {resource.title}
                          </span>
                        )}
                      </div>
                      
                      {/* 状态和类型标签 */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* 可点击的资源类型标签带下拉菜单 */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResourceTypeDropdownOpen(resourceTypeDropdownOpen === resource.id ? null : resource.id);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                            style={getResourceTypeStyle(resourceTypeInfo.color)}
                          >
                            <span>{resourceTypeInfo.label}</span>
                            <span className="text-xs">▼</span>
                          </button>
                          
                          {/* 资源类型下拉菜单 */}
                          {resourceTypeDropdownOpen === resource.id && (
                            <div {...getDropdownStyle()}>
                              {Object.entries(resourceTypeMap).map(([key, info]) => (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateResourceType(resource.id, key);
                                    setResourceTypeDropdownOpen(null);
                                  }}
                                  {...getDropdownItemStyle(resource.resource_type === key)}
                                >
                                  {info.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* 可点击的状态标签带下拉菜单 */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusDropdownOpen(statusDropdownOpen === resource.id ? null : resource.id);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer hover:opacity-80 transition-all flex items-center space-x-1"
                            style={getStatusStyle(statusInfo.color)}
                          >
                            <span>{statusInfo.label}</span>
                            <span className="text-xs">▼</span>
                          </button>
                          
                          {/* 状态下拉菜单 */}
                          {statusDropdownOpen === resource.id && (
                            <div {...getDropdownStyle()}>
                              {Object.entries(statusMap).map(([key, info]) => (
                                <button
                                  key={key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(resource.id, key);
                                    setStatusDropdownOpen(null);
                                  }}
                                  {...getDropdownItemStyle(resource.status === key)}
                                >
                                  {info.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 时间 */}
                      <div className="text-caption" style={{ color: 'var(--text-muted)', marginRight: 4 }}>
                        {formatDate(resource.created_at)}
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-2">
                        <DeleteButton
                          id={resource.id}
                          deleteConfirm={deleteConfirm}
                          onDelete={(id) => {
                            handleDelete(id);
                          }}
                          onSetDeleteConfirm={(id) => {
                            setDeleteConfirm(id);
                          }}
                          size="small"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 展开区域 - 显示详细内容编辑 */}
                  {isExpanded && (
                    <div className="pl-12 pr-6 py-4" style={{ backgroundColor: 'var(--background-secondary)', borderTop: '1px solid var(--border-light)' }}>
                      <div className="space-y-4">
                        {/* 内容编辑区域 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-body-small font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              📝 内容编辑：
                            </label>
                          </div>
                          <textarea
                            value={editingResourceContent[resource.id] || resource.content}
                            onChange={(e) => setEditingResourceContent({ ...editingResourceContent, [resource.id]: e.target.value })}
                            placeholder="输入资源内容..."
                            className="w-full p-4 rounded-lg form-input text-body-small resize-none"
                            rows={5}
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)',
                              minHeight: '120px'
                            }}
                          />
                        </div>

                        {/* 操作按钮区域 */}
                        <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit(resource.id);
                              }}
                              className="text-xs px-3 py-1 rounded btn-primary"
                            >
                              💾 保存更改
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEditing();
                              }}
                              className="text-xs px-3 py-1 rounded btn-secondary"
                            >
                              ❌ 取消编辑
                            </button>
                          </div>
                          <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
                            {(editingResourceContent[resource.id] || resource.content).length} 字符
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--card-background)' }}>
          <div className="flex items-center justify-between">
            {/* 左侧：显示资源总数和当前页信息 */}
            <div className="flex items-center space-x-4">
              <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>
                共 {totalResources} 个资源，第 {currentPage} / {totalPages} 页
              </span>
            </div>
            
            {/* 中间：翻页按钮 */}
            <div className="flex items-center space-x-2">
              {/* 上一页按钮 */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`px-3 py-2 rounded-lg text-body-small font-medium transition-all ${
                  currentPage <= 1 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:btn-secondary cursor-pointer'
                }`}
                style={{ 
                  backgroundColor: currentPage <= 1 ? 'var(--background-secondary)' : 'transparent',
                  color: currentPage <= 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
                  border: `1px solid ${currentPage <= 1 ? 'var(--border-light)' : 'var(--border-default)'}`
                }}
              >
                ← 上一页
              </button>
              
              {/* 页码按钮 */}
              <div className="flex items-center space-x-1">
                {generatePageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' ? handlePageChange(page) : undefined}
                    disabled={page === '...'}
                    className={`px-3 py-2 rounded-lg text-body-small font-medium transition-all ${
                      page === currentPage
                        ? 'text-white'
                        : page === '...'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:btn-secondary cursor-pointer'
                    }`}
                    style={{ 
                      backgroundColor: page === currentPage ? 'var(--primary)' : 'transparent',
                      color: page === currentPage ? 'white' : page === '...' ? 'var(--text-disabled)' : 'var(--text-primary)',
                      border: `1px solid ${page === currentPage ? 'var(--primary)' : 'var(--border-light)'}`,
                      minWidth: '40px'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              {/* 下一页按钮 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={`px-3 py-2 rounded-lg text-body-small font-medium transition-all ${
                  currentPage >= totalPages 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:btn-secondary cursor-pointer'
                }`}
                style={{ 
                  backgroundColor: currentPage >= totalPages ? 'var(--background-secondary)' : 'transparent',
                  color: currentPage >= totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
                  border: `1px solid ${currentPage >= totalPages ? 'var(--border-light)' : 'var(--border-default)'}`
                }}
              >
                下一页 →
              </button>
            </div>
            
            {/* 右侧：快速跳转 */}
            <div className="flex items-center space-x-2">
              <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>跳转到</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    handlePageChange(page);
                  }
                }}
                className="w-16 px-2 py-1 rounded form-input text-center text-body-small"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
              <span className="text-body-small" style={{ color: 'var(--text-muted)' }}>页</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}