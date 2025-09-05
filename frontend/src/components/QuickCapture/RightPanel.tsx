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
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">💡</div>
              <div>想法管理功能</div>
              <div className="text-sm">即将推出...</div>
            </div>
          </div>
        );
      
      case 'notes':
        return (
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📝</div>
              <div>笔记管理功能</div>
              <div className="text-sm">即将推出...</div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Tab 导航 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
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
