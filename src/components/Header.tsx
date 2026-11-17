import React from 'react';
import { CheckCircle2, CloudOff, Cloud, RefreshCw, User, Plus } from 'lucide-react';
import { useRoutines } from '../context/RoutineContext';
import { haptic } from '../utils/haptics';

interface HeaderProps {
  onOpenAccount: () => void;
  onOpenNewTask: () => void;
  installPrompt?: any;
  onInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAccount,
  onOpenNewTask,
}) => {
  const {
    activeAccountEmail,
    appData,
    triggerSync,
    viewMode,
    isOnline,
    isSyncing,
    hasPendingSync,
  } = useRoutines();
  const [syncing, setSyncing] = React.useState(false);

  const containerMaxWidth = viewMode === 'day' ? 'max-w-3xl' : 'max-w-5xl';
  const isCloudConfigured = Boolean(
    appData?.account?.cloudSyncEnabled &&
    appData?.account?.supabaseUrl &&
    appData?.account?.supabaseAnonKey
  );

  const handleSync = async () => {
    haptic.light();
    if (!isCloudConfigured) {
      onOpenAccount();
      return;
    }
    setSyncing(true);
    await triggerSync();
    setTimeout(() => setSyncing(false), 500);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#f7f2ea]/95 backdrop-blur-2xl border-b border-[#e6dcce] px-3 py-2.5 sm:px-6 sm:py-3 transition-colors shadow-[0_4px_16px_rgba(160,110,75,0.06)]">
      <div className={`${containerMaxWidth} w-full mx-auto flex items-center justify-between gap-2 sm:gap-3 transition-all duration-300`}>
        {/* App Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 p-0.5 shadow-[0_4px_14px_rgba(249,115,22,0.3)] flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-[10px] sm:rounded-[14px] bg-[#fff8f0] flex items-center justify-center text-amber-700">
              <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black tracking-tight text-amber-950 leading-tight">
              Ежедневки
            </h1>
            <p className="text-[11px] text-amber-900/60 font-semibold hidden sm:block">
              Трекер повторяющихся действий
            </p>
          </div>
        </div>

        {/* Top Actions with 3D Volumetric Styling */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Smart Live Sync & Network Status Button (3D Circle) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              handleSync();
            }}
            disabled={isSyncing || syncing}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className={`btn-volumetric-glass w-9 h-9 sm:w-10 sm:h-10 rounded-full relative flex items-center justify-center p-0 outline-none shrink-0 cursor-pointer ${
              !isCloudConfigured ? 'border-amber-300/80 bg-amber-50/60' : ''
            }`}
            title={
              !isOnline
                ? 'Офлайн: интернет отключён. Приложение полностью работает автономно'
                : isSyncing || syncing
                ? 'Синхронизация с облаком...'
                : isCloudConfigured
                ? hasPendingSync
                  ? 'Облако активно (отправка изменений...)'
                  : 'Облако синхронизировано (нажмите для проверки)'
                : 'Облако НЕ подключено на этом устройстве — нажмите для настройки'
            }
          >
            {!isOnline ? (
              <CloudOff className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            ) : isSyncing || syncing ? (
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 animate-spin" />
            ) : isCloudConfigured ? (
              <div className="relative flex items-center justify-center">
                <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                {/* Active Synced Indicator (Green dot) */}
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]"></span>
                </span>
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <CloudOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600/80" />
                {/* Warning dot: Not connected to cloud */}
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)]"></span>
                </span>
              </div>
            )}
          </button>

          {/* Account Profile Button (3D Circle) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              haptic.light();
              onOpenAccount();
            }}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-glass w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-0 text-slate-700 outline-none shrink-0 cursor-pointer relative"
            title={`Управление аккаунтом и синхронизацией (${activeAccountEmail || 'default'})`}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            {!isCloudConfigured && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white"></span>
              </span>
            )}
          </button>

          {/* Add Task Button with Volumetric 3D Orange (3D Circle) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              haptic.medium();
              onOpenNewTask();
            }}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-cyan w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center p-0 text-white outline-none shrink-0 cursor-pointer"
            title="Добавить действие"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8] text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};
