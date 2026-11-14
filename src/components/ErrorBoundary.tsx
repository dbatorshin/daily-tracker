import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-md w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center mx-auto text-xl font-black">
              !
            </div>
            <h2 className="text-lg font-black text-slate-800">Что-то пошло не так</h2>
            <p className="text-xs text-slate-600 font-medium">
              Произошла непредвиденная ошибка интерфейса. Ваши данные в безопасности.
            </p>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerText = 'Перезагрузка...';
                window.location.reload();
              }}
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              className="btn-volumetric-cyan px-5 py-2 text-xs font-black rounded-full text-white cursor-pointer outline-none"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
