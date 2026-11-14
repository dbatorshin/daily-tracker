import React, { useEffect, useRef } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  isToday,
  isSaturday,
  isSameDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sun, ArrowRight } from 'lucide-react';
import { useRoutines } from '../context/RoutineContext';
import type { DayOfWeek } from '../types';
import { haptic } from '../utils/haptics';

export const WeekView: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    setViewMode,
    appData,
    moveToTrash,
    restoreFromTrash,
  } = useRoutines();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef<HTMLDivElement>(null);

  // Point 5: Auto-center week view on the active / today day
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeDayRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const element = activeDayRef.current;
        const containerWidth = container.clientWidth;
        const elementOffsetLeft = element.offsetLeft;
        const elementWidth = element.clientWidth;
        const targetScrollLeft = elementOffsetLeft - containerWidth / 2 + elementWidth / 2;

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate, weekStart]);

  const handlePrevWeek = () => {
    haptic.light();
    setSelectedDate(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    haptic.light();
    setSelectedDate(addWeeks(selectedDate, 1));
  };

  let totalWeekScheduled = 0;
  let totalWeekCompleted = 0;

  daysInWeek.forEach((day) => {
    const dayOfWeek = day.getDay() as DayOfWeek;
    const dateStr = format(day, 'yyyy-MM-dd');
    const scheduled = appData.tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
    const log = appData.history[dateStr];
    const completed = log ? log.completedTaskIds.filter(id => scheduled.some(t => t.id === id)).length : 0;

    totalWeekScheduled += scheduled.length;
    totalWeekCompleted += completed;
  });

  const weekCompletionRate =
    totalWeekScheduled > 0 ? Math.round((totalWeekCompleted / totalWeekScheduled) * 100) : 0;

  return (
    <div className="max-w-full mx-auto pb-0 space-y-4">
      {/* Week Navigation Header */}
      <div className="glass-panel p-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            handlePrevWeek();
          }}
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          className="btn-volumetric-glass w-10 h-10 rounded-full flex items-center justify-center text-slate-700 shrink-0 outline-none"
          title="Предыдущая неделя"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center min-w-0">
          <h2 className="text-base sm:text-lg font-black text-slate-800 capitalize tracking-tight leading-tight">
            {format(weekStart, 'd MMMM', { locale: ru })} —{' '}
            {format(weekEnd, 'd MMMM yyyy', { locale: ru })}
          </h2>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            {totalWeekCompleted} из {totalWeekScheduled} выполнено · {weekCompletionRate}%
          </p>
          {/* Week progress bar */}
          <div className="mt-2 w-full bg-orange-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${weekCompletionRate}%`, background: '#f97316' }}
            />
          </div>
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            handleNextWeek();
          }}
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          className="btn-volumetric-glass w-10 h-10 rounded-full flex items-center justify-center text-slate-700 shrink-0 outline-none"
          title="Следующая неделя"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* 7-Day Horizontal Columns */}
      <div className="overflow-x-auto pb-2 scroll-smooth" ref={scrollContainerRef}>
        <div
          className="flex gap-2.5"
          style={{ minWidth: '700px' }}
        >
          {daysInWeek.map((day) => {
            const dayOfWeek = day.getDay() as DayOfWeek;
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSun = dayOfWeek === 0;
            const isSat = isSaturday(day);
            const isCurrentDay = isToday(day);
            const isTargetDay = isCurrentDay || isSameDay(day, selectedDate);

            const scheduled = appData.tasks
              .filter((t) => t.daysOfWeek.includes(dayOfWeek))
              .sort((a, b) => a.order - b.order);

            const log = appData.history[dateStr] || { completedTaskIds: [], completedAt: {} };
            const completedCount = scheduled.filter((t) =>
              log.completedTaskIds.includes(t.id)
            ).length;
            const totalCount = scheduled.length;
            const dayRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            // Soft 3D clay styling for day column
            let colBg = '#ffffff';
            let colBorder = '#f3e9dc';
            if (isCurrentDay) {
              colBg = '#fffdfa';
              colBorder = '#fdba74';
            } else if (isSat) {
              colBg = '#fff7ed';
              colBorder = '#fed7aa';
            } else if (isSun) {
              colBg = '#fefce8';
              colBorder = '#fef08a';
            }

            return (
              <div
                key={dateStr}
                ref={isTargetDay ? activeDayRef : undefined}
                className={`flex flex-col flex-1 transition-all duration-200 ${
                  isCurrentDay ? 'shadow-[0_8px_24px_rgba(249,115,22,0.25)]' : 'shadow-[0_4px_12px_rgba(175,120,80,0.06)]'
                }`}
                style={{
                  background: colBg,
                  borderRadius: '18px',
                  border: `1.5px solid ${colBorder}`,
                  padding: '12px 8px',
                  minWidth: '95px',
                }}
              >
                {/* Day Header */}
                <div className="flex flex-col items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider leading-none mb-1">
                    {format(day, 'EEEEEE', { locale: ru })}
                  </span>
                  <span
                    className="text-sm font-black leading-none flex items-center justify-center"
                    style={
                      isCurrentDay
                        ? {
                            background: '#f97316',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                          }
                        : { color: '#1e293b' }
                    }
                  >
                    {format(day, 'd')}
                  </span>
                  {isSun && (
                    <span className="text-[9px] text-amber-700 font-bold flex items-center gap-0.5 mt-1">
                      <Sun className="w-2.5 h-2.5" /> Выходной
                    </span>
                  )}
                </div>

                {/* Task List */}
                <div className="flex-1 space-y-0.5" style={{ minHeight: '110px' }}>
                  {isSun ? (
                    <div className="h-full flex items-center justify-center text-center p-1 text-[10px] text-amber-700 font-bold opacity-70">
                      Выходной
                    </div>
                  ) : scheduled.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-1 text-[10px] text-slate-400 font-semibold">
                      Нет задач
                    </div>
                  ) : (
                    scheduled.map((task) => {
                      const isDone = log.completedTaskIds.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            haptic.light();
                            if (isDone) {
                              restoreFromTrash(task.id, day);
                            } else {
                              moveToTrash(task.id, day);
                            }
                          }}
                          title={isDone ? 'Вернуть' : 'Выполнить'}
                          className="flex items-center gap-1.5 py-1 px-1 rounded-lg cursor-pointer transition-colors duration-150"
                          style={{
                            opacity: isDone ? 0.45 : 1,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,237,213,0.6)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                          }}
                        >
                          {/* Color dot */}
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: task.color || '#f97316' }}
                          />
                          {/* Task title */}
                          <span
                            className="truncate flex-1 text-xs font-semibold"
                            style={{
                              color: isDone ? '#94a3b8' : '#334155',
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Mini Progress Bar */}
                <div
                  className="w-full rounded-full overflow-hidden mt-2"
                  style={{ height: '4px', background: 'rgba(255,220,185,0.5)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${dayRate}%`, background: '#f97316' }}
                  />
                </div>

                {/* Open Day Button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    (e.currentTarget as HTMLButtonElement).blur();
                    haptic.light();
                    setSelectedDate(day);
                    setViewMode('day');
                  }}
                  style={{ color: '#ea580c', outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="mt-2 w-full flex items-center justify-center gap-0.5 text-xs font-bold transition-colors duration-150 outline-none"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#9a3412';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#ea580c';
                  }}
                >
                  <span>Открыть</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
