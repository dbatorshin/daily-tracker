import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData, TaskTemplate, DayLog } from '../types';
import { ensureCompleteYear2026 } from './storage';

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

export function parseTimestamp(ts?: string | null): number {
  if (!ts) return 0;
  const time = new Date(ts).getTime();
  return isNaN(time) ? 0 : time;
}

/**
 * Safe Conflict-Free (LWW) merge of remote and local application state
 */
export function mergeAppData(remote: AppData, local: AppData): AppData {
  const taskMap = new Map<string, TaskTemplate>();
  (remote.tasks || []).forEach((t) => taskMap.set(t.id, t));
  (local.tasks || []).forEach((t) => taskMap.set(t.id, t));

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

    // Collect all task IDs ever modified for this date
    const allTaskIds = new Set([
      ...(rLog.completedTaskIds || []),
      ...(lLog.completedTaskIds || []),
      ...Object.keys(rLog.completedAt || {}),
      ...Object.keys(lLog.completedAt || {}),
      ...Object.keys(rLog.restoredAt || {}),
      ...Object.keys(lLog.restoredAt || {}),
    ]);

    const mergedCompletedIds: string[] = [];
    const mergedCompletedAt: Record<string, string> = {};
    const mergedRestoredAt: Record<string, string> = {};

    allTaskIds.forEach((taskId) => {
      const rComp = parseTimestamp(rLog.completedAt?.[taskId]);
      const lComp = parseTimestamp(lLog.completedAt?.[taskId]);
      const maxComp = Math.max(rComp, lComp);

      const rRest = parseTimestamp(rLog.restoredAt?.[taskId]);
      const lRest = parseTimestamp(lLog.restoredAt?.[taskId]);
      const maxRest = Math.max(rRest, lRest);

      const hasLegacyComp =
        maxComp === 0 &&
        ((rLog.completedTaskIds || []).includes(taskId) ||
         (lLog.completedTaskIds || []).includes(taskId));

      if (maxComp > maxRest || (hasLegacyComp && maxRest === 0)) {
        mergedCompletedIds.push(taskId);
        const compDateStr =
          (rComp >= lComp ? rLog.completedAt?.[taskId] : lLog.completedAt?.[taskId]) ||
          new Date().toISOString();
        mergedCompletedAt[taskId] = compDateStr;
      } else if (maxRest > 0) {
        const restDateStr =
          (rRest >= lRest ? rLog.restoredAt?.[taskId] : lLog.restoredAt?.[taskId]) ||
          new Date().toISOString();
        mergedRestoredAt[taskId] = restDateStr;
      }
    });

    mergedHistory[dateStr] = {
      completedTaskIds: mergedCompletedIds,
      completedAt: mergedCompletedAt,
      restoredAt: mergedRestoredAt,
      animationIndex: lLog.animationIndex ?? rLog.animationIndex,
    };
  });

  return ensureCompleteYear2026({
    ...local,
    tasks: Array.from(taskMap.values()),
    history: mergedHistory,
  });
}

/**
 * Push local data to Supabase with automatic merge to prevent overwriting other devices
 */
export async function pushToCloud(
  appData: AppData,
  url?: string,
  key?: string
): Promise<{ success: boolean; data?: AppData; updatedAt?: string; message?: string }> {
  const client = getSupabaseClient(url, key);
  if (!client) return { success: false, message: 'Supabase не настроен' };

  const email = appData?.account?.email || 'default@routine.app';
  const now = new Date().toISOString();

  try {
    // 1. Fetch remote record to merge concurrent updates from other devices
    const { data: remoteRecord } = await client
      .from('user_routines')
      .select('data, updated_at')
      .eq('user_email', email)
      .maybeSingle();

    let dataToPush = appData;
    if (remoteRecord && remoteRecord.data) {
      dataToPush = mergeAppData(remoteRecord.data as AppData, appData);
    }

    const { error } = await client.from('user_routines').upsert({
      user_email: email,
      data: dataToPush,
      updated_at: now,
    });

    if (error) {
      console.warn('Push error to Supabase:', error);
      return { success: false, message: error.message };
    }
    return { success: true, data: dataToPush, updatedAt: now };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Ошибка отправки' };
  }
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
        data: ensureCompleteYear2026(remoteRecord.data as AppData),
        updatedAt: remoteRecord.updated_at,
      };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Cloud sync function (Used for initial connection and manual sync button)
 */
export async function syncWithCloud(
  appData: AppData,
  url?: string,
  key?: string
): Promise<{ success: boolean; data?: AppData; updatedAt?: string; message?: string }> {
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

    const now = new Date().toISOString();

    if (remoteRecord && remoteRecord.data) {
      const remoteData = remoteRecord.data as AppData;
      // On initial manual sync, if remote exists, merge once
      const mergedData = mergeAppData(remoteData, appData);

      await client.from('user_routines').upsert({
        user_email: email,
        data: mergedData,
        updated_at: now,
      });

      return {
        success: true,
        data: mergedData,
        updatedAt: now,
        message: 'Данные успешно синхронизированы с облаком!',
      };
    } else {
      // No remote record yet, push current local data
      const { error: upsertError } = await client.from('user_routines').upsert({
        user_email: email,
        data: appData,
        updated_at: now,
      });

      if (upsertError) {
        return { success: false, message: `Ошибка загрузки в облако: ${upsertError.message}` };
      }

      return {
        success: true,
        data: appData,
        updatedAt: now,
        message: 'Данные сохранены в облаке!',
      };
    }
  } catch (error: any) {
    return { success: false, message: error?.message || 'Ошибка подключения к облаку' };
  }
}
