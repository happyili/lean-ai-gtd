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
          <div className="p-8">
            <div className="text-center text-slate-500 py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-3xl">💡</span>
              </div>
              <div className="font-semibold text-lg mb-2">想法管理功能</div>
              <div className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-xl inline-block">即将推出...</div>
            </div>
          </div>
        );
      
      case 'notes':
        return (
          <div className="p-8">
            <div className="text-center text-slate-500 py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-3xl">📝</span>
              </div>
              <div className="font-semibold text-lg mb-2">笔记管理功能</div>
              <div className="text-sm font-medium bg-slate-100 px-3 py-1 rounded-xl inline-block">即将推出...</div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col border-l border-slate-200/60" style={{ background: 'var(--card-background)' }}>
      {/* Tab 导航 */}
      <div className="flex border-b border-slate-200/60 bg-slate-50/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-4 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'text-sky-600 border-b-2 border-sky-500 bg-white/80 backdrop-blur-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
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
