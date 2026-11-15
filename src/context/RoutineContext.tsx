import React, { createContext, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import type { AppData, DayLog, DayOfWeek, TaskTemplate, UserAccount, ViewMode } from '../types';
import {
  getActiveEmail,
  getKnownAccounts,
  loadAppData,
  saveAppData,
  setActiveEmail,
  exportDataToJson,
  getStoredCategories,
  saveStoredCategories,
} from '../services/storage';
import { syncWithCloud, pushToCloud, getSupabaseClient, fetchFromCloud } from '../services/supabase';

interface RoutineContextType {
  // Navigation & Views
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  goToToday: () => void;
  
  // Data
  appData: AppData;
  activeAccountEmail: string;
  knownAccounts: string[];
  
  // Day-specific Computed Tasks
  activeTasks: TaskTemplate[];
  trashedTasks: TaskTemplate[];
  dayCompletionRate: number; // 0 to 100
  totalScheduledToday: number;

  // Network & Sync status
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingSync: boolean;
  lastSyncTime: Date | null;
  
  // Task Actions
  moveToTrash: (taskId: string, date?: Date) => void;
  restoreFromTrash: (taskId: string, date?: Date) => void;
  createTask: (task: Omit<TaskTemplate, 'id' | 'createdAt' | 'order'>) => void;
  updateTask: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTaskPermanently: (id: string) => void;
  reorderTasks: (newTasks: TaskTemplate[]) => void;
  
  // Account & Sync Actions
  switchAccount: (email: string) => void;
  updateAccountSettings: (updates: Partial<UserAccount>) => void;
  triggerSync: () => Promise<{ success: boolean; message?: string }>;
  exportBackup: () => void;
  importBackup: (data: AppData) => void;

  // Category Actions
  categories: string[];
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  
  // Statistics Helper
  getDayStats: (dateStr: string) => { total: number; completed: number; percentage: number };
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export const RoutineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAccountEmail, setActiveEmailState] = useState<string>(() => getActiveEmail());
  const [knownAccounts, setKnownAccounts] = useState<string[]>(() => getKnownAccounts());
  const [appData, setAppData] = useState<AppData>(() => loadAppData(activeAccountEmail));
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Network & Offline-First Sync State
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasPendingSync, setHasPendingSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem('routine_pending_sync') === 'true';
    } catch {
      return false;
    }
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync state tracking refs to prevent loops and double-syncing
  const isUserMutationRef = useRef<boolean>(false);
  const lastPushedAtRef = useRef<string>('');
  const lastRemoteUpdatedAtRef = useRef<string>('');

  const markPendingSync = () => {
    setHasPendingSync(true);
    try {
      localStorage.setItem('routine_pending_sync', 'true');
    } catch {}
  };

  // Save to localStorage when appData changes
  useEffect(() => {
    saveAppData(activeAccountEmail, appData);
    if (isUserMutationRef.current) {
      markPendingSync();
    }
  }, [appData, activeAccountEmail]);

  // Auto-push to cloud ONLY on local user mutations (Debounced 800ms)
  useEffect(() => {
    if (!isUserMutationRef.current) return;
    if (!appData?.account?.cloudSyncEnabled || !navigator.onLine) return;

    const timeout = setTimeout(async () => {
      isUserMutationRef.current = false;
      setIsSyncing(true);
      try {
        const res = await pushToCloud(
          appData,
          appData?.account?.supabaseUrl,
          appData?.account?.supabaseAnonKey
        );
        if (res.success && res.updatedAt) {
          lastPushedAtRef.current = res.updatedAt;
          lastRemoteUpdatedAtRef.current = res.updatedAt;
          setHasPendingSync(false);
          try {
            localStorage.removeItem('routine_pending_sync');
          } catch {}
          setLastSyncTime(new Date());
        }
      } finally {
        setTimeout(() => setIsSyncing(false), 400);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [appData, appData?.account?.cloudSyncEnabled]);

  // Keep date updated if day changes at midnight
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (!isSameDay(now, selectedDate) && viewMode === 'day') {
        // Only auto-advance if we were on "today"
        // Let's check if selectedDate was yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (isSameDay(selectedDate, yesterday)) {
          setSelectedDate(now);
        }
      }
    }, 60000); // check every minute
    return () => clearInterval(timer);
  }, [selectedDate, viewMode]);

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const selectedDayOfWeek = useMemo(() => selectedDate.getDay() as DayOfWeek, [selectedDate]);

  // DayLog for current selected date
  const currentDayLog: DayLog = useMemo(() => {
    return appData.history[selectedDateStr] || { completedTaskIds: [], completedAt: {} };
  }, [appData.history, selectedDateStr]);

  // Tasks scheduled for selected day of week
  const scheduledTasks = useMemo(() => {
    return appData.tasks
      .filter((task) => task.daysOfWeek.includes(selectedDayOfWeek))
      .sort((a, b) => a.order - b.order);
  }, [appData.tasks, selectedDayOfWeek]);

  // Active tasks (not in trash for this day)
  const activeTasks = useMemo(() => {
    return scheduledTasks.filter((t) => !currentDayLog.completedTaskIds.includes(t.id));
  }, [scheduledTasks, currentDayLog]);

  // Trashed tasks for this day
  const trashedTasks = useMemo(() => {
    return scheduledTasks.filter((t) => currentDayLog.completedTaskIds.includes(t.id));
  }, [scheduledTasks, currentDayLog]);

  const totalScheduledToday = scheduledTasks.length;
  const dayCompletionRate = totalScheduledToday > 0
    ? Math.round((trashedTasks.length / totalScheduledToday) * 100)
    : 0;

  // Move task to trash for the specified date (defaults to selectedDate)
  const moveToTrash = (taskId: string, targetDate = selectedDate) => {
    isUserMutationRef.current = true;
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    setAppData((prev) => {
      const existingLog = prev.history[dateStr] || { completedTaskIds: [], completedAt: {} };
      if (existingLog.completedTaskIds.includes(taskId)) return prev;

      const newCompletedIds = [...existingLog.completedTaskIds, taskId];

      // Deterministic animation index for this date - identical across all devices
      let animationIndex = existingLog.animationIndex;
      if (animationIndex === undefined) {
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
          hash = (hash << 5) - hash + dateStr.charCodeAt(i);
          hash |= 0;
        }
        animationIndex = Math.abs(hash) % 10;
      }

      const updatedLog: DayLog = {
        completedTaskIds: newCompletedIds,
        completedAt: {
          ...existingLog.completedAt,
          [taskId]: new Date().toISOString(),
        },
        animationIndex,
      };

      return {
        ...prev,
        history: {
          ...prev.history,
          [dateStr]: updatedLog,
        },
      };
    });
  };

  // Restore task from trash back to active list for today
  const restoreFromTrash = (taskId: string, targetDate = selectedDate) => {
    isUserMutationRef.current = true;
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    setAppData((prev) => {
      const existingLog = prev.history[dateStr];
      if (!existingLog) return prev;

      const remainingIds = existingLog.completedTaskIds.filter((id) => id !== taskId);
      const remainingTimes = { ...existingLog.completedAt };
      delete remainingTimes[taskId];

      return {
        ...prev,
        history: {
          ...prev.history,
          [dateStr]: {
            completedTaskIds: remainingIds,
            completedAt: remainingTimes,
          },
        },
      };
    });
  };

  // Create new task template
  const createTask = (newTaskData: Omit<TaskTemplate, 'id' | 'createdAt' | 'order'>) => {
    isUserMutationRef.current = true;
    const newTask: TaskTemplate = {
      ...newTaskData,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
      order: appData.tasks.length + 1,
    };
    setAppData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
  };

  // Update existing task template
  const updateTask = (id: string, updates: Partial<TaskTemplate>) => {
    isUserMutationRef.current = true;
    setAppData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
    }));
  };

  // Delete task template permanently (from template list completely)
  const deleteTaskPermanently = (id: string) => {
    isUserMutationRef.current = true;
    setAppData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== id),
    }));
  };

  const reorderTasks = (newTasks: TaskTemplate[]) => {
    isUserMutationRef.current = true;
    setAppData((prev) => ({
      ...prev,
      tasks: newTasks.map((t, idx) => ({ ...t, order: idx + 1 })),
    }));
  };

  // Account switching
  const switchAccount = (newEmail: string) => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    setActiveEmail(trimmed);
    setActiveEmailState(trimmed);
    setKnownAccounts(getKnownAccounts());
    setAppData(loadAppData(trimmed));
  };

  const updateAccountSettings = (updates: Partial<UserAccount>) => {
    isUserMutationRef.current = true;
    setAppData((prev) => ({
      ...prev,
      account: { ...(prev.account || { email: activeAccountEmail, displayName: activeAccountEmail.split('@')[0], cloudSyncEnabled: false }), ...updates },
    }));
  };

  const triggerSync = async () => {
    if (!navigator.onLine) {
      return { success: false, message: 'Офлайн режим: все изменения сохранены локально на устройстве.' };
    }
    setIsSyncing(true);
    try {
      const res = await syncWithCloud(
        appData,
        appData?.account?.supabaseUrl,
        appData?.account?.supabaseAnonKey
      );
      if (res.success && res.data) {
        isUserMutationRef.current = false;
        setAppData(res.data);
        if (res.updatedAt) {
          lastPushedAtRef.current = res.updatedAt;
          lastRemoteUpdatedAtRef.current = res.updatedAt;
        }
        setHasPendingSync(false);
        try {
          localStorage.removeItem('routine_pending_sync');
        } catch {}
        setLastSyncTime(new Date());
      }
      return res;
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  // Real-time synchronization: WebSocket, live polling, and visibility listeners
  useEffect(() => {
    if (!appData?.account?.cloudSyncEnabled) return;

    const client = getSupabaseClient(
      appData?.account?.supabaseUrl,
      appData?.account?.supabaseAnonKey
    );
    const email = appData?.account?.email || 'default@routine.app';

    // 1. Realtime WebSocket subscription
    let channel: any = null;
    if (client) {
      try {
        channel = client
          .channel('user_routines_realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_routines',
              filter: `user_email=eq.${email}`,
            },
            (payload: any) => {
              const remoteUpdated = payload?.new?.updated_at;
              // Ignore if it's our own update echoing back
              if (remoteUpdated && remoteUpdated === lastPushedAtRef.current) {
                return;
              }
              if (payload?.new?.data && remoteUpdated && remoteUpdated > (lastPushedAtRef.current || '')) {
                isUserMutationRef.current = false;
                setAppData(payload.new.data as AppData);
                lastRemoteUpdatedAtRef.current = remoteUpdated;
                setLastSyncTime(new Date());
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    // 2. Periodic background check (every 15 seconds, ONLY if tab is active)
    const pollInterval = setInterval(async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const res = await fetchFromCloud(
          appData?.account?.supabaseUrl,
          appData?.account?.supabaseAnonKey,
          email
        );
        if (
          res.success &&
          res.data &&
          res.updatedAt &&
          res.updatedAt > (lastRemoteUpdatedAtRef.current || '') &&
          res.updatedAt > (lastPushedAtRef.current || '')
        ) {
          isUserMutationRef.current = false;
          setAppData(res.data);
          lastRemoteUpdatedAtRef.current = res.updatedAt;
          setLastSyncTime(new Date());
        }
      }
    }, 15000);

    // 3. Online and visibilitychange listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const res = await fetchFromCloud(
          appData?.account?.supabaseUrl,
          appData?.account?.supabaseAnonKey,
          email
        );
        if (
          res.success &&
          res.data &&
          res.updatedAt &&
          res.updatedAt > (lastRemoteUpdatedAtRef.current || '') &&
          res.updatedAt > (lastPushedAtRef.current || '')
        ) {
          isUserMutationRef.current = false;
          setAppData(res.data);
          lastRemoteUpdatedAtRef.current = res.updatedAt;
          setLastSyncTime(new Date());
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (client && channel) {
        try {
          client.removeChannel(channel);
        } catch {}
      }
      clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    appData?.account?.cloudSyncEnabled,
    appData?.account?.supabaseUrl,
    appData?.account?.supabaseAnonKey,
    appData?.account?.email,
  ]);

  const exportBackup = () => {
    exportDataToJson(appData);
  };

  const importBackup = (newData: AppData) => {
    if (newData && Array.isArray(newData.tasks)) {
      isUserMutationRef.current = true;
      setAppData(newData);
    }
  };

  const [categories, setCategories] = useState<string[]>(() => getStoredCategories());

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      saveStoredCategories(updated);
      return updated;
    });
  };

  const deleteCategory = (cat: string) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c !== cat);
      saveStoredCategories(updated);
      return updated;
    });
    // If deleted category was used in any tasks, those tasks now have category: undefined
    isUserMutationRef.current = true;
    setAppData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.category === cat ? { ...task, category: undefined } : task
      ),
    }));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Calculate stats for any specific date
  const getDayStats = (dateStr: string) => {
    try {
      const parsed = parseISO(dateStr);
      const dayOfWeek = parsed.getDay() as DayOfWeek;
      const scheduledForDay = appData.tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
      const log = appData.history[dateStr];
      const completed = log ? log.completedTaskIds.filter(id => scheduledForDay.some(t => t.id === id)).length : 0;
      const total = scheduledForDay.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percentage };
    } catch {
      return { total: 0, completed: 0, percentage: 0 };
    }
  };

  return (
    <RoutineContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedDate,
        setSelectedDate,
        goToToday,
        appData,
        activeAccountEmail,
        knownAccounts,
        activeTasks,
        trashedTasks,
        dayCompletionRate,
        totalScheduledToday,
        isOnline,
        isSyncing,
        hasPendingSync,
        lastSyncTime,
        moveToTrash,
        restoreFromTrash,
        createTask,
        updateTask,
        deleteTaskPermanently,
        reorderTasks,
        switchAccount,
        updateAccountSettings,
        triggerSync,
        exportBackup,
        importBackup,
        getDayStats,
        categories,
        addCategory,
        deleteCategory,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
};

export const useRoutines = () => {
  const context = useContext(RoutineContext);
  if (!context) {
    throw new Error('useRoutines must be used within a RoutineProvider');
  }
  return context;
};
