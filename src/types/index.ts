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
  history: Record<string, DayLog>; // YYYY-MM-DD -> DayLog
}
