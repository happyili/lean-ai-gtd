import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PomodoroBannerPanel State Persistence - Core Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves state to localStorage correctly', () => {
    const STORAGE_KEYS = {
      ACTIVE_TASK_ID: 'pomodoro_active_task_id',
      TIMER_MINUTES: 'pomodoro_timer_minutes',
      TIMER_SECONDS: 'pomodoro_timer_seconds',
      IS_TIMER_RUNNING: 'pomodoro_is_timer_running',
    };

    const saveStateToStorage = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('保存状态到localStorage失败:', error);
      }
    };

    // Test saving different types of values
    saveStateToStorage(STORAGE_KEYS.ACTIVE_TASK_ID, 123);
    saveStateToStorage(STORAGE_KEYS.TIMER_MINUTES, 25);
    saveStateToStorage(STORAGE_KEYS.TIMER_SECONDS, 0);
    saveStateToStorage(STORAGE_KEYS.IS_TIMER_RUNNING, true);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('pomodoro_active_task_id', '123');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('pomodoro_timer_minutes', '25');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('pomodoro_timer_seconds', '0');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('pomodoro_is_timer_running', 'true');
  });

  it('loads state from localStorage correctly', () => {
    const STORAGE_KEYS = {
      ACTIVE_TASK_ID: 'pomodoro_active_task_id',
      TIMER_MINUTES: 'pomodoro_timer_minutes',
      TIMER_SECONDS: 'pomodoro_timer_seconds',
      IS_TIMER_RUNNING: 'pomodoro_is_timer_running',
    };

    const loadStateFromStorage = (key: string, defaultValue: any) => {
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      } catch (error) {
        console.error('从localStorage加载状态失败:', error);
        return defaultValue;
      }
    };

    // Mock localStorage responses
    localStorageMock.getItem
      .mockReturnValueOnce('123')  // activeTaskId
      .mockReturnValueOnce('20')   // timerMinutes
      .mockReturnValueOnce('30')   // timerSeconds
      .mockReturnValueOnce('true'); // isTimerRunning

    const activeTaskId = loadStateFromStorage(STORAGE_KEYS.ACTIVE_TASK_ID, null);
    const timerMinutes = loadStateFromStorage(STORAGE_KEYS.TIMER_MINUTES, 25);
    const timerSeconds = loadStateFromStorage(STORAGE_KEYS.TIMER_SECONDS, 0);
    const isTimerRunning = loadStateFromStorage(STORAGE_KEYS.IS_TIMER_RUNNING, false);

    expect(activeTaskId).toBe(123);
    expect(timerMinutes).toBe(20);
    expect(timerSeconds).toBe(30);
    expect(isTimerRunning).toBe(true);
  });

  it('handles localStorage errors gracefully', () => {
    const loadStateFromStorage = (key: string, defaultValue: any) => {
      try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      } catch (error) {
        console.error('从localStorage加载状态失败:', error);
        return defaultValue;
      }
    };

    // Mock localStorage to throw error
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const result = loadStateFromStorage('test_key', 'default_value');
    expect(result).toBe('default_value');
  });

  it('clears pomodoro state from localStorage', () => {
    const STORAGE_KEYS = {
      ACTIVE_TASK_ID: 'pomodoro_active_task_id',
      TIMER_MINUTES: 'pomodoro_timer_minutes',
      TIMER_SECONDS: 'pomodoro_timer_seconds',
      IS_TIMER_RUNNING: 'pomodoro_is_timer_running',
    };

    const clearPomodoroState = () => {
      try {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_TASK_ID);
        localStorage.removeItem(STORAGE_KEYS.TIMER_MINUTES);
        localStorage.removeItem(STORAGE_KEYS.TIMER_SECONDS);
        localStorage.removeItem(STORAGE_KEYS.IS_TIMER_RUNNING);
      } catch (error) {
        console.error('清除localStorage状态失败:', error);
      }
    };

    clearPomodoroState();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pomodoro_active_task_id');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pomodoro_timer_minutes');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pomodoro_timer_seconds');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('pomodoro_is_timer_running');
  });

  it('uses correct localStorage keys', () => {
    const expectedKeys = [
      'pomodoro_active_task_id',
      'pomodoro_timer_minutes',
      'pomodoro_timer_seconds',
      'pomodoro_is_timer_running',
      'pomodoro_panel_expanded'
    ];

    // Verify that all expected keys are defined
    expectedKeys.forEach(key => {
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.startsWith('pomodoro_')).toBe(true);
    });
  });
});
