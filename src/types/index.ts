export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  daysOfWeek: DayOfWeek[]; // which days this action should occur
  time?: string; // optional time of day e.g. "08:00"
  color?: string; // hex or tailwind color
  createdAt: string;
  order: number;
}

export interface DayLog {
  completedTaskIds: string[]; // task IDs completed (moved to trash) for this specific date
  completedAt: Record<string, string>; // taskId -> ISO timestamp
  restoredAt?: Record<string, string>; // taskId -> ISO timestamp when restored to active list
  animationIndex?: number; // Deterministic animation index (0..9) synced across all devices
}

export interface UserAccount {
  email: string;
  displayName?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  cloudSyncEnabled: boolean;
  lastSyncedAt?: string;
}

export type ViewMode = 'day' | 'week' | 'month' | 'year';

export interface AppData {
  version: number;
  account: UserAccount;
  tasks: TaskTemplate[];
  deletedTaskIds?: string[]; // IDs of permanently deleted tasks (prevents resurrection in sync)
  categories?: string[]; // Synced list of categories across all devices
  deletedCategories?: string[]; // Permanently deleted category names (prevents resurrection in sync)
  history: Record<string, DayLog>; // YYYY-MM-DD -> DayLog
}
