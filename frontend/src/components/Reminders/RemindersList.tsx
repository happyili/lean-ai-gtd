import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import { formatDate, DeleteButton } from '@/utils/uiComponents';

type Frequency = 'daily' | 'weekly' | 'weekdays';

interface Reminder {
  id: number;
  user_id?: number | null;
  content: string;
  frequency: Frequency;
  day_of_week: number | null;
  remind_time: string; // 'HH:MM' UTC
  status: 'active' | 'paused' | 'deleted';
  last_triggered_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RemindersListProps {
  accessToken: string | null;
}

const weekdays = ['周一','周二','周三','周四','周五','周六','周日'];

export default function RemindersList({ accessToken }: RemindersListProps) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState<Partial<Reminder>>({
    content: '',
    frequency: 'daily',
    day_of_week: 0,
    remind_time: '09:00',
  });
  const [editingReminder, setEditingReminder] = useState<number | null>(null);
  const [editingReminderContent, setEditingReminderContent] = useState<{[key: number]: string}>({});
  const [editingReminderTime, setEditingReminderTime] = useState<{[key: number]: string}>({});
  const [editingReminderFrequency, setEditingReminderFrequency] = useState<{[key: number]: Frequency}>({});
  const [savingId, setSavingId] = useState<number | 'new' | null>(null);
  const [expandedReminder, setExpandedReminder] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const headersToken = accessToken || undefined;

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter(i => i.content.toLowerCase().includes(q.toLowerCase()));
  }, [items, search]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet(`/api/reminders?status=active&search=${encodeURIComponent(search)}`, '加载提醒', headersToken);
      const data = await res.json();
      setItems(data.reminders || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async () => {
    if (!newItem.content || !newItem.remind_time || !newItem.frequency) return;
    setSavingId('new');
    try {
      const res = await apiPost('/api/reminders', {
        content: newItem.content,
        frequency: newItem.frequency,
        day_of_week: newItem.frequency === 'weekly' ? newItem.day_of_week : null,
        remind_time: newItem.remind_time,
      }, '创建提醒', headersToken);
      const data = await res.json();
      setItems([data.reminder, ...items]);
      setNewItem({ content: '', frequency: 'daily', day_of_week: 0, remind_time: '09:00' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSavingId(null);
    }
  };

  // 取消编辑提醒
  const cancelEditingReminder = () => {
    setEditingReminder(null);
    setEditingReminderContent({});
    setEditingReminderTime({});
    setEditingReminderFrequency({});
  };

  // 保存提醒内容编辑
  const saveReminderContentEdit = async (reminderId: number) => {
    const newContent = editingReminderContent[reminderId]?.trim();
    if (!newContent) return;

    setSavingId(reminderId);
    try {
      const reminder = items.find(it => it.id === reminderId);
      if (!reminder) return;

      const res = await apiPut(`/api/reminders/${reminderId}`, {
        content: newContent,
        frequency: reminder.frequency,
        day_of_week: reminder.frequency === 'weekly' ? reminder.day_of_week : null,
        remind_time: reminder.remind_time,
      }, '更新提醒内容', headersToken);
      const data = await res.json();
      setItems(items.map(it => it.id === reminderId ? data.reminder : it));

      // 结束编辑状态
      setEditingReminder(null);
      setEditingReminderContent(prev => {
        const newState = { ...prev };
        delete newState[reminderId];
        return newState;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    } finally {
      setSavingId(null);
    }
  };

  // 保存提醒时间编辑
  const saveReminderTimeEdit = async (reminderId: number) => {
    const newTime = editingReminderTime[reminderId];
    if (!newTime) return;

    setSavingId(reminderId);
    try {
      const reminder = items.find(it => it.id === reminderId);
      if (!reminder) return;

      const res = await apiPut(`/api/reminders/${reminderId}`, {
        content: reminder.content,
        frequency: reminder.frequency,
        day_of_week: reminder.frequency === 'weekly' ? reminder.day_of_week : null,
        remind_time: newTime,
      }, '更新提醒时间', headersToken);
      const data = await res.json();
      setItems(items.map(it => it.id === reminderId ? data.reminder : it));

      // 结束编辑状态
      setEditingReminderTime(prev => {
        const newState = { ...prev };
        delete newState[reminderId];
        return newState;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    } finally {
      setSavingId(null);
    }
  };

  // 保存提醒频次编辑
  const saveReminderFrequencyEdit = async (reminderId: number) => {
    const newFrequency = editingReminderFrequency[reminderId];
    if (!newFrequency) return;

    setSavingId(reminderId);
    try {
      const reminder = items.find(it => it.id === reminderId);
      if (!reminder) return;

      const res = await apiPut(`/api/reminders/${reminderId}`, {
        content: reminder.content,
        frequency: newFrequency,
        day_of_week: newFrequency === 'weekly' ? reminder.day_of_week : null,
        remind_time: reminder.remind_time,
      }, '更新提醒频次', headersToken);
      const data = await res.json();
      setItems(items.map(it => it.id === reminderId ? data.reminder : it));

      // 结束编辑状态
      setEditingReminderFrequency(prev => {
        const newState = { ...prev };
        delete newState[reminderId];
        return newState;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    } finally {
      setSavingId(null);
    }
  };

  const onPause = async (id: number) => {
    setSavingId(id);
    try {
      const res = await apiPost(`/api/reminders/${id}/pause`, {}, '暂停提醒', headersToken);
      const data = await res.json();
      setItems(items.map(it => it.id === id ? data.reminder : it));
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSavingId(null);
    }
  };

  const onResume = async (id: number) => {
    setSavingId(id);
    try {
      const res = await apiPost(`/api/reminders/${id}/resume`, {}, '恢复提醒', headersToken);
      const data = await res.json();
      setItems(items.map(it => it.id === id ? data.reminder : it));
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (id: number) => {
    setSavingId(id);
    try {
      await apiDelete(`/api/reminders/${id}`, '删除提醒', headersToken);
      setItems(items.filter(it => it.id !== id));
      setDeleteConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setSavingId(null);
    }
  };

  const getFrequencyText = (reminder: Reminder) => {
    switch (reminder.frequency) {
      case 'daily': return '每日';
      case 'weekdays': return '工作日';
      case 'weekly': return `每周${weekdays[reminder.day_of_week ?? 0]}`;
      default: return '未知';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return {
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          border: '1px solid var(--success)'
        };
      case 'paused':
        return {
          backgroundColor: 'var(--warning-bg)',
          color: 'var(--warning)',
          border: '1px solid var(--warning)'
        };
      default:
        return {
          backgroundColor: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-default)'
        };
    }
  };

  return (
    <div className="h-full flex flex-col card">
      {/* 头部 - 参考TaskList风格 */}
      <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-heading-2" style={{ color: 'var(--text-primary)' }}>定时提醒</h2>
          </div>
          <div className="flex items-center space-x-3">
            {/* 搜索框 */}
            <div className="relative">
              <input
                placeholder="搜索提醒内容..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1 rounded-lg text-sm form-input"
                style={{ 
                  backgroundColor: 'var(--card-background)', 
                  border: '1px solid var(--border-light)', 
                  color: 'var(--text-primary)',
                  width: '200px'
                }}
              />
            </div>
            {/* 刷新按钮 */}
            <button
              onClick={load}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all hover:btn-secondary"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              title="刷新提醒列表"
            >
              🔄 刷新
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-6 mt-4 px-3 py-2 rounded-lg" style={{ 
            backgroundColor: 'var(--error-bg)', 
            color: 'var(--error)', 
            border: '1px solid var(--error)' 
          }}>
            {error}
          </div>
        )}

        {/* 始终显示的提醒输入框 */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--background-secondary)' }}>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={newItem.content || ''}
                onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onCreate();
                  }
                }}
                placeholder="▶ 输入新提醒内容..."
                className="w-full px-2 py-1 rounded-lg form-input text-body"
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                className="px-2 py-1 rounded text-xs"
                value={newItem.frequency as string}
                onChange={e => setNewItem({ ...newItem, frequency: e.target.value as Frequency })}
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="daily">每日</option>
                <option value="weekdays">工作日</option>
                <option value="weekly">每周</option>
              </select>
              {newItem.frequency === 'weekly' && (
                <select
                  className="px-2 py-1 rounded text-xs"
                  value={String(newItem.day_of_week ?? 0)}
                  onChange={e => setNewItem({ ...newItem, day_of_week: Number(e.target.value) })}
                  style={{
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {weekdays.map((w, idx) => (
                    <option key={idx} value={idx}>{w}</option>
                  ))}
                </select>
              )}
              <input
                type="time"
                className="px-2 py-1 rounded text-xs"
                value={newItem.remind_time || '09:00'}
                onChange={e => setNewItem({ ...newItem, remind_time: e.target.value })}
                style={{
                  backgroundColor: 'var(--card-background)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                disabled={savingId === 'new' || !newItem.content?.trim()}
                onClick={onCreate}
                className="px-3 py-1 rounded text-xs text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--success)' }}
                title="保存提醒"
              >
                保存
              </button>
            </div>
          </div>
        </div>

        {/* 提醒列表 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <div className="text-body-small mt-2">加载中...</div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {filtered.map((reminder) => {
              const isExpanded = expandedReminder === reminder.id;
              const isEditingContent = editingReminder === reminder.id;
              const isEditingTime = editingReminderTime[reminder.id] !== undefined;
              const isEditingFrequency = editingReminderFrequency[reminder.id] !== undefined;
              
              return (
                <div key={reminder.id} className="group" 
                  style={{ 
                    borderColor: 'var(--border-light)',
                    borderBottom:'1px solid var(--border-light)'
                  }}>
                  {/* 提醒单行显示 */}
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
                          setExpandedReminder(isExpanded ? null : reminder.id);
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>

                      {/* 提醒图标 */}
                      <span className="text-lg">⏰</span>

                      {/* 提醒内容 */}
                      <div className="flex-1 min-w-0">
                        {isEditingContent ? (
                          <input
                            type="text"
                            value={editingReminderContent[reminder.id] || reminder.content}
                            onChange={(e) => setEditingReminderContent(prev => ({
                              ...prev,
                              [reminder.id]: e.target.value
                            }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveReminderContentEdit(reminder.id);
                              } else if (e.key === 'Escape') {
                                cancelEditingReminder();
                              }
                            }}
                            onBlur={() => saveReminderContentEdit(reminder.id)}
                            className="w-full px-2 py-1 text-sm font-medium rounded form-input"
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)'
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-sm font-medium cursor-pointer hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onClick={() => {
                              setEditingReminder(reminder.id);
                              setEditingReminderContent(prev => ({
                                ...prev,
                                [reminder.id]: reminder.content
                              }));
                            }}
                          >
                            {reminder.content}
                          </span>
                        )}
                      </div>

                      {/* 提醒信息 */}
                      <div className="flex items-center space-x-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isEditingFrequency ? (
                          <select
                            value={editingReminderFrequency[reminder.id] || reminder.frequency}
                            onChange={(e) => setEditingReminderFrequency(prev => ({
                              ...prev,
                              [reminder.id]: e.target.value as Frequency
                            }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveReminderFrequencyEdit(reminder.id);
                              } else if (e.key === 'Escape') {
                                setEditingReminderFrequency(prev => {
                                  const newState = { ...prev };
                                  delete newState[reminder.id];
                                  return newState;
                                });
                              }
                            }}
                            onBlur={() => saveReminderFrequencyEdit(reminder.id)}
                            className="px-2 py-1 rounded text-xs form-input"
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)'
                            }}
                            autoFocus
                          >
                            <option value="daily">每日</option>
                            <option value="weekdays">工作日</option>
                            <option value="weekly">每周</option>
                          </select>
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                            onClick={() => {
                              setEditingReminderFrequency(prev => ({
                                ...prev,
                                [reminder.id]: reminder.frequency
                              }));
                            }}
                          >
                            {getFrequencyText(reminder)}
                          </span>
                        )}
                        {isEditingTime ? (
                          <input
                            type="time"
                            value={editingReminderTime[reminder.id] || reminder.remind_time}
                            onChange={(e) => setEditingReminderTime(prev => ({
                              ...prev,
                              [reminder.id]: e.target.value
                            }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveReminderTimeEdit(reminder.id);
                              } else if (e.key === 'Escape') {
                                setEditingReminderTime(prev => {
                                  const newState = { ...prev };
                                  delete newState[reminder.id];
                                  return newState;
                                });
                              }
                            }}
                            onBlur={() => saveReminderTimeEdit(reminder.id)}
                            className="px-2 py-1 rounded text-xs form-input"
                            style={{
                              backgroundColor: 'var(--card-background)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-primary)'
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-opacity-50 px-2 py-1 rounded transition-colors"
                            onClick={() => {
                              setEditingReminderTime(prev => ({
                                ...prev,
                                [reminder.id]: reminder.remind_time
                              }));
                            }}
                          >
                            {reminder.remind_time} UTC
                          </span>
                        )}
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={getStatusStyle(reminder.status)}
                        >
                          {reminder.status === 'active' ? '启用' : '暂停'}
                        </span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center px-2 space-x-1 transition-opacity">
                      {reminder.status === 'active' ? (
                        <button
                          disabled={savingId === reminder.id}
                          onClick={() => onPause(reminder.id)}
                          className="px-3 py-1 rounded-md text-xs text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--warning)' }}
                          title="暂停提醒"
                        >
                          暂停
                        </button>
                      ) : (
                        <button
                          disabled={savingId === reminder.id}
                          onClick={() => onResume(reminder.id)}
                          className="px-3 py-1 rounded-md text-xs text-white disabled:opacity-50"
                          style={{ backgroundColor: 'var(--success)' }}
                          title="恢复提醒"
                        >
                          恢复
                        </button>
                      )}
                      <DeleteButton
                        id={reminder.id}
                        deleteConfirm={deleteConfirm}
                        onDelete={(id) => {
                          onDelete(id);
                        }}
                        onSetDeleteConfirm={(id) => {
                          setDeleteConfirm(id);
                        }}
                        size="small"
                      />
                    </div>
                  </div>

                  {/* 展开详情区域 */}
                  {isExpanded && (
                    <div className="px-6 py-3" style={{ 
                      backgroundColor: 'var(--background-secondary)',
                      borderTop: '1px solid var(--border-light)'
                    }}>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>创建时间：</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {reminder.created_at ? formatDate(reminder.created_at) : '未知'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>更新时间：</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {reminder.updated_at ? formatDate(reminder.updated_at) : '未知'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>最后触发：</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            {reminder.last_triggered_date ? formatDate(reminder.last_triggered_date) : '未触发'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>提醒频率：</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{getFrequencyText(reminder)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 空状态 */}
            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
                <div className="text-4xl mb-3">⏰</div>
                <div className="text-body-large font-semibold">暂无提醒</div>
                <div className="text-body-small mt-1">在上方输入框中添加新提醒</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

