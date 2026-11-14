import React from 'react';
import { Calendar as CalendarIcon, CalendarDays, CalendarRange, Clock } from 'lucide-react';
import type { ViewMode } from '../types';
import { useRoutines } from '../context/RoutineContext';
import { haptic } from '../utils/haptics';

export const Navigation: React.FC = () => {
  const { viewMode, setViewMode } = useRoutines();

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'day', label: 'День', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'week', label: 'Неделя', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'month', label: 'Месяц', icon: <CalendarIcon className="w-3.5 h-3.5" /> },
    { id: 'year', label: 'Год', icon: <CalendarRange className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex justify-center px-2">
      {/* 3D Warm Pill Segmented Control */}
      <nav className="inline-flex p-1.5 bg-[#f5ede2] border border-[#e6d9ca] rounded-full shadow-[0_6px_20px_-4px_rgba(160,110,75,0.12),inset_0_1px_1px_rgba(255,255,255,0.7)] max-w-md w-full select-none">
        {tabs.map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                if (!isActive) haptic.light();
                setViewMode(tab.id);
              }}
              style={{
                outline: 'none',
                border: 'none',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-full transition-all duration-150 select-none cursor-pointer ${
                isActive ? 'nav-pill-active' : 'nav-pill-inactive'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
};
