import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Delete, ShieldCheck, KeyRound, ScanFace } from 'lucide-react';
import { haptic } from '../utils/haptics';
import {
  isBiometricsSupported,
  universalBiometricUnlock,
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

  // Default to 'bio' mode immediately if PIN is configured, unless biometrics was explicitly disabled
  const [step, setStep] = useState<'bio' | 'enter' | 'create' | 'confirm'>(() => {
    if (!isPinConfigured()) return 'create';
    if (localStorage.getItem('daily_routines_bio_enabled') === 'false') return 'enter';
    return 'bio';
  });

  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [canUseBio, setCanUseBio] = useState(true);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);

  // Check hardware biometrics support on mount
  useEffect(() => {
    isBiometricsSupported().then((supported) => {
      setCanUseBio(supported);
      if (!supported && step === 'bio') {
        // Fallback to keypad if device has no biometrics hardware
        setStep('enter');
      }
    });
  }, [step]);

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

  // Authenticate / Register with Face ID or biometrics
  const handleBiometricAuth = useCallback(async () => {
    setIsAuthenticatingBio(true);
    setError(null);
    try {
      const res = await universalBiometricUnlock();
      if (res.success) {
        haptic.celebrate();
        try {
          sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
        } catch {}
        onUnlock();
      } else {
        if (!res.cancelled && res.error) {
          setError(res.error);
        } else if (res.cancelled) {
          // If user dismissed Face ID, offer PIN code
          setError('Вход отменён. Введите PIN-код');
          setStep('enter');
        }
      }
    } catch {
      setError('Не удалось распознать лицо. Введите PIN-код');
      setStep('enter');
    } finally {
      setIsAuthenticatingBio(false);
    }
  }, [onUnlock]);

  // AUTO-TRIGGER ON LAUNCH: Seek face immediately when screen appears
  const autoBioTriggeredRef = useRef(false);
  useEffect(() => {
    if (step === 'bio' && !autoBioTriggeredRef.current) {
      autoBioTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, handleBiometricAuth]);

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
            onUnlock();
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
            onUnlock();
          } else {
            triggerError('PIN-коды не совпали. Попробуйте снова');
          }
        }
      }
    },
    [pin, step, confirmPin, onUnlock]
  );

  const handleDelete = useCallback(() => {
    if (pin.length === 0) return;
    haptic.light();
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [pin]);

  // Support hardware / physical keyboard
  useEffect(() => {
    if (step === 'bio') return;
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

  // 1. DEFAULT SCREEN: Face ID / Biometrics First
  if (step === 'bio') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#fbf8f3]/95 backdrop-blur-xl animate-in fade-in duration-300 select-none cursor-pointer"
        onClick={() => {
          if (!isAuthenticatingBio) handleBiometricAuth();
        }}
      >
        <div
          className="w-full max-w-sm flex flex-col items-center text-center p-6 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* App Volumetric Icon */}
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 p-1 shadow-[0_10px_25px_rgba(249,115,22,0.35)] flex items-center justify-center mb-6">
            <div className="w-full h-full rounded-[20px] bg-[#fff8f0] flex items-center justify-center text-amber-700">
              <ScanFace className="w-8 h-8 stroke-[2.2] text-amber-600" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight mb-2">
            Вход в Ежедневки
          </h2>

          <p className="text-xs sm:text-sm text-amber-900/70 font-semibold mb-8">
            {isAuthenticatingBio
              ? 'Поиск и сканирование лица...'
              : 'Взгляните на экран или коснитесь кнопки'}
          </p>

          {/* Large Central Biometric Scanner Button */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute w-36 h-36 rounded-full bg-cyan-400/20 animate-ping opacity-70 pointer-events-none" />
            <div className="absolute w-32 h-32 rounded-full bg-teal-400/25 animate-pulse pointer-events-none" />
            <button
              type="button"
              onClick={() => handleBiometricAuth()}
              disabled={isAuthenticatingBio}
              style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              className="relative btn-volumetric-cyan w-24 h-24 sm:w-28 sm:h-28 rounded-full text-white flex items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all outline-none"
              title="Нажмите для распознавания лица"
            >
              <ScanFace
                className={`w-12 h-12 sm:w-14 sm:h-14 stroke-[2.2] text-white ${
                  isAuthenticatingBio ? 'animate-pulse' : ''
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="text-xs font-black text-rose-600 mt-6 animate-in fade-in">
              {error}
            </p>
          )}

          {/* Fallback to PIN code button */}
          <div className="mt-8 pt-4 w-full">
            <button
              type="button"
              onClick={() => {
                haptic.light();
                setStep('enter');
              }}
              style={{ outline: 'none' }}
              className="btn-volumetric-glass w-full py-3 rounded-2xl text-xs sm:text-sm font-extrabold text-slate-700 flex items-center justify-center gap-2 active:scale-95 transition outline-none cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Войти по PIN-коду</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. PIN KEYPAD SCREEN (For manual entry, or if face not recognized)
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
            ? 'Введите PIN-код'
            : step === 'create'
            ? 'Задайте PIN-код'
            : 'Подтвердите PIN-код'}
        </h2>

        {/* Subtitle / Prompt */}
        <p className="text-xs sm:text-sm text-amber-900/70 font-semibold mb-6">
          {step === 'enter'
            ? 'Введите 4-значный код или нажмите значок лица'
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
            {step === 'enter' && canUseBio ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  haptic.light();
                  setStep('bio');
                  handleBiometricAuth();
                }}
                disabled={isAuthenticatingBio}
                style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                className="btn-volumetric-cyan w-16 h-16 sm:w-18 sm:h-18 rounded-full text-white flex items-center justify-center cursor-pointer shadow-md active:scale-90 transition-all outline-none"
                title="Войти по Face ID / биометрии"
              >
                <ScanFace className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] text-white" />
              </button>
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto flex items-center justify-center text-slate-400">
                <KeyRound className="w-5 h-5 text-amber-900/30" />
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
            ? 'Нажмите на кнопку с лицом в углу для входа по Face ID'
            : 'Код сохранится в вашем браузере для безопасного входа'}
        </p>
      </div>
    </div>
  );
};
