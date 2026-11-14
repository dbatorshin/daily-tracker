import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sun, CheckCircle } from 'lucide-react';
import { useRoutines } from '../context/RoutineContext';
import type { DayOfWeek } from '../types';
import { haptic } from '../utils/haptics';

export const MonthView: React.FC = () => {
  const { selectedDate, setSelectedDate, setViewMode, appData } = useRoutines();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => {
    haptic.light();
    setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    haptic.light();
    setSelectedDate(addMonths(selectedDate, 1));
  };

  let fullyCompletedDays = 0;
  let totalScheduledInMonth = 0;
  let totalCompletedInMonth = 0;

  calendarDays.forEach((day) => {
    if (isSameMonth(day, selectedDate)) {
      const dayOfWeek = day.getDay() as DayOfWeek;
      const dateStr = format(day, 'yyyy-MM-dd');
      const scheduled = appData.tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
      const log = appData.history[dateStr];
      const completed = log ? log.completedTaskIds.filter(id => scheduled.some(t => t.id === id)).length : 0;

      totalScheduledInMonth += scheduled.length;
      totalCompletedInMonth += completed;

      if (scheduled.length > 0 && completed === scheduled.length) {
        fullyCompletedDays++;
      }
    }
  });

  const monthRate =
    totalScheduledInMonth > 0 ? Math.round((totalCompletedInMonth / totalScheduledInMonth) * 100) : 0;

  const weekHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-0">
      {/* Month Navigator Header */}
      <div className="glass-panel p-5 flex items-center justify-between">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            handlePrevMonth();
          }}
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          className="btn-volumetric-glass w-10 h-10 rounded-full flex items-center justify-center text-slate-700 outline-none"
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center">
          <h2 className="text-base sm:text-lg font-black text-slate-800 capitalize tracking-tight">
            {format(selectedDate, 'LLLL yyyy', { locale: ru })}
          </h2>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            {fullyCompletedDays} идеальных дней • {monthRate}% выполнено
          </p>
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            handleNextMonth();
          }}
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          className="btn-volumetric-glass w-10 h-10 rounded-full flex items-center justify-center text-slate-700 outline-none"
          title="Следующий месяц"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Month Stats Summary (Frosted Glass Badges) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 text-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Всего действий</span>
          <p className="text-lg font-black text-slate-800 mt-0.5">{totalCompletedInMonth}</p>
        </div>
        <div className="glass-panel p-3.5 text-center">
          <span className="text-[10px] text-amber-900 uppercase font-bold tracking-wider">Идеальных дней</span>
          <p className="text-lg font-black text-amber-600 mt-0.5">{fullyCompletedDays}</p>
        </div>
        <div className="glass-panel p-3.5 text-center">
          <span className="text-[10px] text-orange-900 uppercase font-bold tracking-wider">Успеваемость</span>
          <p className="text-lg font-black text-orange-600 mt-0.5">{monthRate}%</p>
        </div>
        <div className="glass-panel p-3.5 text-center">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Запланировано</span>
          <p className="text-lg font-black text-slate-800 mt-0.5">{totalScheduledInMonth}</p>
        </div>
      </div>

      {/* Calendar Grid in Glass Panel */}
      <div className="glass-panel p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-2 mb-2.5 text-center">
          {weekHeaders.map((day, idx) => (
            <div
              key={day}
              className={`text-xs font-black py-1 ${
                idx === 6 ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const isCurrMonth = isSameMonth(day, selectedDate);
            const isCurrDay = isToday(day);
            const isSelected = isSameDay(day, selectedDate);
            const dayOfWeek = day.getDay() as DayOfWeek;
            const isSun = dayOfWeek === 0;

            const dateStr = format(day, 'yyyy-MM-dd');
            const scheduled = appData.tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
            const log = appData.history[dateStr];
            const completed = log ? log.completedTaskIds.filter(id => scheduled.some(t => t.id === id)).length : 0;
            const total = scheduled.length;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isPerfect = total > 0 && completed === total;

            return (
              <button
                key={dateStr}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  haptic.light();
                  setSelectedDate(day);
                  setViewMode('day');
                }}
                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                className={`relative flex flex-col items-center justify-between min-h-[68px] sm:min-h-[82px] p-2 rounded-2xl transition outline-none focus:outline-none ${
                  !isCurrMonth
                    ? 'opacity-25 bg-transparent'
                    : isSelected
                    ? 'bg-white/95 border-2 border-orange-500 shadow-md font-bold'
                    : 'bg-white/60 border border-orange-100 shadow-[0_4px_12px_rgba(180,100,40,0.04)] hover:bg-white/80'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      isCurrDay
                        ? 'text-orange-600 font-black'
                        : isSun
                        ? 'text-amber-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {isSun && isCurrMonth && (
                    <span title="Воскресенье">
                      <Sun className="w-3 h-3 text-amber-500" />
                    </span>
                  )}
                </div>

                {isCurrMonth && total > 0 && (
                  <div className="w-full mt-auto pt-1">
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold mb-0.5">
                      <span>{completed}/{total}</span>
                      {isPerfect && (
                        <CheckCircle className="w-3 h-3 text-orange-600" />
                      )}
                    </div>
                    <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isPerfect
                            ? 'bg-orange-600'
                            : rate > 50
                            ? 'bg-orange-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )}

                {isCurrMonth && total === 0 && (
                  <div className="w-full mt-auto pt-1 text-[9px] text-slate-400 font-semibold text-center">
                    отдых
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
