import React, { useState, useEffect } from 'react';
import { RoutineProvider, useRoutines } from './context/RoutineContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DayView } from './components/DayView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { YearView } from './components/YearView';
import { TaskModal } from './components/TaskModal';
import { AccountModal } from './components/AccountModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { TaskTemplate } from './types';
import { haptic } from './utils/haptics';

const MainContent: React.FC<{
  installPrompt: any;
  onInstall: () => void;
}> = ({ installPrompt, onInstall }) => {
  const { viewMode, createTask, updateTask, deleteTaskPermanently } = useRoutines();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskTemplate | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const handleOpenNewTask = () => {
    haptic.medium();
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskTemplate) => {
    haptic.light();
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<TaskTemplate, 'id' | 'createdAt' | 'order'>) => {
    if (taskToEdit) {
      updateTask(taskToEdit.id, taskData);
    } else {
      createTask(taskData);
    }
  };

  const containerMaxWidth = viewMode === 'day' ? 'max-w-3xl' : 'max-w-5xl';

  return (
    <div className="min-h-screen flex flex-col antialiased">
      {/* Top Header */}
      <Header
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenNewTask={handleOpenNewTask}
        installPrompt={installPrompt}
        onInstall={onInstall}
      />

      {/* Main Container */}
      <main className={`flex-1 ${containerMaxWidth} w-full mx-auto px-4 py-4 space-y-4 transition-all duration-300`}>
        {/* Navigation Tabs */}
        <Navigation />

        {/* Dynamic View rendering */}
        <div className="pb-0">
          {viewMode === 'day' && (
            <DayView
              onEditTask={handleOpenEditTask}
              onAddNewTask={handleOpenNewTask}
            />
          )}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'month' && <MonthView />}
          {viewMode === 'year' && <YearView />}
        </div>
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onSave={handleSaveTask}
        onDeletePermanently={deleteTaskPermanently}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Universal guard: Prevents browser user-agent focus rectangles/outlines on mouse clicks across ALL buttons and chips
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, [role="button"], a');
      const isInput = target.closest('input, textarea, select, [contenteditable="true"]');
      if (interactive && !isInput) {
        // Prevent default focus placement on mouse down so Chromium doesn't draw a rectangular focus box
        e.preventDefault();
        // If another element was focused, blur it cleanly
        if (document.activeElement && document.activeElement !== document.body && !document.activeElement.matches('input, textarea')) {
          (document.activeElement as HTMLElement).blur?.();
        }
      }
    };

    window.addEventListener('mousedown', handleGlobalMouseDown, true);
    return () => window.removeEventListener('mousedown', handleGlobalMouseDown, true);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <ErrorBoundary>
      <RoutineProvider>
        <MainContent
          installPrompt={installPrompt}
          onInstall={handleInstallClick}
        />
      </RoutineProvider>
    </ErrorBoundary>
  );
}

export default App;
