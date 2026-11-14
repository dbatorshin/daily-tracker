import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';

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
 * Cloud sync function:
 * Syncs user data with Supabase table 'user_routines':
 * table schema:
 *   user_email (text primary key)
 *   data (jsonb)
 *   updated_at (timestamp)
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
      message: 'Supabase не настроен (укажите URL и Anon Key в настройках аккаунта)',
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
      // Merge remote and local history
      const remoteData = remoteRecord.data as AppData;
      const mergedHistory = { ...remoteData.history, ...appData.history };

      // Tasks: prefer whichever has more recent updates, or merge by id
      const taskMap = new Map();
      (remoteData.tasks || []).forEach(t => taskMap.set(t.id, t));
      (appData.tasks || []).forEach(t => taskMap.set(t.id, t));

      const mergedData: AppData = {
        ...appData,
        tasks: Array.from(taskMap.values()),
        history: mergedHistory,
      };

      // Push merged back to Supabase
      await client.from('user_routines').upsert({
        user_email: email,
        data: mergedData,
        updated_at: new Date().toISOString(),
      });

      return { success: true, data: mergedData, message: 'Данные успешно синхронизированы с облаком!' };
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
