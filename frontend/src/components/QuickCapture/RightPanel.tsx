import { useState } from 'react';
import CaptureInput from './CaptureInput';

interface RightPanelProps {
  onSave: (content: string, category: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}

const tabs = [
  { id: 'add', label: '添加新内容', icon: '➕' },
  { id: 'ideas', label: '想法管理', icon: '💡' },
  { id: 'notes', label: '笔记管理', icon: '📝' }
];

export default function RightPanel({ onSave, onClear, isLoading = false }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('add');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'add':
        return (
          <div className="p-6">
            <CaptureInput 
              onSave={onSave}
              onClear={onClear}
              isLoading={isLoading}
            />
          </div>
        );
      
      case 'ideas':
        return (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-amber)', opacity: 0.1 }}>
                <span className="text-3xl">💡</span>
              </div>
              <div className="text-body-large font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>想法管理功能</div>
              <div className="px-3 py-1 rounded-xl text-caption font-medium" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>即将推出...</div>
            </div>
          </div>
        );
      
      case 'notes':
        return (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-emerald)', opacity: 0.1 }}>
                <span className="text-3xl">📝</span>
              </div>
              <div className="text-body-large font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>笔记管理功能</div>
              <div className="px-3 py-1 rounded-xl text-caption font-medium" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>即将推出...</div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col card" style={{ borderLeft: '1px solid var(--border-light)', background: 'var(--card-background)' }}>
      {/* Tab 导航 */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-light)', background: 'var(--background-secondary)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-body-small font-semibold transition-all ${
              activeTab === tab.id
                ? 'btn-primary'
                : 'text-body-small hover:btn-secondary'
            }`}
            style={{
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              backgroundColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : 'none'
            }}
          >
            <span className="mr-2 text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
