import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Plus, Minus, Check } from 'lucide-react';
import type { DayOfWeek, TaskTemplate } from '../types';
import { useRoutines } from '../context/RoutineContext';
import { haptic } from '../utils/haptics';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskTemplate | null;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'order'>) => void;
  onDeletePermanently?: (id: string) => void;
}

// 10 distinct color markers
const COLOR_PRESETS = [
  { label: 'Синий', value: '#2563eb' },
  { label: 'Зеленый', value: '#10b981' },
  { label: 'Коралловый', value: '#f87171' },
  { label: 'Фиолетовый', value: '#a855f7' },
  { label: 'Янтарный', value: '#f59e0b' },
  { label: 'Розовый', value: '#ec4899' },
  { label: 'Индиго', value: '#6366f1' },
  { label: 'Бирюзовый', value: '#06b6d4' },
  { label: 'Оранжевый', value: '#f97316' },
  { label: 'Лаймовый', value: '#84cc16' },
];

const DAYS: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 1, label: 'Понедельник', short: 'Пн' },
  { id: 2, label: 'Вторник', short: 'Вт' },
  { id: 3, label: 'Среда', short: 'Ср' },
  { id: 4, label: 'Четверг', short: 'Чт' },
  { id: 5, label: 'Пятница', short: 'Пт' },
  { id: 6, label: 'Суббота', short: 'Сб' },
  { id: 0, label: 'Воскресенье', short: 'Вс' },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSave,
  onDeletePermanently,
}) => {
  const { categories, addCategory, deleteCategory } = useRoutines();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Здоровье');
  const [color, setColor] = useState('#2563eb');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([1, 2, 3, 4, 5, 6]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const newCatInputRef = useRef<HTMLInputElement>(null);

  // Esc key listener to close modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setCategory(taskToEdit.category || 'Здоровье');
      setColor(taskToEdit.color || '#2563eb');
      setDaysOfWeek(taskToEdit.daysOfWeek || [1, 2, 3, 4, 5, 6]);
      setConfirmDelete(false);
      setConfirmDeleteCat(false);
    } else {
      setTitle('');
      setCategory('Здоровье');
      setColor('#2563eb');
      setDaysOfWeek([1, 2, 3, 4, 5, 6]);
      setConfirmDelete(false);
      setConfirmDeleteCat(false);
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: DayOfWeek) => {
    haptic.light();
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length === 1) return;
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const setPreset = (preset: 'all' | 'weekdays' | 'weekend') => {
    haptic.light();
    switch (preset) {
      case 'all':
        setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
        break;
      case 'weekdays':
        setDaysOfWeek([1, 2, 3, 4, 5]);
        break;
      case 'weekend':
        setDaysOfWeek([0, 6]);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    haptic.success();
    onSave({
      title: title.trim(),
      description: undefined,
      category: category.trim() || undefined,
      color,
      daysOfWeek,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!taskToEdit || !onDeletePermanently) return;
    if (!confirmDelete) {
      haptic.medium();
      setConfirmDelete(true);
      return;
    }
    haptic.celebrate();
    onDeletePermanently(taskToEdit.id);
    onClose();
  };

  const handleDeleteActiveCategory = () => {
    if (!category) return;
    if (!confirmDeleteCat) {
      haptic.medium();
      setConfirmDeleteCat(true);
      return;
    }
    haptic.celebrate();
    deleteCategory(category);
    setCategory('');
    setConfirmDeleteCat(false);
  };

  const handleAddCategory = () => {
    const val = newCategoryInput.trim();
    if (!val) return;
    haptic.success();
    addCategory(val);
    setCategory(val);
    setNewCategoryInput('');
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
        {/* Header - Fixed top */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-orange-100 shrink-0">
          <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
            {taskToEdit ? 'Настройка действия' : 'Новое действие'}
          </h3>
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

        {/* Form Body - Scrollable middle with sticky footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            {/* Title */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Название действия *
              </label>
              <input
                type="text"
                required
                placeholder="Например: Зарядка, English, Чтение"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ outline: 'none' }}
                className="w-full px-4 py-2.5 text-sm font-bold text-slate-800 rounded-2xl bg-white border border-stone-200 shadow-inner focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Category selection and management */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Категория
              </label>

              {/* Created categories (NO crosses! Clean 3D pills) */}
              <div className="flex gap-1.5 flex-wrap mb-2.5 select-none">
                {categories.map((cat) => {
                  const isActive = category === cat;
                  return (
                    <div
                      key={cat}
                      role="button"
                      tabIndex={-1}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => {
                        haptic.light();
                        setConfirmDeleteCat(false);
                        // Clicking an active category toggles it off (leaves task without category)
                        setCategory(category === cat ? '' : cat);
                      }}
                      style={{
                        outline: 'none',
                        border: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none',
                      }}
                      className={isActive ? 'category-chip-active' : 'category-chip-inactive'}
                    >
                      {cat}
                    </div>
                  );
                })}
              </div>

              {/* Category creation / deletion toolbar UNDER created categories */}
              <div className="flex items-center gap-2 pt-0.5">
                {/* Left: - button to delete active category with confirmation */}
                {confirmDeleteCat && category ? (
                  <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in">
                    <button
                      type="button"
                      onClick={handleDeleteActiveCategory}
                      style={{ outline: 'none' }}
                      className="px-2.5 py-1 text-[11px] font-black rounded-full bg-rose-600 text-white flex items-center gap-1 shadow hover:bg-rose-700 outline-none"
                      title={`Подтвердить удаление категории «${category}»`}
                    >
                      <Trash2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Удалить «{category}»</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCat(false)}
                      style={{ outline: 'none' }}
                      className="btn-volumetric-glass w-7 h-7 rounded-full flex items-center justify-center text-slate-500 outline-none"
                      title="Отмена"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteActiveCategory}
                    disabled={!category}
                    style={{ outline: 'none' }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                      category
                        ? 'btn-volumetric-glass text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                        : 'bg-stone-100 border border-stone-200 text-stone-300 cursor-not-allowed opacity-50'
                    }`}
                    title={category ? `Удалить категорию «${category}»` : 'Выберите категорию для удаления'}
                  >
                    <Minus className="w-4 h-4 stroke-[2.8]" />
                  </button>
                )}

                {/* Input for new category */}
                <input
                  ref={newCatInputRef}
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Новая категория…"
                  style={{ outline: 'none' }}
                  className="flex-1 px-3.5 py-1.5 text-xs font-bold text-slate-800 rounded-full bg-white border border-stone-200 shadow-inner focus:outline-none focus:border-orange-500"
                />

                {/* Right: + button to create category */}
                <button
                  type="button"
                  onClick={handleAddCategory}
                  style={{ outline: 'none' }}
                  className="btn-volumetric-glass w-8 h-8 rounded-full flex items-center justify-center text-slate-700 shrink-0 outline-none hover:text-orange-600 cursor-pointer"
                  title="Создать категорию"
                >
                  <Plus className="w-4 h-4 stroke-[2.8]" />
                </button>
              </div>
            </div>

            {/* 10 Color Markers - No ring rectangular artifacts */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Цветовой 3D-маркер (10 вариантов)
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {COLOR_PRESETS.map((c) => {
                  const isSelected = color === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        haptic.light();
                        setColor(c.value);
                      }}
                      style={{
                        backgroundColor: c.value,
                        outline: 'none',
                        boxShadow: isSelected
                          ? '0 0 0 2px #ffffff, 0 0 0 4.5px #f97316'
                          : '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                      className={`w-7 h-7 rounded-full transition-transform outline-none focus:outline-none ${
                        isSelected ? 'scale-110' : 'opacity-85 hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  );
                })}
              </div>
            </div>

            {/* Days of Week Selector */}
            <div className="pt-2 border-t border-orange-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Дни повторения
                </label>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {daysOfWeek.length === 7
                    ? '📅 Все 7 дней'
                    : `Выбрано ${daysOfWeek.length} из 7`}
                </span>
              </div>

              {/* Quick Presets - Clean 3 columns, no hyphen breaking */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setPreset('all')}
                  style={{ outline: 'none' }}
                  className={`py-2 px-1 text-[11px] sm:text-xs rounded-xl font-black border-2 text-center transition outline-none focus:outline-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
                    daysOfWeek.length === 7
                      ? 'btn-volumetric-cyan text-white shadow-sm border-orange-600'
                      : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>📅 Все дни</span>
                  <span className="whitespace-nowrap text-[10px] sm:text-[11px] opacity-90">(7 дней)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('weekdays')}
                  style={{ outline: 'none' }}
                  className={`py-2 px-1 text-[11px] sm:text-xs rounded-xl font-black border-2 text-center transition outline-none focus:outline-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
                    daysOfWeek.length === 5 && !daysOfWeek.includes(0) && !daysOfWeek.includes(6)
                      ? 'btn-volumetric-cyan text-white shadow-sm border-orange-600'
                      : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>💼 Будни</span>
                  <span className="whitespace-nowrap text-[10px] sm:text-[11px] opacity-90">(Пн&#8209;Пт)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('weekend')}
                  style={{ outline: 'none' }}
                  className={`py-2 px-1 text-[11px] sm:text-xs rounded-xl font-black border-2 text-center transition outline-none focus:outline-none flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
                    daysOfWeek.length === 2 && daysOfWeek.includes(0) && daysOfWeek.includes(6)
                      ? 'btn-volumetric-cyan text-white shadow-sm border-orange-600'
                      : 'bg-white text-slate-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>☕ Выходные</span>
                  <span className="whitespace-nowrap text-[10px] sm:text-[11px] opacity-90">(Сб&#8209;Вс)</span>
                </button>
              </div>

              {/* Unambiguous Day Toggle Cards */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {DAYS.map((d) => {
                  const active = daysOfWeek.includes(d.id);
                  const isSun = d.id === 0;

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      style={{ outline: 'none' }}
                      className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all select-none outline-none focus:outline-none ${
                        active
                          ? isSun
                            ? 'bg-rose-500 text-white border-2 border-rose-600 shadow-sm'
                            : 'bg-orange-500 text-white border-2 border-orange-600 shadow-sm'
                          : 'bg-stone-100 text-slate-400 border border-stone-200 hover:bg-stone-200/60 opacity-60'
                      }`}
                      title={`${d.label}: ${active ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}`}
                    >
                      <div className="w-4 h-4 rounded-full flex items-center justify-center mb-0.5 bg-white/20">
                        {active ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <X className="w-2.5 h-2.5 stroke-[2.5] text-slate-400" />
                        )}
                      </div>
                      <span className="text-[11px] font-black leading-tight">{d.short}</span>
                      <span
                        className={`text-[8px] font-extrabold tracking-tight ${
                          active ? 'opacity-90' : 'opacity-70'
                        }`}
                      >
                        {active ? 'ВКЛ' : 'ВЫКЛ'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed sticky footer, ALWAYS visible on iPhone */}
          <div className="p-3.5 sm:p-4 border-t border-orange-100 bg-[#fbf8f3] shrink-0 flex items-center justify-between gap-2">
            {taskToEdit && onDeletePermanently ? (
              <button
                type="button"
                onClick={handleDelete}
                style={{ outline: 'none' }}
                className={`btn-volumetric-glass px-3.5 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 outline-none ${
                  confirmDelete ? 'bg-rose-600 text-white' : 'text-rose-600'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? 'Подтвердите' : 'Удалить'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  onClose();
                }}
                style={{ outline: 'none' }}
                className="btn-volumetric-glass px-4 py-2 text-xs font-black text-slate-600 rounded-xl outline-none"
              >
                Отмена
              </button>
              <button
                type="submit"
                style={{ outline: 'none' }}
                className="btn-volumetric-cyan px-6 py-2 text-xs font-black rounded-xl text-white outline-none"
              >
                {taskToEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
