import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 检测系统主题偏好和初始化
  useEffect(() => {
    const checkSystemTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    };

    // 从localStorage读取保存的主题设置
    const savedTheme = localStorage.getItem('site-theme') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
      // 立即应用主题
      if (savedTheme === 'system') {
        checkSystemTheme();
      } else {
        setIsDarkMode(savedTheme === 'dark');
      }
    } else {
      // 如果没有保存的主题，使用系统主题
      setThemeState('system');
      checkSystemTheme();
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkSystemTheme);

    return () => {
      mediaQuery.removeEventListener('change', checkSystemTheme);
    };
  }, []);

  // 根据主题模式更新isDarkMode
  useEffect(() => {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  // 应用主题到document
  useEffect(() => {
    const root = document.documentElement;
    
    // 清除所有主题类
    root.classList.remove('light', 'dark');
    
    // 添加当前主题类
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  }, [isDarkMode]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('site-theme', newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'system') {
      // 如果当前是系统主题，切换到与当前系统主题相反的模式
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'light' : 'dark');
    } else {
      // 如果当前是手动设置的主题，切换到相反模式
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const value: ThemeContextType = {
    theme,
    isDarkMode,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
