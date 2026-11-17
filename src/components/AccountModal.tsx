import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Plus,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  Shield,
  HelpCircle,
  ExternalLink,
  Lock,
  KeyRound,
  Smartphone,
  Copy,
  Check,
} from 'lucide-react';
import { useRoutines } from '../context/RoutineContext';
import { haptic } from '../utils/haptics';
import { isPinConfigured, removeAppPin, lockApp } from './PinLock';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockNow?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onLockNow }) => {
  const {
    activeAccountEmail,
    knownAccounts,
    switchAccount,
    appData,
    updateAccountSettings,
    triggerSync,
    exportBackup,
    importBackup,
  } = useRoutines();

  const [newEmail, setNewEmail] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState(() => appData?.account?.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(() => appData?.account?.supabaseAnonKey || '');
  const [syncEnabled, setSyncEnabled] = useState(() => appData?.account?.cloudSyncEnabled || false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSupabaseHelp, setShowHelp] = useState(false);
  const [hasPinState, setHasPinState] = useState(() => isPinConfigured());
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasPinState(isPinConfigured());
    }
  }, [isOpen]);

  useEffect(() => {
    if (appData?.account) {
      setSupabaseUrl(appData.account.supabaseUrl || '');
      setSupabaseKey(appData.account.supabaseAnonKey || '');
      setSyncEnabled(appData.account.cloudSyncEnabled || false);
    }
  }, [appData?.account]);

  // Close on Escape key (Must be before any conditional returns)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    haptic.success();
    switchAccount(newEmail.trim());
    setNewEmail('');
  };

  const handleSaveSettings = async () => {
    haptic.light();
    const url = supabaseUrl.trim() || undefined;
    const key = supabaseKey.trim() || undefined;

    updateAccountSettings({
      supabaseUrl: url,
      supabaseAnonKey: key,
      cloudSyncEnabled: syncEnabled,
    });

    if (syncEnabled && url && key) {
      setIsSyncing(true);
      setSyncStatus('Синхронизация...');
      const res = await triggerSync(url, key);
      setIsSyncing(false);
      setSyncStatus(res.message || (res.success ? 'Синхронизировано!' : 'Ошибка'));
      if (res.success) haptic.success();
    } else {
      setSyncStatus('Настройки сохранены');
    }
  };

  const handleCopyMobileLink = () => {
    haptic.light();
    const url = supabaseUrl.trim();
    const key = supabaseKey.trim();
    if (!url || !key) return;

    const payload = {
      u: url,
      k: key,
      e: appData?.account?.email || 'default@routine.app',
    };
    const b64 = btoa(encodeURIComponent(JSON.stringify(payload)));
    const link = `${window.location.origin}${window.location.pathname}#sync=${b64}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }).catch(() => {
        prompt('Скопируйте эту ссылку для быстрой настройки на телефоне:', link);
      });
    } else {
      prompt('Скопируйте эту ссылку для быстрой настройки на телефоне:', link);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.tasks)) {
          importBackup(json);
          haptic.success();
          alert('Данные успешно импортированы!');
        } else {
          alert('Некорректный формат файла резервной копии.');
        }
      } catch (err) {
        alert('Ошибка при чтении файла резервной копии.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-lg max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-800 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              Управление аккаунтом
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onClose();
            }}
            style={{ outline: 'none' }}
            className="btn-volumetric-glass w-8 h-8 rounded-full flex items-center justify-center text-slate-500 outline-none"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          {/* Section 1: Active Email & Profiles */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-600" />
              Выбор профиля по почте
            </h4>
            <p className="text-xs text-slate-600 font-medium mb-3">
              Каждый email имеет своё изолированное расписание и историю ежедневных действий.
            </p>

            {/* Current Active */}
            <div className="p-3.5 rounded-2xl bg-white border border-teal-500/30 mb-3 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-black text-teal-700 tracking-wider">
                  Текущий активный профиль
                </span>
                <p className="text-sm font-black text-slate-800">
                  {activeAccountEmail === 'default@routine.app' ? 'Основной профиль (Локально)' : activeAccountEmail}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Данные надёжно сохранены в памяти устройства
                </p>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] rounded-full bg-teal-500/20 text-teal-900 font-black">
                Активен
              </span>
            </div>

            {/* Known Accounts List */}
            {(knownAccounts || []).length > 1 && (
              <div className="space-y-1.5 mb-3">
                <span className="text-xs font-bold text-slate-600">
                  Переключиться на другой профиль:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(knownAccounts || []).map((email) => {
                    if (email === activeAccountEmail) return null;
                    return (
                      <button
                        key={email}
                        type="button"
                        onClick={() => {
                          haptic.light();
                          switchAccount(email);
                        }}
                        style={{ outline: 'none' }}
                        className="btn-volumetric-glass px-3 py-1 text-xs rounded-full font-bold text-slate-700 outline-none"
                      >
                        {email}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add / Switch by entering new email */}
            <form onSubmit={handleAddEmail} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Введите email (например: my@mail.ru)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ outline: 'none' }}
                className="flex-1 px-4 py-2 rounded-2xl bg-white border border-stone-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                style={{ outline: 'none' }}
                className="btn-volumetric-cyan px-4 py-2 rounded-2xl text-white text-xs font-black flex items-center gap-1 shadow-md outline-none"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Войти</span>
              </button>
            </form>
          </div>

          {/* Section 2: Cloud Sync (Supabase Free) */}
          <div className="pt-4 border-t border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-teal-600" />
                Облачная синхронизация (ПК ⇄ Телефон)
              </h4>
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setShowHelp(!showSupabaseHelp);
                }}
                style={{ outline: 'none' }}
                className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1 outline-none"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Инструкция</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-3">
              <span className="font-bold text-amber-900/80">Опционально:</span> если пользуетесь на одном устройстве, настраивать не нужно (всё хранится локально). Облако требуется только для автоматической синхронизации между компьютером и телефоном.
            </p>

            {showSupabaseHelp && (
              <div className="p-3.5 mb-3 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-teal-900">
                  Как подключить бесплатную базу:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 font-medium">
                  <li>Зайдите на <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-teal-700 underline font-bold inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> и создайте бесплатный проект.</li>
                  <li>В разделе <strong>Project Settings → API</strong> скопируйте <strong>Project URL</strong> и <strong>Publishable key</strong> (или `anon public`).</li>
                  <li>В разделе <strong>SQL Editor</strong> выполните команды:
                    <pre className="mt-1 p-2 bg-slate-900 text-teal-300 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap">
create table if not exists user_routines ( user_email text primary key, data jsonb, updated_at timestamp default now() );
alter table user_routines replica identity full;
alter publication supabase_realtime add table user_routines;
                    </pre>
                  </li>
                  <li>Вставьте URL и ключ в поля ниже и нажмите «Сохранить».</li>
                </ol>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => {
                    haptic.light();
                    setSyncEnabled(e.target.checked);
                  }}
                  style={{ outline: 'none' }}
                  className="rounded-lg text-orange-500 w-4 h-4 border-slate-300 outline-none"
                />
                <span className="text-xs font-black text-slate-800">
                  Включить синхронизацию с облаком
                </span>
              </label>

              {syncEnabled && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      style={{ outline: 'none' }}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Supabase Anon Public Key
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      style={{ outline: 'none' }}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSyncing}
                  style={{ outline: 'none' }}
                  className="btn-volumetric-cyan px-4 py-2 rounded-xl text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50 shadow-md outline-none"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Сохранить и синхронизировать</span>
                </button>

                {syncStatus && (
                  <span className="text-xs text-slate-700 font-bold">
                    {syncStatus}
                  </span>
                )}
              </div>

              {/* Quick transfer button to sync Smartphone PWA/Browser in 1 second */}
              {syncEnabled && supabaseUrl && supabaseKey && (
                <div className="p-3.5 rounded-2xl bg-teal-50/90 border border-teal-200 text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-teal-700 shrink-0" />
                      Перенос настроек на смартфон
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyMobileLink}
                      style={{ outline: 'none' }}
                      className="btn-volumetric-cyan px-3 py-1 rounded-full text-white text-[11px] font-black flex items-center gap-1 outline-none cursor-pointer shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Скопировано!' : 'Скопировать ссылку'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Отправьте эту ссылку себе (например, в Telegram) и откройте её на смартфоне в браузере или в PWA. Облако подключится мгновенно без ручного ввода ключей!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Backup & Restore */}
          <div className="pt-4 border-t border-orange-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Резервная копия данных (JSON)
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  haptic.medium();
                  exportBackup();
                }}
                style={{ outline: 'none' }}
                className="btn-volumetric-glass flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-700 text-xs font-bold outline-none"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Скачать копию</span>
              </button>

              <label style={{ outline: 'none' }} className="btn-volumetric-glass flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-700 text-xs font-bold cursor-pointer outline-none">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Восстановить из файла</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Security & PIN Code */}
          <div className="pt-4 border-t border-orange-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              Безопасность и PIN-код
            </h4>
            <p className="text-xs text-slate-600 font-medium mb-3">
              {hasPinState
                ? 'PIN-код активен. Доступ к вашим задачам защищён паролем.'
                : 'Задайте PIN-код, чтобы никто посторонний не мог открыть ваш список задач.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  haptic.medium();
                  lockApp();
                  if (onLockNow) {
                    onLockNow();
                  } else {
                    window.location.reload();
                  }
                }}
                style={{ outline: 'none' }}
                className="btn-volumetric-glass flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-700 text-xs font-bold outline-none cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Заблокировать сейчас</span>
              </button>
              {hasPinState && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Сбросить PIN-код? После этого вход будет свободным.')) {
                      removeAppPin();
                      setHasPinState(false);
                      haptic.success();
                    }
                  }}
                  style={{ outline: 'none' }}
                  className="btn-volumetric-glass flex items-center gap-1.5 px-3.5 py-2 rounded-full text-rose-700 text-xs font-bold outline-none cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-rose-500" />
                  <span>Сбросить PIN</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed bottom */}
        <div className="p-3.5 sm:p-4 border-t border-orange-100 bg-[#fbf8f3] shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onClose();
            }}
            style={{ outline: 'none' }}
            className="btn-volumetric-glass px-6 py-2 text-xs font-black rounded-full text-slate-800 outline-none"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
