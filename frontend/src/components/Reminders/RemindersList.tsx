import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

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
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Reminder>>({
    content: '',
    frequency: 'daily',
    day_of_week: 0,
    remind_time: '09:00',
  });
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [savingId, setSavingId] = useState<number | 'new' | null>(null);

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
      setCreating(false);
      setNewItem({ content: '', frequency: 'daily', day_of_week: 0, remind_time: '09:00' });
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSavingId(null);
    }
  };

  const onUpdate = async (r: Reminder) => {
    setSavingId(r.id);
    try {
      const res = await apiPut(`/api/reminders/${r.id}`, {
        content: r.content,
        frequency: r.frequency,
        day_of_week: r.frequency === 'weekly' ? r.day_of_week : null,
        remind_time: r.remind_time,
      }, '更新提醒', headersToken);
      const data = await res.json();
      setItems(items.map(it => it.id === r.id ? data.reminder : it));
      setEditing({ ...editing, [r.id]: false });
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
    if (!confirm('确定删除该提醒吗？')) return;
    setSavingId(id);
    try {
      await apiDelete(`/api/reminders/${id}`, '删除提醒', headersToken);
      setItems(items.filter(it => it.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>定时提醒</h2>
        <div className="flex items-center space-x-2">
          <input
            placeholder="搜索提醒内容..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1 rounded-lg text-sm form-input"
            style={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={load}
            className="px-3 py-1 rounded-lg text-sm hover:btn-secondary"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >刷新</button>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-lg text-sm text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >新建提醒</button>
        </div>
      </div>

      {error && <div className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded mb-3">{error}</div>}

      {creating && (
        <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: 'var(--border-default)', background: 'var(--card-background)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              placeholder="提醒内容"
              className="px-3 py-2 rounded-lg text-sm form-input flex-1 min-w-[220px]"
              value={newItem.content || ''}
              onChange={e => setNewItem({ ...newItem, content: e.target.value })}
            />
            <select
              className="px-3 py-2 rounded-lg text-sm"
              value={newItem.frequency as string}
              onChange={e => setNewItem({ ...newItem, frequency: e.target.value as Frequency })}
            >
              <option value="daily">每日</option>
              <option value="weekdays">每个工作日</option>
              <option value="weekly">每周</option>
            </select>
            {newItem.frequency === 'weekly' && (
              <select
                className="px-3 py-2 rounded-lg text-sm"
                value={String(newItem.day_of_week ?? 0)}
                onChange={e => setNewItem({ ...newItem, day_of_week: Number(e.target.value) })}
              >
                {weekdays.map((w, idx) => (
                  <option key={idx} value={idx}>{w}</option>
                ))}
              </select>
            )}
            <input
              type="time"
              className="px-3 py-2 rounded-lg text-sm"
              value={newItem.remind_time || '09:00'}
              onChange={e => setNewItem({ ...newItem, remind_time: e.target.value })}
            />
            <button
              disabled={savingId === 'new'}
              onClick={onCreate}
              className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--success)' }}
            >保存</button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">加载中...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="p-4 rounded-lg border flex items-center justify-between"
                 style={{ borderColor: 'var(--border-default)', background: 'var(--card-background)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                {!editing[r.id] ? (
                  <>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.content}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.frequency === 'daily' && '每日'}
                      {r.frequency === 'weekdays' && '工作日'}
                      {r.frequency === 'weekly' && `每周${weekdays[r.day_of_week ?? 0]}`}
                      <span className="ml-2">{r.remind_time} UTC</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status === 'active' ? '启用' : '暂停'}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      className="px-3 py-2 rounded-lg text-sm form-input min-w-[220px]"
                      value={r.content}
                      onChange={e => setItems(items.map(it => it.id === r.id ? { ...it, content: e.target.value } : it))}
                    />
                    <select
                      className="px-3 py-2 rounded-lg text-sm"
                      value={r.frequency}
                      onChange={e => setItems(items.map(it => it.id === r.id ? { ...it, frequency: e.target.value as Frequency } : it))}
                    >
                      <option value="daily">每日</option>
                      <option value="weekdays">每个工作日</option>
                      <option value="weekly">每周</option>
                    </select>
                    {r.frequency === 'weekly' && (
                      <select
                        className="px-3 py-2 rounded-lg text-sm"
                        value={String(r.day_of_week ?? 0)}
                        onChange={e => setItems(items.map(it => it.id === r.id ? { ...it, day_of_week: Number(e.target.value) } : it))}
                      >
                        {weekdays.map((w, idx) => (
                          <option key={idx} value={idx}>{w}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="time"
                      className="px-3 py-2 rounded-lg text-sm"
                      value={r.remind_time}
                      onChange={e => setItems(items.map(it => it.id === r.id ? { ...it, remind_time: e.target.value } : it))}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editing[r.id] ? (
                  <>
                    <button
                      onClick={() => setEditing({ ...editing, [r.id]: true })}
                      className="px-3 py-1 rounded-lg text-sm hover:btn-secondary"
                      style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >编辑</button>
                    {r.status === 'active' ? (
                      <button
                        disabled={savingId === r.id}
                        onClick={() => onPause(r.id)}
                        className="px-3 py-1 rounded-lg text-sm text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--warning)' }}
                      >暂停</button>
                    ) : (
                      <button
                        disabled={savingId === r.id}
                        onClick={() => onResume(r.id)}
                        className="px-3 py-1 rounded-lg text-sm text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--success)' }}
                      >恢复</button>
                    )}
                    <button
                      disabled={savingId === r.id}
                      onClick={() => onDelete(r.id)}
                      className="px-3 py-1 rounded-lg text-sm text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--error)' }}
                    >删除</button>
                  </>
                ) : (
                  <>
                    <button
                      disabled={savingId === r.id}
                      onClick={() => onUpdate(r)}
                      className="px-3 py-1 rounded-lg text-sm text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--success)' }}
                    >保存</button>
                    <button
                      onClick={() => setEditing({ ...editing, [r.id]: false })}
                      className="px-3 py-1 rounded-lg text-sm"
                      style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >取消</button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-10">
              <div className="text-6xl mb-2">⏰</div>
              <div className="text-gray-600">暂无提醒，点击右上角“新建提醒”添加一个</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

