import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  Sparkles,
  Sun,
  Info,
  Check,
  Activity,
  Heart,
  BookOpen,
  Globe,
  Bot,
  Zap,
  PlayCircle,
  Users,
  Target,
  Smile,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRoutines } from '../context/RoutineContext';
import type { TaskTemplate } from '../types';
import { haptic } from '../utils/haptics';
import { CelebrationCard } from './CelebrationCard';

interface DayViewProps {
  onEditTask: (task: TaskTemplate) => void;
  onAddNewTask: () => void;
}

// Icon bubbles matching the reference image's pastel palettes
function getTaskIcon(task: TaskTemplate) {
  const t = task.title.toLowerCase();
  if (t.includes('зарядка') || t.includes('спорт')) return <Activity className="w-5 h-5 text-emerald-600" />;
  if (t.includes('благодарность')) return <Heart className="w-5 h-5 text-rose-500" />;
  if (t.includes('чтение') || t.includes('книг')) return <BookOpen className="w-5 h-5 text-sky-600" />;
  if (t.includes('english')) return <Globe className="w-5 h-5 text-red-500" />;
  if (t.includes('arabian') || t.includes('язык')) return <Smile className="w-5 h-5 text-purple-600" />;
  if (t.includes('максималках')) return <Zap className="w-5 h-5 text-amber-500" />;
  if (t.includes('claude') || t.includes('ai')) return <Bot className="w-5 h-5 text-indigo-600" />;
  if (t.includes('youtube') || t.includes('контент')) return <PlayCircle className="w-5 h-5 text-rose-600" />;
  if (t.includes('контакт') || t.includes('нетворк')) return <Users className="w-5 h-5 text-cyan-600" />;
  if (t.includes('богатей') || t.includes('цел')) return <Target className="w-5 h-5 text-teal-600" />;
  return <Sparkles className="w-5 h-5 text-teal-600" />;
}

export const DayView: React.FC<DayViewProps> = ({ onEditTask, onAddNewTask }) => {
  const {
    selectedDate,
    setSelectedDate,
    goToToday,
    activeTasks,
    trashedTasks,
    dayCompletionRate,
    totalScheduledToday,
    moveToTrash,
    restoreFromTrash,
    reorderTasks,
    appData,
  } = useRoutines();

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<string[]>([]);

  const isCurrentToday = isToday(selectedDate);
  const isSunday = selectedDate.getDay() === 0;
  const isSaturday = selectedDate.getDay() === 6;

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const currentDayLog = appData?.history[selectedDateStr];

  const streakDays = useMemo(() => {
    let count = 0;
    let checkDate = new Date();
    while (true) {
      const dStr = format(checkDate, 'yyyy-MM-dd');
      const hist = appData?.history[dStr];
      if (hist && hist.completedTaskIds && hist.completedTaskIds.length > 0) {
        count++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return Math.max(1, count);
  }, [appData]);

  // Day navigation with haptics
  const handlePrevDay = () => {
    haptic.light();
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    haptic.light();
    setSelectedDate(addDays(selectedDate, 1));
  };

  // Point 11: Smooth vibration without explosions/confetti
  useEffect(() => {
    if (dayCompletionRate === 100 && totalScheduledToday > 0) {
      haptic.celebrate();
    }
  }, [dayCompletionRate, totalScheduledToday]);

  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setCompletingTaskIds([]);
  }, [selectedDateStr]);

  const handleCheckTask = (task: TaskTemplate) => {
    if (completingTaskIds.includes(task.id)) return;
    haptic.success();
    setCompletingTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
    const timer = setTimeout(() => {
      moveToTrash(task.id);
      setCompletingTaskIds((prev) => prev.filter((id) => id !== task.id));
      timeoutsRef.current.delete(timer);
    }, 340);
    timeoutsRef.current.add(timer);
  };

  const handleRestoreTask = (task: TaskTemplate) => {
    haptic.medium();
    restoreFromTrash(task.id);
  };

  // Drag & drop reordering state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    taskId: string;
    position: 'before' | 'after';
  } | null>(null);

  const pointerStateRef = useRef<{
    pointerId: number;
    taskId: string;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, taskId: string) => {
    if (e.button !== 0) return;
    if (activeTasks.length <= 1) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    pointerStateRef.current = {
      pointerId: e.pointerId,
      taskId,
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;

    if (!state.isDragging) {
      const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
      if (dist > 5) {
        state.isDragging = true;
        setDraggingTaskId(state.taskId);
        haptic.medium();
      } else {
        return;
      }
    }

    // Auto-scroll when near top or bottom of viewport
    if (e.clientY < 80) {
      window.scrollBy({ top: -7, behavior: 'instant' });
    } else if (e.clientY > window.innerHeight - 80) {
      window.scrollBy({ top: 7, behavior: 'instant' });
    }

    // Find card under pointer
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let targetCardEl: HTMLElement | null = null;
    for (const el of elements) {
      const card = el.closest<HTMLElement>('[data-task-id]');
      if (card && card.getAttribute('data-task-id') !== state.taskId) {
        targetCardEl = card;
        break;
      }
    }

    if (targetCardEl) {
      const targetId = targetCardEl.getAttribute('data-task-id');
      if (targetId) {
        const rect = targetCardEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position: 'before' | 'after' = e.clientY < midY ? 'before' : 'after';

        setDropTarget((prev) => {
          if (prev?.taskId === targetId && prev?.position === position) return prev;
          haptic.light();
          return { taskId: targetId, position };
        });
        return;
      }
    }

    // Check if dragging above the first or below the last card
    const listEl = document.querySelector('[data-task-list]');
    if (listEl) {
      const listRect = listEl.getBoundingClientRect();
      if (e.clientY < listRect.top && activeTasks.length > 0) {
        const first = activeTasks[0];
        if (first.id !== state.taskId) {
          setDropTarget((prev) => {
            if (prev?.taskId === first.id && prev?.position === 'before') return prev;
            return { taskId: first.id, position: 'before' };
          });
          return;
        }
      } else if (e.clientY > listRect.bottom && activeTasks.length > 0) {
        const last = activeTasks[activeTasks.length - 1];
        if (last.id !== state.taskId) {
          setDropTarget((prev) => {
            if (prev?.taskId === last.id && prev?.position === 'after') return prev;
            return { taskId: last.id, position: 'after' };
          });
          return;
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (state.isDragging && dropTarget) {
      const fromIdx = activeTasks.findIndex((t) => t.id === state.taskId);
      const toTaskIdx = activeTasks.findIndex((t) => t.id === dropTarget.taskId);

      if (fromIdx !== -1 && toTaskIdx !== -1) {
        let targetIdx = toTaskIdx;
        if (dropTarget.position === 'after') {
          targetIdx += 1;
        }
        if (fromIdx < targetIdx) {
          targetIdx -= 1;
        }

        if (fromIdx !== targetIdx) {
          const newOrdered = [...activeTasks];
          const [moved] = newOrdered.splice(fromIdx, 1);
          newOrdered.splice(targetIdx, 0, moved);

          reorderTasks(newOrdered);
          haptic.success();
        }
      }
    }

    pointerStateRef.current = null;
    setDraggingTaskId(null);
    setDropTarget(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    pointerStateRef.current = null;
    setDraggingTaskId(null);
    setDropTarget(null);
  };

  // Date formatting
  const rawDayOfWeek = format(selectedDate, 'EEEE', { locale: ru });
  const capitalizedDayOfWeek = rawDayOfWeek.charAt(0).toUpperCase() + rawDayOfWeek.slice(1);
  const formattedDayAndMonth = format(selectedDate, 'd MMMM', { locale: ru }).toLowerCase();

  // Incomplete past days info (Point 9 & 10: under day card, red-tinted reminder)
  const incompleteDaysInfo = useMemo(() => {
    const list: { date: Date; dateStr: string; label: string; count: number }[] = [];
    for (let i = 1; i <= 5; i++) {
      const pastDay = subDays(selectedDate, i);
      const dayOfWeek = pastDay.getDay();
      const dateStr = format(pastDay, 'yyyy-MM-dd');
      const scheduled = appData.tasks.filter((t) =>
        t.daysOfWeek.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)
      );
      const log = appData.history[dateStr];
      const completedIds = log ? log.completedTaskIds : [];
      const incomplete = scheduled.filter((t) => !completedIds.includes(t.id));
      if (incomplete.length > 0) {
        const label = i === 1 ? 'вчера' : i === 2 ? 'позавчера' : format(pastDay, 'd MMMM', { locale: ru });
        list.push({ date: pastDay, dateStr, label, count: incomplete.length });
      }
    }
    return list;
  }, [selectedDate, appData.tasks, appData.history]);

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-0">
      {/* Top Glass Summary Card — peach tint on Saturday */}
      <div className={`glass-panel p-5 sm:p-6${isSaturday ? ' saturday-header' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-start sm:items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight">
                <span>{capitalizedDayOfWeek},</span>{' '}
                <span className="block sm:inline whitespace-nowrap">{formattedDayAndMonth}</span>
              </h2>
              {isCurrentToday && (
                <span className="glass-status-pill text-[10px] font-black shrink-0 mt-0.5 sm:mt-0">
                  Сегодня
                </span>
              )}
              {isSaturday && (
                <span className="text-[10px] font-black text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-full border border-orange-300/60 shrink-0 mt-0.5 sm:mt-0">
                  Суббота
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Выполнено {trashedTasks.length} из {totalScheduledToday} ({dayCompletionRate}%)
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-orange-600 tracking-tight">
              {dayCompletionRate}%
            </span>
          </div>
        </div>

        {/* 3D Orange/Peach Progress Bar */}
        <div className="p-1 rounded-full bg-amber-100/60 border border-amber-200/60 shadow-[inset_0_2px_4px_rgba(180,100,40,0.06)]">
          <div className="h-3 rounded-full bg-slate-200/50 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 rounded-full transition-all duration-500 shadow-[0_2px_8px_rgba(249,115,22,0.4)]"
              style={{ width: `${dayCompletionRate}%` }}
            />
          </div>
        </div>

        {isSunday && (
          <div className="mt-3.5 flex items-center gap-2 text-xs text-amber-900 font-bold bg-amber-100/60 p-3 rounded-2xl border border-amber-300/60 shadow-sm backdrop-blur-md">
            <Sun className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Воскресенье — день отдыха</span>
          </div>
        )}
      </div>

      {/* Point 9 & 10: Reminder Field DIRECTLY UNDER the day cell, closer to red */}
      {incompleteDaysInfo.length > 0 && (
        <div className="reminder-card p-3 sm:p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-300/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-rose-900 leading-tight">
                Напоминание о незавершенных днях:
              </p>
              <p className="text-[11px] font-semibold text-rose-700/90 truncate mt-0.5">
                {incompleteDaysInfo.map((d, idx) => (
                  <span key={d.dateStr}>
                    {idx > 0 && ' · '}
                    {d.label} — {d.count} {d.count === 1 ? 'действие' : d.count < 5 ? 'действия' : 'действий'}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptic.light();
              setSelectedDate(incompleteDaysInfo[0].date);
            }}
            className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-gradient-to-b from-rose-400 to-rose-600 hover:from-rose-500 hover:to-rose-700 shadow-sm rounded-full shrink-0 transition active:scale-95"
          >
            Перейти →
          </button>
        </div>
      )}

      {/* Task Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1 sm:px-2 pt-1">
          <span className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wide whitespace-nowrap shrink-0">
            Действия на день ({activeTasks.length})
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold whitespace-nowrap shrink-0">
            Нажмите для настройки
          </span>
        </div>

        {activeTasks.length === 0 ? (
          totalScheduledToday === 0 ? (
            <div className="glass-panel p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full btn-volumetric-glass flex items-center justify-center mx-auto text-amber-500">
                <Sun className="w-6 h-6" />
              </div>
              <p className="text-base font-black text-slate-800">
                День отдыха
              </p>
              <p className="text-xs text-slate-600 max-w-xs mx-auto font-medium">
                {isSunday
                  ? 'В воскресенье большинство действий исключены расписанием.'
                  : 'На этот день нет запланированных действий.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  haptic.medium();
                  onAddNewTask();
                }}
                className="btn-volumetric-cyan px-5 py-2 text-xs font-black inline-flex items-center gap-1.5 rounded-full text-white cursor-pointer"
              >
                + Добавить действие
              </button>
            </div>
          ) : (
            <CelebrationCard
              streakDays={streakDays}
              totalTasks={totalScheduledToday}
              dateStr={selectedDateStr}
              variantIndex={currentDayLog?.animationIndex}
            />
          )
        ) : (
          <div data-task-list className="flex flex-col">
            {activeTasks.map((task) => {
              const isChecking = completingTaskIds.includes(task.id);
              const isDragging = draggingTaskId === task.id;
              const isDropTargetBefore = dropTarget?.taskId === task.id && dropTarget?.position === 'before';
              const isDropTargetAfter = dropTarget?.taskId === task.id && dropTarget?.position === 'after';
              const cardClass = isSaturday ? 'task-card-saturday' : 'task-card';

              return (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className={`task-row-container ${isChecking ? 'is-completing' : ''}`}
                >
                  {/* Drop indicator above */}
                  {isDropTargetBefore && !isDragging && (
                    <div className="py-1 px-1 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150 select-none">
                      <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/90 border border-orange-300 px-2 py-0.5 rounded-full shadow-sm">
                        Сюда
                      </span>
                      <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                    </div>
                  )}

                  <div className="task-row-content">
                    <div
                      onClick={() => {
                        if (isChecking || isDragging) return;
                        haptic.light();
                        onEditTask(task);
                      }}
                      className={`${cardClass} flex items-center justify-between gap-2.5 sm:gap-3.5 cursor-pointer active:scale-[0.99] select-none transition-all ${
                        isDragging
                          ? 'opacity-60 scale-[0.98] ring-2 ring-orange-400 shadow-xl border-orange-300'
                          : ''
                      }`}
                      title="Нажмите на карточку для настройки действия"
                    >
                      {/* Left: Drag Grip Handle + Icon + Info */}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {/* Drag Handle (Active only when > 1 task) */}
                        {activeTasks.length > 1 && (
                          <div
                            onPointerDown={(e) => handlePointerDown(e, task.id)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            className="drag-handle touch-none select-none cursor-grab active:cursor-grabbing p-1.5 -ml-1 text-stone-400 hover:text-orange-500 active:text-orange-600 rounded-xl transition-colors flex items-center justify-center shrink-0 active:scale-95"
                            title="Потяните для изменения порядка (применится ко всем дням)"
                            aria-label="Перетащить действие"
                          >
                            <GripVertical className="w-4 h-4 stroke-[2.2]" />
                          </div>
                        )}

                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/70 border border-white/80 shadow-[0_4px_12px_rgba(15,118,110,0.06),inset_0_1px_1px_#ffffff] flex items-center justify-center shrink-0">
                          {getTaskIcon(task)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-black text-slate-800 truncate tracking-tight">
                            {task.title}
                          </h4>
                          {task.category && (
                            <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5">
                              {/* Category dot using task.color */}
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: task.color || '#14b8a6' }}
                              />
                              <span className="text-[10px] font-extrabold text-teal-900 bg-teal-500/15 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                                {task.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Complete button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isChecking || isDragging}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isChecking || isDragging) return;
                            handleCheckTask(task);
                          }}
                          className={`btn-volumetric-cyan px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center gap-1.5 text-xs font-extrabold shadow-md tracking-tight active:scale-95 transition-all duration-200 select-none min-w-[96px] sm:min-w-[114px] ${
                            isChecking
                              ? 'bg-emerald-500 text-white shadow-inner scale-95 pointer-events-none'
                              : ''
                          }`}
                          title="Выполнить (убрать в корзину дня)"
                        >
                          <Check
                            className={`w-3.5 h-3.5 stroke-[3] text-white transition-transform duration-200 ${
                              isChecking ? 'scale-125' : ''
                            }`}
                          />
                          <span className="text-white font-black">
                            {isChecking ? 'Готово!' : 'Выполнить'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Drop indicator below */}
                  {isDropTargetAfter && !isDragging && (
                    <div className="py-1 px-1 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150 select-none">
                      <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/90 border border-orange-300 px-2 py-0.5 rounded-full shadow-sm">
                        Сюда
                      </span>
                      <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trash Section */}
      <div className="pt-2">
        <div className="glass-panel p-4 sm:p-5 overflow-hidden">
          <button
            onClick={() => {
              haptic.light();
              setIsTrashOpen(!isTrashOpen);
            }}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800">
                    Корзина дня
                  </span>
                  <span className="px-2 py-0.2 text-[10px] font-black rounded-full bg-rose-500/20 text-rose-700 border border-rose-300">
                    {trashedTasks.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Выполненные сегодня
                </p>
              </div>
            </div>

            <span className="text-xs font-black text-teal-800">
              {isTrashOpen ? 'Скрыть' : 'Показать'}
            </span>
          </button>

          {isTrashOpen && (
            <div className="mt-3.5 pt-3.5 border-t border-white/60 space-y-2">
              <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-white/40 border border-white/60 text-[11px] text-slate-600 font-medium">
                <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Действия в корзине снова станут активными завтра.
                </span>
              </div>

              {trashedTasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 font-semibold">
                  Корзина пуста
                </div>
              ) : (
                <div className="space-y-2">
                  {trashedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-2xl bg-white/50 border border-white/70 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 opacity-60"
                          style={{ backgroundColor: task.color || '#3b82f6' }}
                        />
                        <span className="text-xs font-bold text-slate-400 line-through truncate">
                          {task.title}
                        </span>
                        {task.category && (
                          <span className="text-[9px] font-bold text-slate-400 bg-white/60 px-2 py-0.5 rounded-full">
                            {task.category}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleRestoreTask(task)}
                        className="btn-volumetric-glass px-3 py-1.5 text-[11px] font-black text-teal-900 rounded-full flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Вернуть</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING GLASS BOTTOM NAVIGATOR DOCK */}
      <div className="pt-2 flex items-center justify-center">
        <div className="inline-flex items-center gap-3 p-2 rounded-full bg-white/45 backdrop-blur-2xl border border-white/75 shadow-[0_16px_36px_-6px_rgba(15,118,110,0.12),inset_0_1px_1px_#ffffff]">
          {/* Left Arrow Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              handlePrevDay();
            }}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-glass w-11 h-11 rounded-full flex items-center justify-center text-slate-700 outline-none"
            title="Предыдущий день"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
          </button>

          {/* Center Volumetric 3D Dial Knob */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              haptic.light();
              goToToday();
            }}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-cyan px-6 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-xs tracking-tight shadow-md outline-none cursor-pointer"
            title="К сегодняшнему дню"
          >
            <span className="text-white">{isCurrentToday ? 'Сегодня' : 'К дате'}</span>
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              handleNextDay();
            }}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-glass w-11 h-11 rounded-full flex items-center justify-center text-slate-700 outline-none"
            title="Следующий день"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.8]" />
          </button>
        </div>
      </div>
    </div>
  );
};
