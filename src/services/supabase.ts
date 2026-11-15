import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData, TaskTemplate, DayLog } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export function getSupabaseClient(url?: string, key?: string): SupabaseClient | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const targetUrl = url || envUrl;
  const targetKey = key || envKey;

  if (!targetUrl || !targetKey) {
    return null;
  }

  if (cachedClient && currentUrl === targetUrl && currentKey === targetKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(targetUrl, targetKey);
    currentUrl = targetUrl;
    currentKey = targetKey;
    return cachedClient;
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

/**
 * Deep merges remote AppData with local AppData safely:
 * - Preserves tasks from both
 * - Unites completedTaskIds and timestamps for every date
 */
export function mergeAppData(remote: AppData, local: AppData): AppData {
  // Merge tasks by id
  const taskMap = new Map<string, TaskTemplate>();
  (remote.tasks || []).forEach((t) => taskMap.set(t.id, t));
  (local.tasks || []).forEach((t) => taskMap.set(t.id, t));

  // Merge history by date
  const allDates = new Set([
    ...Object.keys(remote.history || {}),
    ...Object.keys(local.history || {}),
  ]);
  const mergedHistory: Record<string, DayLog> = {};

  allDates.forEach((dateStr) => {
    const rLog = remote.history?.[dateStr];
    const lLog = local.history?.[dateStr];

    if (!rLog) {
      mergedHistory[dateStr] = lLog!;
      return;
    }
    if (!lLog) {
      mergedHistory[dateStr] = rLog;
      return;
    }

    // Both exist: union completedTaskIds
    const completedSet = new Set([
      ...(rLog.completedTaskIds || []),
      ...(lLog.completedTaskIds || []),
    ]);

    mergedHistory[dateStr] = {
      completedTaskIds: Array.from(completedSet),
      completedAt: { ...(rLog.completedAt || {}), ...(lLog.completedAt || {}) },
    };
  });

  return {
    ...local,
    tasks: Array.from(taskMap.values()),
    history: mergedHistory,
  };
}

/**
 * Fast fetch remote data from Supabase without writing
 */
export async function fetchFromCloud(
  url?: string,
  key?: string,
  email = 'default@routine.app'
): Promise<{ success: boolean; data?: AppData; updatedAt?: string }> {
  const client = getSupabaseClient(url, key);
  if (!client) return { success: false };

  try {
    const { data: remoteRecord, error } = await client
      .from('user_routines')
      .select('data, updated_at')
      .eq('user_email', email)
      .maybeSingle();

    if (error) {
      return { success: false };
    }

    if (remoteRecord && remoteRecord.data) {
      return {
        success: true,
        data: remoteRecord.data as AppData,
        updatedAt: remoteRecord.updated_at,
      };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Cloud sync function:
 * Full bidirectional sync with merge and push
 */
export async function syncWithCloud(
  appData: AppData,
  url?: string,
  key?: string
): Promise<{ success: boolean; data?: AppData; message?: string }> {
  const client = getSupabaseClient(url, key);
  if (!client) {
    return {
      success: false,
      message: 'Supabase не настроен (укажите URL и Anon Key в настройках)',
    };
  }

  const email = appData?.account?.email || 'default@routine.app';

  try {
    // 1. Fetch remote record
    const { data: remoteRecord, error: fetchError } = await client
      .from('user_routines')
      .select('data, updated_at')
      .eq('user_email', email)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('Fetch error from Supabase:', fetchError);
    }

    if (remoteRecord && remoteRecord.data) {
      const remoteData = remoteRecord.data as AppData;
      const mergedData = mergeAppData(remoteData, appData);

      // Push merged back to Supabase
      await client.from('user_routines').upsert({
        user_email: email,
        data: mergedData,
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        data: mergedData,
        message: 'Данные успешно синхронизированы с облаком!',
      };
    } else {
      // No remote record yet, push current local data
      const { error: upsertError } = await client.from('user_routines').upsert({
        user_email: email,
        data: appData,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        return { success: false, message: `Ошибка загрузки в облако: ${upsertError.message}` };
      }

      return { success: true, data: appData, message: 'Данные сохранены в облаке!' };
    }
  } catch (error: any) {
    return { success: false, message: error?.message || 'Ошибка подключения к облаку' };
  }
}
