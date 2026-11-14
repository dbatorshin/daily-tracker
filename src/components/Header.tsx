import React from 'react';
import { CheckCircle2, CloudOff, RefreshCw, User, Download, Plus } from 'lucide-react';
import { useRoutines } from '../context/RoutineContext';
import { haptic } from '../utils/haptics';

interface HeaderProps {
  onOpenAccount: () => void;
  onOpenNewTask: () => void;
  installPrompt: any;
  onInstall: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAccount,
  onOpenNewTask,
  installPrompt,
  onInstall,
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

  const handleSync = async () => {
    haptic.light();
    setSyncing(true);
    await triggerSync();
    setTimeout(() => setSyncing(false), 600);
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-amber-950 leading-tight">
                Ежедневки
              </h1>
              <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-950 border border-orange-400/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-amber-900/60 font-semibold hidden sm:block">
              Трекер повторяющихся действий
            </p>
          </div>
        </div>

        {/* Top Actions with 3D Volumetric Styling */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Install PWA Button */}
          {installPrompt && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                (e.currentTarget as HTMLButtonElement).blur();
                haptic.medium();
                onInstall();
              }}
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              className="btn-volumetric-cyan px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs rounded-full flex items-center gap-1.5 outline-none shrink-0"
              title="Установить как приложение"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline text-white">Установить</span>
            </button>
          )}

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
            className="btn-volumetric-glass w-8 h-8 sm:w-9 sm:h-9 rounded-full relative flex items-center justify-center text-slate-700 outline-none shrink-0 cursor-pointer"
            title={
              !isOnline
                ? 'Офлайн: интернет отключён. Приложение полностью работает автономно'
                : isSyncing || syncing
                ? 'Синхронизация данных...'
                : appData?.account?.cloudSyncEnabled
                ? hasPendingSync
                  ? 'В сети (есть локальные изменения для отправки)'
                  : 'В сети (облако синхронизировано)'
                : 'В сети (работает локально в браузере)'
            }
          >
            {!isOnline ? (
              <CloudOff className="w-4 h-4 text-slate-400" />
            ) : isSyncing || syncing ? (
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
            ) : (
              <div className="relative flex items-center justify-center">
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 transition-transform ${syncing ? 'animate-spin' : ''}`} />
                {/* Active Online Indicator (Green dot) */}
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]"></span>
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
            className="btn-volumetric-glass w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-slate-800 outline-none shrink-0 cursor-pointer"
            title={`Управление аккаунтом (${activeAccountEmail || 'default'})`}
          >
            <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-900 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Add Task Button with Volumetric 3D Orange */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              haptic.medium();
              onOpenNewTask();
            }}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-cyan w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white outline-none shrink-0"
            title="Добавить действие"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8] text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};
