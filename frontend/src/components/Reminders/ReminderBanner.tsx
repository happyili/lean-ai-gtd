import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';

interface Reminder {
  id: number;
  content: string;
}

interface ReminderBannerProps {
  accessToken: string | null;
}

export default function ReminderBanner({ accessToken }: ReminderBannerProps) {
  const [due, setDue] = useState<Reminder[]>([]);
  const [hiddenUntil, setHiddenUntil] = useState<number>(0);
  const token = accessToken || undefined;

  const loadDue = async () => {
    // respect snooze
    if (Date.now() < hiddenUntil) return;

    try {
      const res = await apiGet('/api/reminders/due', '获取到期提醒', token);
      const data = await res.json();

      setDue((data.reminders || []).slice(0, 3));
    } catch (error) {

    }
  };

  useEffect(() => {
    // 只有在 accessToken 存在时才加载
    if (accessToken) {
      loadDue();
    }
    
    const t = setInterval(() => {
      if (accessToken) {
        loadDue();
      }
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // 单独处理 hiddenUntil 变化，避免重复调用
  useEffect(() => {
    if (accessToken && hiddenUntil > 0 && Date.now() >= hiddenUntil) {
      loadDue();
    }
  }, [hiddenUntil, accessToken]);

  const acknowledge = async (id: number) => {
    try {
      await apiPost(`/api/reminders/${id}/acknowledge`, {}, '确认提醒', token);
    } finally {
      setDue(due.filter(d => d.id !== id));
    }
  };

  const snooze = () => {
    // hide for 5 minutes
    setHiddenUntil(Date.now() + 5 * 60 * 1000);
    setDue([]);
  };

  if (due.length === 0) return null;

  return (
    <div className="w-full sticky top-[48px] z-30">
      {due.map((r) => (
        <div key={r.id}
             className="mx-auto max-w-7xl px-6 py-3 border rounded-lg mb-2 flex items-center justify-between animate-pulse"
             style={{
               background: 'linear-gradient(90deg, rgba(255,243,230,1) 0%, rgba(255,255,255,1) 100%)',
               borderColor: 'var(--warning)'
             }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.content}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => acknowledge(r.id)}
              className="px-3 py-1 rounded-lg text-sm text-white"
              style={{ backgroundColor: 'var(--success)' }}
            >知道了</button>
            <button
              onClick={snooze}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >稍后</button>
          </div>
        </div>
      ))}
    </div>
  );
}

