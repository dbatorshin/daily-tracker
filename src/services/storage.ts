import type { AppData, TaskTemplate, UserAccount } from '../types';

export const DEFAULT_TASKS: TaskTemplate[] = [
  {
    id: 'routine-1',
    title: 'Зарядка',
    description: 'Утренняя физическая разминка',
    category: 'Здоровье',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Каждый день (включая Вс)
    time: '00:00–01:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 1,
  },
  {
    id: 'routine-2',
    title: 'Благодарность',
    description: 'Практика благодарности и настрой на день',
    category: 'Осознанность',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Каждый день (включая Вс)
    time: '01:00–02:00',
    color: '#10b981', // Зеленый
    createdAt: new Date().toISOString(),
    order: 2,
  },
  {
    id: 'routine-3',
    title: 'Чтение',
    description: 'Чтение полезной литературы',
    category: 'Развитие',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн - Сб (Исключено в Воскресенье)
    time: '02:00–03:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 3,
  },
  {
    id: 'routine-4',
    title: 'English',
    description: 'Изучение английского языка',
    category: 'Языки',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Каждый день (включая Вс)
    time: '03:00–04:00',
    color: '#f87171', // Коралловый / Красноватый
    createdAt: new Date().toISOString(),
    order: 4,
  },
  {
    id: 'routine-5',
    title: 'Arabian',
    description: 'Изучение арабского языка',
    category: 'Языки',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн - Сб (Исключено в Воскресенье)
    time: '04:00–05:00',
    color: '#a855f7', // Фиолетовый / Лавандовый
    createdAt: new Date().toISOString(),
    order: 5,
  },
  {
    id: 'routine-6',
    title: 'Claude',
    description: 'Работа и практика с Claude',
    category: 'AI / Работа',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн - Сб (Исключено в Воскресенье)
    time: '05:00–06:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 6,
  },
  {
    id: 'routine-7',
    title: 'Cloude на максималках',
    description: 'Интенсивная сессия и глубокая работа',
    category: 'AI / Работа',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн - Сб (Исключено в Воскресенье)
    time: '06:00–07:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 7,
  },
  {
    id: 'routine-8',
    title: 'Youtube story',
    description: 'Создание контента и истории для YouTube',
    category: 'Контент',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн - Сб (Исключено в Воскресенье)
    time: '07:00–08:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 8,
  },
  {
    id: 'routine-9',
    title: 'Контакты B',
    description: 'Коммуникация, нетворкинг и связи',
    category: 'Нетворкинг',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Пн - Сб (Исключено в Воскресенье)
    time: '08:00–09:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 9,
  },
  {
    id: 'routine-10',
    title: 'Думай и богатей',
    description: 'Мышление, стратегия и цели',
    category: 'Развитие',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Каждый день (включая Вс)
    time: '09:00–10:00',
    color: '#2563eb', // Синий
    createdAt: new Date().toISOString(),
    order: 10,
  },
];

export const DEFAULT_CATEGORIES = [
  'Здоровье',
  'Осознанность',
  'Языки',
  'AI / Работа',
  'Контент',
  'Нетворкинг',
  'Развитие',
  'Быт',
];

export function getStoredCategories(): string[] {
  try {
    const saved = localStorage.getItem('daily_routines_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_CATEGORIES;
}

export function saveStoredCategories(categories: string[]): void {
  try {
    localStorage.setItem('daily_routines_categories', JSON.stringify(categories));
  } catch (e) {
    console.error(e);
  }
}

const CURRENT_VERSION = 4;
const STORAGE_KEY_PREFIX = 'daily_routines_data_';
const CURRENT_EMAIL_KEY = 'daily_routines_active_email';
const ALL_ACCOUNTS_KEY = 'daily_routines_all_emails';

// Generate complete history for Nov 1 to Nov 13, 2026, and NO tasks before Nov 2026
export function generateNovemberHistory(tasks: TaskTemplate[]): Record<string, import('../types').DayLog> {
  const history: Record<string, import('../types').DayLog> = {};
  for (let d = 1; d <= 13; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-11-${dayStr}`;
    // In 2026, month index 10 is November. 2026-11-01 was Sunday (day 0)
    const dateObj = new Date(2026, 10, d);
    const dayOfWeek = dateObj.getDay() as import('../types').DayOfWeek;
    const scheduled = tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
    const completedTaskIds = scheduled.map((t) => t.id);
    const completedAt: Record<string, string> = {};
    scheduled.forEach((t) => {
      completedAt[t.id] = `2026-11-${dayStr}T10:00:00.000Z`;
    });
    history[dateStr] = {
      completedTaskIds,
      completedAt,
    };
  }
  return history;
}

export function getDefaultAccount(email = 'user@example.com'): UserAccount {
  return {
    email,
    displayName: email.split('@')[0],
    cloudSyncEnabled: false,
  };
}

export function getActiveEmail(): string {
  try {
    const saved = localStorage.getItem(CURRENT_EMAIL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    console.error(e);
  }
  return 'default@routine.app';
}

export function setActiveEmail(email: string): void {
  try {
    localStorage.setItem(CURRENT_EMAIL_KEY, email);
    const accounts = getKnownAccounts();
    if (!accounts.includes(email)) {
      accounts.push(email);
      localStorage.setItem(ALL_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getKnownAccounts(): string[] {
  try {
    const raw = localStorage.getItem(ALL_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return ['default@routine.app'];
}

export function loadAppData(email: string): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + email);
    if (raw) {
      const data: AppData = JSON.parse(raw);
      if (data && Array.isArray(data.tasks)) {
        const tasks = data.tasks.length > 0 ? data.tasks : DEFAULT_TASKS;

        // Clean out any historical dates before Nov 1, 2026 (October and earlier)
        const cleanedHistory: Record<string, import('../types').DayLog> = {};
        for (const [k, v] of Object.entries(data.history || {})) {
          if (k >= '2026-11-01') {
            cleanedHistory[k] = v;
          }
        }

        // Migration or initial population for version < 3
        const safeAccount = (data.account && typeof data.account === 'object')
          ? { ...getDefaultAccount(email), ...data.account }
          : getDefaultAccount(email);

        if (!data.version || data.version < CURRENT_VERSION) {
          const novHistory = generateNovemberHistory(tasks);
          for (const [k, v] of Object.entries(novHistory)) {
            cleanedHistory[k] = v;
          }

          const migrated: AppData = {
            ...data,
            version: CURRENT_VERSION,
            account: safeAccount,
            tasks,
            history: cleanedHistory,
          };
          saveAppData(email, migrated);
          return migrated;
        }

        // Ensure Nov 1-13 completed tasks exist and October/earlier are purged
        const novHistory = generateNovemberHistory(tasks);
        for (let d = 1; d <= 13; d++) {
          const dStr = `2026-11-${d < 10 ? '0' + d : d}`;
          if (!cleanedHistory[dStr] || cleanedHistory[dStr].completedTaskIds.length === 0) {
            cleanedHistory[dStr] = novHistory[dStr];
          }
        }
        // Explicitly ensure 2026-11-13 has all scheduled tasks completed as requested
        if (novHistory['2026-11-13']) {
          cleanedHistory['2026-11-13'] = novHistory['2026-11-13'];
        }

        return {
          ...data,
          account: safeAccount,
          history: cleanedHistory,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load data from storage:', e);
  }

  // Fallback initial data with Nov 1-12 completed and Nov 13 empty
  const initialHistory = generateNovemberHistory(DEFAULT_TASKS);
  return {
    version: CURRENT_VERSION,
    account: getDefaultAccount(email),
    tasks: DEFAULT_TASKS,
    history: initialHistory,
  };
}

export function saveAppData(email: string, data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + email, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to storage:', e);
  }
}

export function exportDataToJson(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const emailTag = data?.account?.email ? data.account.email.split('@')[0] : 'user';
  a.download = `daily-routines-backup-${emailTag}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
