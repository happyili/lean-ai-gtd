import { useState } from 'react';

interface PomodoroTask {
  id: string;
  title: string;
  description: string;
  estimatedTime: number; // 分钟
  priority: 'high' | 'medium' | 'low';
  category: string;
  isEditable: boolean;
}

interface AIPomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: any[];
  onStartPomodoro?: (task: PomodoroTask) => void;
}

export default function AIPomodoroTimer({ 
  isOpen, 
  onClose, 
  tasks = [], 
  onStartPomodoro 
}: AIPomodoroTimerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pomodoroTasks, setPomodoroTasks] = useState<PomodoroTask[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<Partial<PomodoroTask>>({});

  // 生成AI番茄任务建议
  const generatePomodoroTasks = async () => {
    setIsGenerating(true);
    
    try {
      // 模拟AI生成建议（实际应调用后端API）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const suggestions: PomodoroTask[] = [
        {
          id: '1',
          title: '完成项目需求文档审阅',
          description: '重点关注技术架构部分，标记需要澄清的问题点，准备会议讨论要点',
          estimatedTime: 25,
          priority: 'high',
          category: '工作',
          isEditable: true
        },
        {
          id: '2', 
          title: '回复重要邮件和消息',
          description: '优先处理客户和项目组的紧急邮件，清理收件箱，设置后续提醒',
          estimatedTime: 25,
          priority: 'medium',
          category: '工作',
          isEditable: true
        },
        {
          id: '3',
          title: '整理并更新任务进展',
          description: '更新项目看板状态，记录今日完成情况，规划明日重点工作',
          estimatedTime: 25,
          priority: 'medium',
          category: '工作',
          isEditable: true
        }
      ];
      
      setPomodoroTasks(suggestions);
    } catch (error) {
      console.error('生成番茄任务失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 开始编辑任务
  const startEditTask = (task: PomodoroTask) => {
    setEditingTask(task.id);
    setEditingContent(task);
  };

  // 保存编辑
  const saveEditTask = () => {
    if (editingTask && editingContent) {
      setPomodoroTasks(prev => 
        prev.map(task => 
          task.id === editingTask ? { ...task, ...editingContent } : task
        )
      );
      setEditingTask(null);
      setEditingContent({});
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingTask(null);
    setEditingContent({});
  };

  // 开始番茄时钟
  const startPomodoro = (task: PomodoroTask) => {
    onStartPomodoro?.(task);
    onClose();
  };

  const priorityColors = {
    high: { bg: 'var(--error-bg)', color: 'var(--error)', label: '高优先级' },
    medium: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: '中优先级' },
    low: { bg: 'var(--success-bg)', color: 'var(--success)', label: '低优先级' }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden" style={{ 
        backgroundColor: 'var(--card-background)',
        border: '1px solid var(--border-light)'
      }}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-6" style={{ 
          borderBottom: '1px solid var(--border-light)', 
          backgroundColor: 'var(--background-secondary)' 
        }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg" style={{ 
              background: 'var(--accent-amber)' 
            }}>
              <span className="text-white text-lg font-bold">🍅</span>
            </div>
            <div>
              <h2 className="text-heading-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                AI番茄时钟
              </h2>
              <p className="text-body-small" style={{ color: 'var(--text-muted)' }}>
                基于 {tasks.length} 个任务生成专注工作建议
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:btn-secondary"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {pomodoroTasks.length === 0 && !isGenerating && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ 
                backgroundColor: 'var(--accent-amber)', 
                opacity: 0.1 
              }}>
                <span className="text-3xl">🍅</span>
              </div>
              <div className="text-body-large font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                AI番茄时钟助手
              </div>
              <div className="text-body-small mb-6" style={{ color: 'var(--text-muted)' }}>
                基于你当前的任务进展，AI将为你生成3个最适合现在专注完成的25分钟任务
              </div>
              <button
                onClick={generatePomodoroTasks}
                className="btn-primary px-6 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
              >
                🚀 生成番茄任务
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <div className="animate-pulse mb-4">
                <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ 
                  backgroundColor: 'var(--accent-amber)', 
                  opacity: 0.6 
                }}></div>
              </div>
              <div className="text-body font-semibold" style={{ color: 'var(--text-secondary)' }}>
                AI正在分析你的任务...
              </div>
              <div className="text-body-small mt-2" style={{ color: 'var(--text-muted)' }}>
                根据优先级和紧急程度生成最佳番茄任务
              </div>
            </div>
          )}

          {pomodoroTasks.length > 0 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-body-large font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  🎯 推荐的番茄任务
                </h3>
                <p className="text-body-small" style={{ color: 'var(--text-muted)' }}>
                  每个任务设计为25分钟专注时间，你可以编辑调整后开始计时
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pomodoroTasks.map((task, index) => (
                  <div 
                    key={task.id}
                    className="card p-4 hover:shadow-md transition-all"
                    style={{ 
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ 
                          backgroundColor: 'var(--accent-amber)',
                          color: 'white'
                        }}>
                          {index + 1}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{
                            backgroundColor: priorityColors[task.priority].bg,
                            color: priorityColors[task.priority].color
                          }}>
                            {priorityColors[task.priority].label}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{
                            backgroundColor: 'var(--info-bg)',
                            color: 'var(--info)'
                          }}>
                            {task.estimatedTime}分钟
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{
                            backgroundColor: 'var(--background)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)'
                          }}>
                            {task.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditTask(task)}
                          className="px-3 py-1 rounded text-xs font-medium transition-all hover:btn-secondary"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => startPomodoro(task)}
                          className="px-4 py-2 rounded-lg font-medium transition-all"
                          style={{
                            backgroundColor: 'var(--accent-amber)',
                            color: 'white',
                            border: '1px solid var(--accent-amber)'
                          }}
                        >
                          🍅 开始
                        </button>
                      </div>
                    </div>

                    {editingTask === task.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingContent.title || ''}
                          onChange={(e) => setEditingContent(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full p-2 rounded form-input text-body-small font-semibold"
                          style={{
                            backgroundColor: 'var(--card-background)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="任务标题"
                        />
                        <textarea
                          value={editingContent.description || ''}
                          onChange={(e) => setEditingContent(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full p-2 rounded form-input text-body-small resize-none"
                          rows={3}
                          style={{
                            backgroundColor: 'var(--card-background)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-primary)'
                          }}
                          placeholder="详细描述和工作要点"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <select
                              value={editingContent.priority || task.priority}
                              onChange={(e) => setEditingContent(prev => ({ ...prev, priority: e.target.value as any }))}
                              className="px-3 py-1 rounded form-input text-xs"
                              style={{
                                backgroundColor: 'var(--card-background)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <option value="high">高优先级</option>
                              <option value="medium">中优先级</option>
                              <option value="low">低优先级</option>
                            </select>
                            <input
                              type="number"
                              value={editingContent.estimatedTime || task.estimatedTime}
                              onChange={(e) => setEditingContent(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) }))}
                              className="w-20 px-3 py-1 rounded form-input text-xs"
                              style={{
                                backgroundColor: 'var(--card-background)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-primary)'
                              }}
                              min="5"
                              max="50"
                            />
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>分钟</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 rounded text-xs font-medium transition-all btn-secondary"
                            >
                              取消
                            </button>
                            <button
                              onClick={saveEditTask}
                              className="px-3 py-1 rounded text-xs font-medium transition-all"
                              style={{
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: '1px solid var(--primary)'
                              }}
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-body font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                          {task.title}
                        </h4>
                        <p className="text-body-small leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {task.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        {pomodoroTasks.length > 0 && (
          <div className="flex items-center justify-between p-6" style={{ 
            borderTop: '1px solid var(--border-light)', 
            backgroundColor: 'var(--background-secondary)' 
          }}>
            <button
              onClick={generatePomodoroTasks}
              className="btn-secondary px-4 py-2 rounded-lg text-body-small font-semibold"
            >
              🔄 重新生成
            </button>
            <div className="text-caption" style={{ color: 'var(--text-muted)' }}>
              💡 建议：每完成一个番茄时钟后休息5分钟
            </div>
          </div>
        )}
      </div>
    </div>
  );
}