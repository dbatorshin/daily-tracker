import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Delete, ShieldCheck, KeyRound, ScanFace } from 'lucide-react';
import { haptic } from '../utils/haptics';
import {
  isBiometricsSupported,
  isBiometricsConfigured,
  isBiometricsEnabled,
  authenticateWithBiometrics,
  registerBiometrics,
} from '../utils/biometrics';

interface PinLockProps {
  onUnlock: () => void;
}

const PIN_STORAGE_KEY = 'daily_routines_pin';
const UNLOCKED_SESSION_KEY = 'daily_routines_unlocked';

export function isPinConfigured(): boolean {
  try {
    return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function isAppUnlocked(): boolean {
  try {
    const hasPin = Boolean(localStorage.getItem(PIN_STORAGE_KEY));
    if (!hasPin) return false; // Require creating PIN on first launch
    return sessionStorage.getItem(UNLOCKED_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function lockApp(): void {
  try {
    sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
  } catch {}
}

export function setAppPin(newPin: string): void {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
  } catch {}
}

export function removeAppPin(): void {
  try {
    localStorage.removeItem(PIN_STORAGE_KEY);
    sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
  } catch {}
}

export const PinLock: React.FC<PinLockProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'create' | 'confirm' | 'prompt_bio'>(() =>
    isPinConfigured() ? 'enter' : 'create'
  );
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Biometrics state
  const [canUseBio, setCanUseBio] = useState(false);
  const [isBioConfigured, setIsBioConfigured] = useState(() => isBiometricsConfigured());
  const [isBioEnabled, setIsBioEnabled] = useState(() => isBiometricsEnabled());
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);

  // Check if device supports platform biometrics (Face ID / Touch ID / Windows Hello)
  useEffect(() => {
    isBiometricsSupported().then((supported) => {
      setCanUseBio(supported);
    });
  }, []);

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    haptic.error();
    setTimeout(() => {
      setShake(false);
      setPin('');
      if (step === 'confirm') {
        setStep('create');
        setConfirmPin('');
      }
    }, 600);
  };

  // Authenticate using device biometrics
  const handleBiometricAuth = useCallback(async () => {
    if (!isBiometricsConfigured() || !isBiometricsEnabled()) return;
    setIsAuthenticatingBio(true);
    setError(null);
    try {
      const res = await authenticateWithBiometrics();
      if (res.success) {
        haptic.celebrate();
        try {
          sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
        } catch {}
        onUnlock();
      } else if (!res.cancelled && res.error) {
        // Show friendly error only if not cancelled by user
        setError('Не удалось распознать лицо. Введите PIN');
      }
    } finally {
      setIsAuthenticatingBio(false);
    }
  }, [onUnlock]);

  // Attempt automatic Face ID on app launch
  const hasAutoTriggeredRef = useRef(false);
  useEffect(() => {
    if (step === 'enter' && !hasAutoTriggeredRef.current && isBioConfigured && isBioEnabled) {
      hasAutoTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, isBioConfigured, isBioEnabled, handleBiometricAuth]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 4) return;
      haptic.light();
      setError(null);
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        if (step === 'enter') {
          const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
          if (nextPin === savedPin) {
            haptic.success();
            try {
              sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
            } catch {}
            // If biometrics is supported but not configured yet, offer to enable it!
            if (canUseBio && !isBioConfigured) {
              setStep('prompt_bio');
            } else {
              onUnlock();
            }
          } else {
            triggerError('Неверный PIN-код');
          }
        } else if (step === 'create') {
          setTimeout(() => {
            setConfirmPin(nextPin);
            setPin('');
            setStep('confirm');
          }, 150);
        } else if (step === 'confirm') {
          if (nextPin === confirmPin) {
            haptic.success();
            setAppPin(nextPin);
            if (canUseBio) {
              setStep('prompt_bio');
            } else {
              onUnlock();
            }
          } else {
            triggerError('PIN-коды не совпали. Попробуйте снова');
          }
        }
      }
    },
    [pin, step, confirmPin, canUseBio, isBioConfigured, onUnlock]
  );

  const handleDelete = useCallback(() => {
    if (pin.length === 0) return;
    haptic.light();
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [pin]);

  // Support hardware / physical keyboard
  useEffect(() => {
    if (step === 'prompt_bio') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, handleDigit, handleDelete]);

  // Activate Face ID when offered
  const handleActivateBio = async () => {
    setIsRegisteringBio(true);
    setError(null);
    try {
      const res = await registerBiometrics();
      if (res.success) {
        haptic.celebrate();
        setIsBioConfigured(true);
        setIsBioEnabled(true);
        try {
          sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
        } catch {}
        onUnlock();
      } else if (res.error) {
        setError(res.error);
      }
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const handleSkipBio = () => {
    haptic.light();
    try {
      sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
    } catch {}
    onUnlock();
  };

  // Screen offering Face ID setup
  if (step === 'prompt_bio') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#fbf8f3]/95 backdrop-blur-xl animate-in fade-in duration-300 select-none">
        <div className="w-full max-w-sm flex flex-col items-center text-center p-6 rounded-3xl bg-white/70 border border-white/80 shadow-[0_20px_50px_rgba(249,115,22,0.15)]">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-400 p-1 shadow-[0_10px_25px_rgba(20,184,166,0.35)] flex items-center justify-center mb-5">
            <div className="w-full h-full rounded-[22px] bg-[#f0fdfa] flex items-center justify-center text-teal-700">
              <ScanFace className="w-10 h-10 stroke-[2.2] text-teal-600" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2">
            Вход по Face ID
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-medium mb-6 max-w-xs leading-relaxed">
            Включить вход по лицу или отпечатку, чтобы приложение открывалось мгновенно без ввода цифр?
          </p>

          {error && (
            <p className="text-xs font-black text-rose-600 mb-4 animate-in fade-in">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2.5 w-full">
            <button
              type="button"
              onClick={handleActivateBio}
              disabled={isRegisteringBio}
              style={{ outline: 'none' }}
              className="btn-volumetric-cyan w-full py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer"
            >
              <ScanFace className="w-4 h-4 stroke-[2.5]" />
              <span>{isRegisteringBio ? 'Сканирование лица...' : 'Включить Face ID'}</span>
            </button>

            <button
              type="button"
              onClick={handleSkipBio}
              style={{ outline: 'none' }}
              className="btn-volumetric-glass w-full py-2.5 rounded-2xl text-xs font-bold text-slate-600 active:scale-95 transition cursor-pointer"
            >
              Напомнить позже
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#fbf8f3]/95 backdrop-blur-xl animate-in fade-in duration-300 select-none">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* App Volumetric Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 p-1 shadow-[0_10px_25px_rgba(249,115,22,0.35)] flex items-center justify-center mb-4 transition-transform hover:scale-105">
          <div className="w-full h-full rounded-[20px] bg-[#fff8f0] flex items-center justify-center text-amber-700">
            {step === 'enter' ? (
              <Lock className="w-8 h-8 stroke-[2.2] text-amber-600" />
            ) : (
              <ShieldCheck className="w-8 h-8 stroke-[2.2] text-amber-600" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight mb-1">
          {step === 'enter'
            ? 'Вход в Ежедневки'
            : step === 'create'
            ? 'Задайте PIN-код'
            : 'Подтвердите PIN-код'}
        </h2>

        {/* Subtitle / Prompt */}
        <p className="text-xs sm:text-sm text-amber-900/70 font-semibold mb-6">
          {step === 'enter'
            ? isBioConfigured && isBioEnabled
              ? 'Взгляните на экран или введите PIN-код'
              : 'Введите 4-значный код для доступа'
            : step === 'create'
            ? 'Придумайте 4 цифры для защиты ваших дел'
            : 'Введите код ещё раз для подтверждения'}
        </p>

        {/* 4 Pin Indicator Dots */}
        <div
          className={`flex items-center gap-4 mb-8 transition-transform duration-200 ${
            shake ? 'translate-x-[-10px] duration-75 text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 scale-110 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                    : isFilled
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 scale-125 shadow-[0_2px_8px_rgba(249,115,22,0.6)]'
                    : 'bg-stone-200/80 border-2 border-stone-300'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs font-black text-rose-600 mb-4 animate-in fade-in">
            {error}
          </p>
        )}

        {/* 3D Volumetric Clay Keypad */}
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleDigit(digit)}
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              className="btn-volumetric-glass w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full text-2xl font-black text-slate-800 flex items-center justify-center cursor-pointer shadow-sm active:scale-90 transition-all outline-none"
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Biometrics Face ID Button, 0, Backspace */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto flex items-center justify-center">
            {step === 'enter' && isBioConfigured && isBioEnabled ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleBiometricAuth}
                disabled={isAuthenticatingBio}
                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                className="btn-volumetric-cyan w-16 h-16 sm:w-18 sm:h-18 rounded-full text-white flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all outline-none"
                title="Войти по Face ID / биометрии"
              >
                <ScanFace className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] text-white" />
              </button>
            ) : step === 'enter' && canUseBio && !isBioConfigured ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStep('prompt_bio')}
                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                className="btn-volumetric-glass w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center cursor-pointer shadow-sm active:scale-90 transition-all outline-none"
                title="Настроить вход по Face ID"
              >
                <ScanFace className="w-6 h-6 stroke-[2] text-teal-600" />
              </button>
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto flex items-center justify-center text-slate-400">
                {step === 'enter' && (
                  <KeyRound className="w-5 h-5 text-amber-900/30" />
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleDigit('0')}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-glass w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full text-2xl font-black text-slate-800 flex items-center justify-center cursor-pointer shadow-sm active:scale-90 transition-all outline-none"
          >
            0
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleDelete}
            disabled={pin.length === 0}
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
            className="btn-volumetric-glass w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full text-slate-700 flex items-center justify-center cursor-pointer shadow-sm active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all outline-none"
            title="Стереть"
          >
            <Delete className="w-6 h-6 stroke-[2]" />
          </button>
        </div>

        {/* Help footer note */}
        <p className="text-[11px] text-slate-500 font-semibold mt-8 max-w-xs">
          {step === 'enter'
            ? isBioConfigured && isBioEnabled
              ? 'Нажмите на кнопку с лицом, чтобы запустить Face ID снова'
              : 'Защита личных данных на вашем устройстве'
            : 'Код сохранится в вашем браузере для безопасного входа'}
        </p>
      </div>
    </div>
  );
};
