import { useState, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import { apiPost, apiGet, apiPut } from '../utils/api';

interface ThinkingTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: string[];
  timeRequired: number;
  category: 'problem_solving' | 'decision_making' | 'creative' | 'planning' | 'reflection';
}

interface ThinkingRecord {
  id: number;
  template_id: string;
  template_name: string;
  title: string;
  questions: string[];
  answers: Record<string, string>;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  completion_rate: number;
}

interface ThinkingToolsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  accessToken?: string;
}

const thinkingTemplates: ThinkingTemplate[] = [
  {
    id: 'swot_analysis',
    name: 'SWOT分析',
    description: '分析优势、劣势、机会和威胁',
    icon: '🎯',
    category: 'decision_making',
    timeRequired: 10,
    questions: [
      '这个问题/项目的优势(Strengths)是什么？',
      '存在哪些劣势(Weaknesses)或不足？',
      '有什么外部机会(Opportunities)可以利用？',
      '面临哪些威胁(Threats)或挑战？',
      '如何利用优势抓住机会？',
      '如何改善劣势应对威胁？'
    ]
  },
  {
    id: 'five_whys',
    name: '5个为什么',
    description: '深入挖掘问题根本原因',
    icon: '🔍',
    category: 'problem_solving',
    timeRequired: 8,
    questions: [
      '问题是什么？',
      '为什么会发生这个问题？',
      '为什么会出现上述原因？',
      '为什么会有这个更深层的原因？',
      '为什么会存在这个根本原因？',
      '现在找到根本原因了吗？如何解决？'
    ]
  },
  {
    id: 'pros_cons',
    name: '利弊分析',
    description: '权衡决策的正面和负面影响',
    icon: '⚖️',
    category: 'decision_making',
    timeRequired: 6,
    questions: [
      '这个决策的主要好处是什么？',
      '可能带来的负面影响有哪些？',
      '短期内会有什么影响？',
      '长期来看会怎样？',
      '对其他人/事物的影响如何？',
      '综合考虑，应该如何决策？'
    ]
  },
  {
    id: 'scamper',
    name: 'SCAMPER创新法',
    description: '通过7个维度激发创新思维',
    icon: '💡',
    category: 'creative',
    timeRequired: 12,
    questions: [
      '能否替代(Substitute)某些元素？',
      '能否结合(Combine)其他想法？',
      '能否适应(Adapt)其他场景？',
      '能否修改(Modify)现有方案？',
      '能否用于其他用途(Put to other uses)？',
      '能否消除(Eliminate)某些部分？',
      '能否重新安排(Reverse/Rearrange)？'
    ]
  },
  {
    id: 'smart_goals',
    name: 'SMART目标设定',
    description: '制定具体、可衡量、可达成的目标',
    icon: '🎯',
    category: 'planning',
    timeRequired: 10,
    questions: [
      '目标是否具体明确(Specific)？',
      '如何衡量进度和成果(Measurable)？',
      '这个目标是否可以达成(Achievable)？',
      '目标是否与整体方向相关(Relevant)？',
      '什么时候完成(Time-bound)？',
      '需要什么资源和支持？'
    ]
  },
  {
    id: 'reflection_journal',
    name: '反思日记',
    description: '系统性回顾和总结经验',
    icon: '📝',
    category: 'reflection',
    timeRequired: 8,
    questions: [
      '今天/这个阶段发生了什么重要的事？',
      '我学到了什么？',
      '什么地方做得好？',
      '有什么可以改进的？',
      '这些经验如何应用到未来？',
      '下一步的行动计划是什么？'
    ]
  },
  {
    id: 'eisenhower_matrix',
    name: '四象限法则',
    description: '按重要性和紧急性分类任务',
    icon: '📊',
    category: 'planning',
    timeRequired: 7,
    questions: [
      '哪些事情既重要又紧急？（立即处理）',
      '哪些事情重要但不紧急？（计划处理）',
      '哪些事情紧急但不重要？（委托处理）',
      '哪些事情既不重要也不紧急？（消除处理）',
      '如何减少第一象限的事情？',
      '如何增加第二象限的时间投入？'
    ]
  },
  {
    id: 'six_thinking_hats',
    name: '六顶思考帽',
    description: '从六个角度全面思考问题',
    icon: '🎩',
    category: 'problem_solving',
    timeRequired: 15,
    questions: [
      '客观事实是什么？（白帽）',
      '有什么积极的方面？（黄帽）',
      '存在什么风险和问题？（黑帽）',
      '有什么情感和直觉？（红帽）',
      '有什么创新的想法？（绿帽）',
      '如何控制思考过程？（蓝帽）'
    ]
  }
];

export default function ThinkingToolsPanel({ isVisible, onClose, accessToken }: ThinkingToolsPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ThinkingTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState<Record<number, boolean>>({});
  const [voiceError, setVoiceError] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // 数据持久化相关状态
  const [currentRecord, setCurrentRecord] = useState<ThinkingRecord | null>(null);
  const [savedRecords, setSavedRecords] = useState<ThinkingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const categories = [
    { id: 'all', name: '全部', icon: '📚' },
    { id: 'problem_solving', name: '问题解决', icon: '🔍' },
    { id: 'decision_making', name: '决策制定', icon: '⚖️' },
    { id: 'creative', name: '创新思维', icon: '💡' },
    { id: 'planning', name: '规划管理', icon: '📋' },
    { id: 'reflection', name: '反思总结', icon: '📝' }
  ];

  const filteredTemplates = filterCategory === 'all' 
    ? thinkingTemplates 
    : thinkingTemplates.filter(t => t.category === filterCategory);

  // 数据持久化函数
  const createNewRecord = async (template: ThinkingTemplate) => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await apiPost(
        '/api/thinking/records',
        {
          template_id: template.id,
          template_name: template.name,
          questions: template.questions,
          title: `${template.name} - ${new Date().toLocaleString()}`
        },
        '创建思考记录',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setCurrentRecord(result.record);
        return result.record;
      }
    } catch (error) {
      console.error('创建思考记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async (questionIndex: number, answer: string) => {
    if (!currentRecord || !accessToken || !autoSaveEnabled) return;
    
    try {
      const response = await apiPut(
        `/api/thinking/records/${currentRecord.id}/answers`,
        {
          question_index: questionIndex,
          answer: answer
        },
        '保存答案',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setCurrentRecord(result.record);
      }
    } catch (error) {
      console.error('保存答案失败:', error);
    }
  };

  const loadSavedRecords = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await apiGet(
        '/api/thinking/records?limit=10',
        '获取思考记录',
        accessToken
      );
      
      const result = await response.json();
      if (result.success) {
        setSavedRecords(result.records);
      }
    } catch (error) {
      console.error('获取思考记录失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startThinking = async (template: ThinkingTemplate) => {
    setSelectedTemplate(template);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsCompleted(false);
    
    // 如果启用自动保存且有访问令牌，创建新记录
    if (autoSaveEnabled && accessToken) {
      await createNewRecord(template);
    }
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
    
    // 自动保存
    if (autoSaveEnabled && currentRecord) {
      // 防抖保存
      setTimeout(() => {
        saveAnswer(questionIndex, answer);
      }, 1000);
    }
  };

  // 初始化时加载保存的记录
  useEffect(() => {
    if (isVisible && accessToken) {
      loadSavedRecords();
    }
  }, [isVisible, accessToken]);

  const nextQuestion = () => {
    if (selectedTemplate && currentQuestionIndex < selectedTemplate.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const resetThinking = () => {
    setSelectedTemplate(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsCompleted(false);
  };

  const exportThinking = () => {
    if (!selectedTemplate) return;
    
    const content = `# ${selectedTemplate.name} - 思考记录\n\n${selectedTemplate.description}\n\n` +
      selectedTemplate.questions.map((question, index) => 
        `## ${index + 1}. ${question}\n\n${answers[index] || '（未回答）'}\n`
      ).join('\n');
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.name}-思考记录.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-xl" style={{ 
        backgroundColor: 'var(--card-background)',
        border: '1px solid var(--border-light)'
      }}>
        {/* 极简头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ 
          borderColor: 'var(--border-light)'
        }}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
              backgroundColor: 'var(--accent-purple)',
              opacity: 0.1
            }}>
              <span style={{ color: 'var(--accent-purple)', fontSize: '16px' }}>🧠</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                思考工具
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {selectedTemplate ? selectedTemplate.name : '结构化思考'}
                {currentRecord && (
                  <span className="ml-2 px-2 py-1 rounded text-xs" style={{ 
                    backgroundColor: 'var(--success)', 
                    color: 'white',
                    fontSize: '10px'
                  }}>
                    已保存
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 极简自动保存开关 */}
            {accessToken && (
              <button
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className="px-2 py-1 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: autoSaveEnabled ? 'var(--success-bg)' : 'var(--background-secondary)',
                  color: autoSaveEnabled ? 'var(--success)' : 'var(--text-muted)',
                  border: 'none'
                }}
                title={autoSaveEnabled ? '自动保存已开启' : '自动保存已关闭'}
              >
                <span style={{ fontSize: '10px' }}>💾</span>
              </button>
            )}
            
            {/* 极简记录按钮 */}
            {accessToken && (
              <button
                onClick={() => setShowRecords(!showRecords)}
                className="px-2 py-1 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  color: 'var(--text-muted)',
                  border: 'none'
                }}
                title="查看保存的记录"
              >
                <span style={{ fontSize: '10px' }}>📚</span>
              </button>
            )}
            
            <button
              onClick={selectedTemplate ? resetThinking : onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
              style={{ 
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '14px' }}>{selectedTemplate ? '←' : '✕'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showRecords ? (
            /* 保存记录界面 */
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  保存的思考记录
                </h3>
                <button
                  onClick={() => setShowRecords(false)}
                  className="text-sm px-3 py-1 rounded transition-all"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  返回
                </button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  加载中...
                </div>
              ) : savedRecords.length > 0 ? (
                <div className="space-y-3">
                  {savedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        border: '1px solid var(--border-light)'
                      }}
                      onClick={() => {
                        const template = thinkingTemplates.find(t => t.id === record.template_id);
                        if (template) {
                          setSelectedTemplate(template);
                          setAnswers(record.answers || {});
                          setCurrentRecord(record);
                          setCurrentQuestionIndex(0);
                          setIsCompleted(record.is_completed);
                          setShowRecords(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {record.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            record.is_completed 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {record.is_completed ? '已完成' : '进行中'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {Math.round(record.completion_rate)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        模板: {record.template_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        更新: {new Date(record.updated_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  暂无保存的思考记录
                </div>
              )}
            </div>
          ) : !selectedTemplate ? (
            /* 模板选择界面 */
            <div className="p-6">
              {/* 分类筛选 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setFilterCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterCategory === category.id ? 'shadow-sm' : ''
                    }`}
                    style={{
                      backgroundColor: filterCategory === category.id ? 'var(--primary)' : 'var(--background-secondary)',
                      color: filterCategory === category.id ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${filterCategory === category.id ? 'var(--primary)' : 'var(--border-light)'}`
                    }}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>

              {/* 模板网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => startThinking(template)}
                    className="p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-105"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl">{template.icon}</div>
                      <span className="text-xs px-2 py-1 rounded" style={{
                        backgroundColor: 'var(--accent)',
                        color: 'white'
                      }}>
                        {template.timeRequired}分钟
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      {template.name}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {template.description}
                    </p>
                    <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {template.questions.length} 个引导问题
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !isCompleted ? (
            /* 思考进行界面 */
            <div className="p-6">
              {/* 进度指示器 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    问题 {currentQuestionIndex + 1} / {selectedTemplate.questions.length}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    预计用时：{selectedTemplate.timeRequired}分钟
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: 'var(--primary)',
                      width: `${((currentQuestionIndex + 1) / selectedTemplate.questions.length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* 当前问题 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedTemplate.questions[currentQuestionIndex]}
                  </h3>
                  <button
                    onClick={() => setShowVoiceInput(prev => ({
                      ...prev,
                      [currentQuestionIndex]: !prev[currentQuestionIndex]
                    }))}
                    className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: showVoiceInput[currentQuestionIndex] ? 'var(--primary)' : 'var(--background-secondary)',
                      color: showVoiceInput[currentQuestionIndex] ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                    title="语音输入"
                  >
                    🎤 语音回答
                  </button>
                </div>
                
                {showVoiceInput[currentQuestionIndex] ? (
                  <div className="mb-4">
                    <VoiceInput
                      onTranscript={(text) => {
                        const currentAnswer = answers[currentQuestionIndex] || '';
                        const newAnswer = currentAnswer ? `${currentAnswer}\n${text}` : text;
                        handleAnswerChange(currentQuestionIndex, newAnswer);
                      }}
                      onError={(error) => {
                        setVoiceError(error);
                        setTimeout(() => setVoiceError(''), 3000);
                      }}
                      placeholder="开始语音回答这个问题..."
                    />
                    {voiceError && (
                      <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                        {voiceError}
                      </p>
                    )}
                  </div>
                ) : null}
                
                <textarea
                  value={answers[currentQuestionIndex] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestionIndex, e.target.value)}
                  placeholder="请在此输入你的思考..."
                  className="w-full h-32 p-4 border rounded-lg resize-none"
                  style={{
                    backgroundColor: 'var(--card-background)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* 导航按钮 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  ← 上一题
                </button>
                
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {Object.keys(answers).filter(key => answers[key]?.trim()).length} / {selectedTemplate.questions.length} 已回答
                </div>
                
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white'
                  }}
                >
                  {currentQuestionIndex === selectedTemplate.questions.length - 1 ? '完成思考' : '下一题 →'}
                </button>
              </div>
            </div>
          ) : (
            /* 完成界面 */
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  思考完成！
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  你已经完成了《{selectedTemplate.name}》的所有思考问题
                </p>
              </div>

              {/* 思考总结 */}
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <h4 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  思考总结
                </h4>
                <div className="space-y-4">
                  {selectedTemplate.questions.map((question, index) => (
                    <div key={index}>
                      <h5 className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {index + 1}. {question}
                      </h5>
                      <p className="text-sm p-2 rounded" style={{ 
                        backgroundColor: 'var(--card-background)',
                        color: 'var(--text-primary)'
                      }}>
                        {answers[index] || '（未回答）'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <button
                  onClick={exportThinking}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--success)',
                    color: 'white'
                  }}
                >
                  📥 导出思考记录
                </button>
                <button
                  onClick={resetThinking}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: 'white'
                  }}
                >
                  🔄 重新开始
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
