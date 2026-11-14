import React, { useMemo } from 'react';
import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getYear,
  addYears,
  subYears,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Flame, Trophy, CheckCircle2, BarChart3, Info } from 'lucide-react';
import { useRoutines } from '../context/RoutineContext';
import type { DayOfWeek } from '../types';
import { haptic } from '../utils/haptics';

export const YearView: React.FC = () => {
  const { selectedDate, setSelectedDate, setViewMode, appData } = useRoutines();

  const currentYear = getYear(selectedDate);
  const yearStart = startOfYear(selectedDate);
  const yearEnd = endOfYear(selectedDate);

  const daysInYear = useMemo(() => {
    return eachDayOfInterval({ start: yearStart, end: yearEnd });
  }, [yearStart, yearEnd]);

  const handlePrevYear = () => {
    haptic.light();
    setSelectedDate(subYears(selectedDate, 1));
  };

  const handleNextYear = () => {
    haptic.light();
    setSelectedDate(addYears(selectedDate, 1));
  };

  const {
    totalYearCompleted,
    totalYearScheduled,
    perfectDaysCount,
    currentStreak,
    maxStreak,
  } = useMemo(() => {
    let completedSum = 0;
    let scheduledSum = 0;
    let perfectDays = 0;

    let bestStreak = 0;
    let tempStreak = 0;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    daysInYear.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = day.getDay() as DayOfWeek;
      const scheduled = appData.tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
      const log = appData.history[dateStr];
      const completed = log ? log.completedTaskIds.filter((id) => scheduled.some((t) => t.id === id)).length : 0;

      if (dateStr <= todayStr) {
        completedSum += completed;
        scheduledSum += scheduled.length;

        if (scheduled.length > 0 && completed === scheduled.length) {
          perfectDays++;
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else if (scheduled.length > 0 && completed > 0) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else if (scheduled.length > 0 && completed === 0) {
          tempStreak = 0;
        }
      }
    });

    return {
      totalYearCompleted: completedSum,
      totalYearScheduled: scheduledSum,
      perfectDaysCount: perfectDays,
      currentStreak: tempStreak,
      maxStreak: bestStreak,
    };
  }, [daysInYear, appData]);

  const yearRate =
    totalYearScheduled > 0 ? Math.round((totalYearCompleted / totalYearScheduled) * 100) : 0;

  // 12 Months structured for proportional calendar micro-grids
  const monthsData = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(currentYear, monthIndex, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      // First day of week index: 0 = Mon, 1 = Tue, ..., 6 = Sun
      const firstDayOfWeek = (monthStart.getDay() + 6) % 7;

      let monthScheduled = 0;
      let monthCompleted = 0;

      const days = daysInMonth.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay() as DayOfWeek;
        const scheduled = appData.tasks.filter((t) => t.daysOfWeek.includes(dayOfWeek));
        const log = appData.history[dateStr];
        const completed = log
          ? log.completedTaskIds.filter((id) => scheduled.some((t) => t.id === id)).length
          : 0;
        const total = scheduled.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (dateStr <= todayStr) {
          monthScheduled += total;
          monthCompleted += completed;
        }

        return {
          date: day,
          dateStr,
          dayNum: day.getDate(),
          dayOfWeek,
          rate,
          completed,
          total,
          isToday: isToday(day),
          isFuture: dateStr > todayStr,
        };
      });

      const monthRate =
        monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : null;

      const monthName = format(monthDate, 'LLLL', { locale: ru });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      return {
        monthIndex,
        capitalizedMonth,
        monthStart,
        firstDayOfWeek,
        days,
        monthScheduled,
        monthCompleted,
        monthRate,
      };
    });
  }, [currentYear, appData]);

  const handleSelectDay = (date: Date) => {
    haptic.light();
    setSelectedDate(date);
    setViewMode('day');
  };

  const weekdaysShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-0">
      {/* Year Navigator */}
      <div className="glass-panel p-4 sm:p-5 flex items-center justify-between">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            handlePrevYear();
          }}
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          className="btn-volumetric-glass w-10 h-10 rounded-full flex items-center justify-center text-slate-700 outline-none"
          title="Предыдущий год"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center">
          <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
            Календарь за {currentYear} год
          </h2>
          <p className="text-xs text-slate-600 font-bold mt-0.5">
            Продуктивность: <span className="text-orange-600 font-extrabold">{yearRate}%</span> • Выполнено: {totalYearCompleted}
          </p>
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            (e.currentTarget as HTMLButtonElement).blur();
            handleNextYear();
          }}
          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          className="btn-volumetric-glass w-10 h-10 rounded-full flex items-center justify-center text-slate-700 outline-none"
          title="Следующий год"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Stats Cards – Spacious, no text cutoff */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current streak */}
        <div className="glass-panel p-3.5 sm:p-4 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{ background: 'rgba(251,146,60,0.18)', border: '1.5px solid rgba(251,146,60,0.35)' }}
          >
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-tight block">
              Серия дней
            </span>
            <p className="text-lg sm:text-xl font-black text-amber-600 leading-tight">
              {currentStreak}
            </p>
          </div>
        </div>

        {/* Best streak */}
        <div className="glass-panel p-3.5 sm:p-4 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.32)' }}
          >
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-tight block">
              Рекорд
            </span>
            <p className="text-lg sm:text-xl font-black text-amber-700 leading-tight">
              {maxStreak}
            </p>
          </div>
        </div>

        {/* Perfect days */}
        <div className="glass-panel p-3.5 sm:p-4 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{ background: 'rgba(20,184,166,0.15)', border: '1.5px solid rgba(20,184,166,0.30)' }}
          >
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-tight block">
              Идеальных
            </span>
            <p className="text-lg sm:text-xl font-black text-teal-600 leading-tight">
              {perfectDaysCount}
            </p>
          </div>
        </div>

        {/* Total actions */}
        <div className="glass-panel p-3.5 sm:p-4 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{ background: 'rgba(147,51,234,0.12)', border: '1.5px solid rgba(147,51,234,0.25)' }}
          >
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-tight block">
              Действий
            </span>
            <p className="text-lg sm:text-xl font-black text-purple-600 leading-tight">
              {totalYearCompleted}
            </p>
          </div>
        </div>
      </div>

      {/* 12-Month Calendar Grid — Spacious 3 or 4 columns with square aspect tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {monthsData.map((month) => {
          return (
            <div
              key={month.monthIndex}
              className="glass-panel p-4 flex flex-col justify-between transition-shadow hover:shadow-md"
            >
              {/* Month Header */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#e9e0d4]">
                <span className="text-sm font-black text-slate-800 tracking-tight">
                  {month.capitalizedMonth}
                </span>
                {month.monthRate !== null ? (
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      month.monthRate === 100
                        ? 'bg-orange-500 text-white shadow-xs'
                        : month.monthRate > 0
                        ? 'bg-orange-100 text-orange-900 border border-orange-200'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {month.monthRate}%
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">—</span>
                )}
              </div>

              {/* Weekday headers: Пн Вт Ср Чт Пт Сб Вс */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {weekdaysShort.map((w, idx) => (
                  <span
                    key={w}
                    className={`text-[10px] font-black ${
                      idx === 6
                        ? 'text-amber-600'
                        : idx === 5
                        ? 'text-orange-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Days grid with proportional square tiles */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty spacer cells before month start */}
                {Array.from({ length: month.firstDayOfWeek }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square w-full" />
                ))}

                {/* Days */}
                {month.days.map((day) => {
                  const isSel = isSameDay(day.date, selectedDate);

                  // Style based on completion
                  let bgStyle: React.CSSProperties = {
                    backgroundColor: '#f8f4ed',
                    color: '#94a3b8',
                    border: '1px solid #ece4d8',
                  };

                  if (day.total === 0) {
                    // Day off (Sunday / no tasks)
                    bgStyle = {
                      backgroundColor: '#fbf7ee',
                      color: '#b45309',
                      border: '1px solid #f3ebd8',
                    };
                  } else if (day.rate === 100) {
                    // 100% completed: warm orange 3D tile
                    bgStyle = {
                      backgroundImage: 'linear-gradient(180deg, #fba754 0%, #f97316 60%, #ea580c 100%)',
                      color: '#ffffff',
                      border: '1px solid #ea580c',
                      boxShadow: '0 2px 5px rgba(234, 88, 12, 0.3)',
                    };
                  } else if (day.rate > 0) {
                    // Partial
                    bgStyle = {
                      backgroundColor: '#ffedd5',
                      color: '#9a3412',
                      border: '1px solid #fed7aa',
                    };
                  } else if (!day.isFuture) {
                    // Past/today uncompleted
                    bgStyle = {
                      backgroundColor: '#e8e2d8',
                      color: '#475569',
                      border: '1px solid #d9d2c5',
                    };
                  }

                  let tileShadow = bgStyle.boxShadow || 'none';
                  if (day.isToday) {
                    tileShadow = '0 0 0 1.5px #ffffff, 0 0 0 3px #f97316';
                  }

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        (e.currentTarget as HTMLButtonElement).blur();
                        handleSelectDay(day.date);
                      }}
                      style={{
                        ...bgStyle,
                        boxShadow: tileShadow,
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        borderColor: isSel ? '#ea580c' : undefined,
                        borderWidth: isSel ? '2px' : '1px',
                      }}
                      className={`aspect-square w-full rounded-lg text-[11px] font-extrabold flex items-center justify-center transition-transform hover:scale-110 active:scale-95 outline-none focus:outline-none select-none ${
                        day.isToday ? 'font-black' : ''
                      }`}
                      title={`${day.dateStr}: ${day.completed}/${day.total} (${day.rate}%)`}
                    >
                      {day.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Card */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 font-semibold">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-orange-600 shrink-0" />
          <span>Нажмите на любой день, чтобы открыть его список действий</span>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded block shadow-xs"
              style={{
                backgroundImage: 'linear-gradient(180deg, #fba754 0%, #f97316 60%, #ea580c 100%)',
                border: '1px solid #ea580c',
              }}
            />
            <span className="text-[11px] font-bold text-slate-800">100% выполнено</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded block"
              style={{ backgroundColor: '#ffedd5', border: '1px solid #fed7aa' }}
            />
            <span className="text-[11px] font-bold text-slate-800">Частично</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded block"
              style={{ backgroundColor: '#e8e2d8', border: '1px solid #d9d2c5' }}
            />
            <span className="text-[11px] font-bold text-slate-800">Не выполнено</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded block"
              style={{ backgroundColor: '#fbf7ee', border: '1px solid #f3ebd8' }}
            />
            <span className="text-[11px] font-bold text-slate-800">День отдыха</span>
          </div>
        </div>
      </div>
    </div>
  );
};
