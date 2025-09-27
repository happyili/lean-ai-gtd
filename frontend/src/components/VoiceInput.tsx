import { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoStart?: boolean;
}

export default function VoiceInput({
  onTranscript,
  onError,
  placeholder = "点击开始语音输入...",
  className = "",
  disabled = false,
  autoStart = false
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 检查浏览器支持
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // 配置语音识别
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN'; // 支持中文
      
      // 识别结果处理
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        
        // 如果有最终结果，通知父组件
        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
          
          // 自动停止识别（3秒后）
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            stopListening();
          }, 3000);
        }
      };
      
      // 错误处理
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        let errorMessage = '语音识别出错';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = '未检测到语音，请重试';
            break;
          case 'audio-capture':
            errorMessage = '无法访问麦克风';
            break;
          case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
          case 'network':
            errorMessage = '网络错误，请检查网络连接';
            break;
          default:
            errorMessage = `语音识别错误: ${event.error}`;
        }
        
        onError?.(errorMessage);
        setIsListening(false);
      };
      
      // 识别结束
      recognition.onend = () => {
        setIsListening(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
      
      // 自动启动
      if (autoStart && !disabled) {
        startListening();
      }
    } else {
      setIsSupported(false);
      onError?.('您的浏览器不支持语音识别功能');
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [autoStart, disabled, onError, onTranscript, isListening]);

  const startListening = () => {
    if (!recognitionRef.current || disabled || isListening) return;
    
    try {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      onError?.('启动语音识别失败');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } catch (error) {
      console.error('停止语音识别失败:', error);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center justify-center p-3 rounded-lg ${className}`} 
           style={{ 
             backgroundColor: 'var(--background-secondary)', 
             border: '1px solid var(--border-light)',
             color: 'var(--text-muted)'
           }}>
        <span className="text-sm">🚫 浏览器不支持语音输入</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-xl ${className}`}
         style={{ 
           backgroundColor: 'var(--background-secondary)', 
           border: '1px solid var(--border-light)'
         }}>
      
      {/* 极简语音按钮 */}
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          isListening 
            ? 'animate-pulse' 
            : 'hover:scale-105'
        }`}
        style={{
          backgroundColor: isListening ? 'var(--error-bg)' : 'var(--primary-light)',
          color: isListening ? 'var(--error)' : 'var(--primary)',
          opacity: disabled ? 0.5 : 1,
          border: 'none'
        }}
        title={isListening ? '停止录音' : '开始语音输入'}
      >
        <span style={{ fontSize: '14px' }}>
          {isListening ? '⏹️' : '🎤'}
        </span>
      </button>
      
      {/* 极简状态显示 */}
      <div className="flex-1 min-w-0">
        {isListening ? (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--error)' }}></div>
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--error)', animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--error)', animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--error)' }}>
              正在听取...
            </span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {placeholder}
          </span>
        )}
        
        {/* 极简转录结果 */}
        {transcript && (
          <div className="mt-2 p-2 rounded-lg" 
               style={{ 
                 backgroundColor: 'var(--card-background)',
                 border: '1px solid var(--border-light)'
               }}>
            <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {transcript}
            </p>
          </div>
        )}
      </div>
      
      {/* 极简语言切换 */}
      <select
        value={recognitionRef.current?.lang || 'zh-CN'}
        onChange={(e) => {
          if (recognitionRef.current) {
            recognitionRef.current.lang = e.target.value;
          }
        }}
        disabled={disabled || isListening}
        className="px-2 py-1 text-xs rounded-lg border-0 transition-all"
        style={{
          backgroundColor: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          fontSize: '10px'
        }}
        title="选择语音识别语言"
      >
        <option value="zh-CN">中</option>
        <option value="en-US">En</option>
        <option value="ja-JP">日</option>
        <option value="ko-KR">한</option>
      </select>
    </div>
  );
}

// 类型声明
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};
