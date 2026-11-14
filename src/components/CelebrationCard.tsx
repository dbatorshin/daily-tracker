import React, { useState, useEffect } from 'react';
import { RotateCw, Check, Sparkles } from 'lucide-react';
import { haptic } from '../utils/haptics';

interface CelebrationCardProps {
  streakDays?: number;
  totalTasks: number;
}

export type AnimationType =
  | 'confetti'
  | 'stamp'
  | 'zen'
  | 'streak'
  | 'capsule'
  | 'balloons'
  | 'trophy'
  | 'flower'
  | 'shockwave'
  | 'rainbow';

interface AnimationVariant {
  id: AnimationType;
  name: string;
  title: string;
  subtitle: string;
}

const VARIANTS: AnimationVariant[] = [
  {
    id: 'confetti',
    name: '3D-Салют из сфер',
    title: 'Все действия выполнены!',
    subtitle: 'День закрыт на 100%! Отличная работа!',
  },
  {
    id: 'stamp',
    name: '3D-Печать совершенства',
    title: 'Идеальный день!',
    subtitle: 'Печать выполнена: все планы воплощены в жизнь.',
  },
  {
    id: 'zen',
    name: 'Дзен-сфера и дыхание',
    title: 'Полная гармония',
    subtitle: 'Все задачи закрыты. Время глубокого отдыха.',
  },
  {
    id: 'streak',
    name: 'Огонь серии дней',
    title: 'Серия продолжается!',
    subtitle: 'Огонь привычки горит ярко. Ты на высоте!',
  },
  {
    id: 'capsule',
    name: 'Золотая 3D-капсула',
    title: '100% результат!',
    subtitle: 'Все запланированные дела упакованы и завершены.',
  },
  {
    id: 'balloons',
    name: 'Парящие 3D-шары',
    title: 'Легкость и победа!',
    subtitle: 'План на день выполнен с абсолютным успехом.',
  },
  {
    id: 'trophy',
    name: 'Кубок чемпиона',
    title: 'Кубок дня — твой!',
    subtitle: 'Идеальный день. Заслуженная победа!',
  },
  {
    id: 'flower',
    name: 'Распускающийся цветок',
    title: 'День расцвёл!',
    subtitle: 'Каждое маленькое действие приближает тебя к цели.',
  },
  {
    id: 'shockwave',
    name: 'Волны триумфа',
    title: 'Максимальный заряд!',
    subtitle: 'Всё выполнено на одном дыхании. Гордись собой!',
  },
  {
    id: 'rainbow',
    name: '3D-Радуга с облаками',
    title: 'Безупречный финал!',
    subtitle: 'Чистый горизонт: все действия на сегодня завершены.',
  },
];

export const CelebrationCard: React.FC<CelebrationCardProps> = ({
  streakDays = 1,
  totalTasks,
}) => {
  // Select a random animation variant on initial render
  const [variantIndex, setVariantIndex] = useState(() =>
    Math.floor(Math.random() * VARIANTS.length)
  );
  const [replayKey, setReplayKey] = useState(0);

  const currentVariant = VARIANTS[variantIndex];

  useEffect(() => {
    haptic.celebrate();
  }, [variantIndex, replayKey]);

  const handleNextRandom = () => {
    haptic.medium();
    // Pick another random variant distinct from current
    setVariantIndex((prev) => {
      let next = Math.floor(Math.random() * VARIANTS.length);
      if (next === prev) next = (next + 1) % VARIANTS.length;
      return next;
    });
    setReplayKey((k) => k + 1);
  };

  return (
    <div className="glass-panel p-6 sm:p-7 text-center overflow-hidden relative select-none">
      {/* Background ambient glow matching variant */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-radial from-orange-300/30 via-transparent to-transparent" />

      {/* Dynamic 3D Animation Arena */}
      <div
        key={`${currentVariant.id}-${replayKey}`}
        className="relative w-44 h-44 mx-auto flex items-center justify-center mb-3"
      >
        {/* VARIANT 0: Confetti Spheres Burst */}
        {currentVariant.id === 'confetti' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Center volumetric 3D check circle */}
            <div className="w-16 h-16 rounded-full btn-volumetric-cyan flex items-center justify-center shadow-lg animate-celebrate-pop z-10">
              <Check className="w-8 h-8 stroke-[3.5] text-white" />
            </div>

            {/* Orbiting / Bursting 3D clay spheres */}
            {[
              { color: '#f97316', size: 18, x: -55, y: -45, delay: '0ms' },
              { color: '#fbbf24', size: 14, x: 50, y: -50, delay: '50ms' },
              { color: '#14b8a6', size: 16, x: -60, y: 35, delay: '100ms' },
              { color: '#ec4899', size: 15, x: 60, y: 30, delay: '70ms' },
              { color: '#8b5cf6', size: 13, x: 0, y: -65, delay: '120ms' },
              { color: '#06b6d4', size: 12, x: -35, y: -60, delay: '90ms' },
              { color: '#f43f5e', size: 14, x: 40, y: -65, delay: '140ms' },
              { color: '#84cc16', size: 16, x: 0, y: 65, delay: '110ms' },
              { color: '#a855f7', size: 12, x: -45, y: 55, delay: '150ms' },
              { color: '#fb923c', size: 15, x: 45, y: 55, delay: '80ms' },
            ].map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-celebrate-burst"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  boxShadow:
                    'inset 0 2px 2px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)',
                  transform: `translate(${p.x}px, ${p.y}px)`,
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>
        )}

        {/* VARIANT 1: 3D Stamp */}
        {currentVariant.id === 'stamp' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Concentric Impact Waves */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-orange-400/40 animate-stamp-ring-1" />
            <div className="absolute w-36 h-36 rounded-full border border-amber-300/30 animate-stamp-ring-2" />

            {/* 3D Wax / Clay Stamp */}
            <div className="w-20 h-20 rounded-full btn-volumetric-cyan flex flex-col items-center justify-center shadow-2xl animate-stamp-impact z-10">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/60 flex items-center justify-center">
                <Check className="w-9 h-9 stroke-[4] text-white" />
              </div>
            </div>
          </div>
        )}

        {/* VARIANT 2: Zen Breathing Sphere */}
        {currentVariant.id === 'zen' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Breathing Aura Rings */}
            <div className="absolute w-32 h-32 rounded-full bg-orange-400/15 blur-md animate-zen-breath-ring" />
            <div className="absolute w-40 h-40 rounded-full bg-amber-400/10 blur-xl animate-zen-breath-ring-delayed" />

            {/* Smooth 3D Clay Pearl */}
            <div
              className="w-20 h-20 rounded-full animate-zen-breath z-10 flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #fff7ed 0%, #fed7aa 40%, #f97316 85%, #c2410c 100%)',
                boxShadow:
                  'inset 0 3px 5px rgba(255,255,255,0.9), inset 0 -4px 6px rgba(124,45,18,0.4), 0 12px 28px rgba(234,88,12,0.35)',
              }}
            >
              <Sparkles className="w-8 h-8 text-white drop-shadow animate-pulse" />
            </div>
          </div>
        )}

        {/* VARIANT 3: 3D Streak Flame */}
        {currentVariant.id === 'streak' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Ambient heat glow */}
            <div className="absolute w-28 h-28 rounded-full bg-amber-500/20 blur-xl animate-pulse" />

            {/* 3D Cartoon Clay Flame */}
            <div className="relative animate-flame-dance z-10 flex flex-col items-center">
              <svg width="84" height="96" viewBox="0 0 84 96" fill="none">
                <defs>
                  <linearGradient id="flameGrad" x1="42" y1="0" x2="42" y2="96" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fbbf24" />
                    <stop offset="0.5" stopColor="#f97316" />
                    <stop offset="1" stopColor="#dc2626" />
                  </linearGradient>
                  <linearGradient id="flameCore" x1="42" y1="35" x2="42" y2="85" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" />
                    <stop offset="0.6" stopColor="#fef08a" />
                    <stop offset="1" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="clayShadow" x="-10%" y="-10%" width="120%" height="130%">
                    <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#9a3412" floodOpacity="0.4" />
                  </filter>
                </defs>
                {/* Outer flame */}
                <path
                  d="M42 4C42 4 58 26 58 46C58 64 48 76 42 88C36 76 26 64 26 46C26 26 42 4 42 4Z"
                  fill="url(#flameGrad)"
                  filter="url(#clayShadow)"
                />
                {/* Inner hot core */}
                <path
                  d="M42 35C42 35 50 48 50 60C50 70 45 78 42 85C39 78 34 70 34 60C34 48 42 35 42 35Z"
                  fill="url(#flameCore)"
                />
              </svg>
              {/* Flame streak badge */}
              <div className="mt-[-10px] bg-white text-orange-600 font-black text-xs px-2.5 py-0.5 rounded-full shadow-md border border-orange-200">
                +{streakDays} {streakDays === 1 ? 'день' : streakDays < 5 ? 'дня' : 'дней'}
              </div>
            </div>

            {/* Rising sparks */}
            <div className="absolute w-2 h-2 rounded-full bg-amber-300 animate-spark-1" />
            <div className="absolute w-2 h-2 rounded-full bg-orange-400 animate-spark-2" />
            <div className="absolute w-2 h-2 rounded-full bg-rose-400 animate-spark-3" />
          </div>
        )}

        {/* VARIANT 4: 3D Spinning Golden Capsule */}
        {currentVariant.id === 'capsule' && (
          <div className="relative w-full h-full flex items-center justify-center perspective-[600px]">
            <div className="w-32 h-14 rounded-full btn-volumetric-cyan flex items-center justify-center gap-2 shadow-2xl animate-capsule-spin z-10 px-4">
              <span className="text-amber-200 text-sm">★</span>
              <span className="text-white font-black text-sm tracking-wide">100% ГОТОВО</span>
              <span className="text-amber-200 text-sm">★</span>
            </div>
            <div className="absolute w-28 h-10 rounded-full bg-orange-500/25 blur-lg" />
          </div>
        )}

        {/* VARIANT 5: Floating Clay Balloons */}
        {currentVariant.id === 'balloons' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {[
              { color: '#f97316', x: -35, y: 0, delay: '0ms', scale: 1 },
              { color: '#14b8a6', x: 0, y: -20, delay: '120ms', scale: 1.15 },
              { color: '#ec4899', x: 35, y: -5, delay: '240ms', scale: 0.95 },
            ].map((b, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-center animate-balloon-float"
                style={{
                  transform: `translate(${b.x}px, ${b.y}px) scale(${b.scale})`,
                  animationDelay: b.delay,
                }}
              >
                {/* 3D Balloon body */}
                <div
                  className="w-12 h-14 rounded-full relative"
                  style={{
                    backgroundColor: b.color,
                    borderRadius: '50% 50% 50% 50% / 45% 45% 55% 55%',
                    boxShadow:
                      'inset 0 3px 4px rgba(255,255,255,0.7), inset 0 -3px 4px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Balloon knot */}
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1.5 rounded-xs"
                    style={{ backgroundColor: b.color }}
                  />
                </div>
                {/* Balloon string */}
                <div className="w-0.5 h-8 bg-amber-900/30 -mt-0.5" />
              </div>
            ))}
          </div>
        )}

        {/* VARIANT 6: 3D Winner Trophy Cup */}
        {currentVariant.id === 'trophy' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Orbiting stars */}
            <div className="absolute text-amber-400 text-lg animate-orbit-star-1">★</div>
            <div className="absolute text-orange-400 text-sm animate-orbit-star-2">✦</div>
            <div className="absolute text-yellow-300 text-base animate-orbit-star-3">★</div>

            {/* 3D Trophy Cup */}
            <div className="animate-trophy-bounce z-10 flex flex-col items-center">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <defs>
                  <linearGradient id="goldGrad" x1="40" y1="10" x2="40" y2="70" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fef08a" />
                    <stop offset="0.3" stopColor="#f59e0b" />
                    <stop offset="1" stopColor="#b45309" />
                  </linearGradient>
                  <filter id="trophyShadow" x="-10%" y="-10%" width="120%" height="130%">
                    <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#78350f" floodOpacity="0.35" />
                  </filter>
                </defs>
                {/* Cup Bowl */}
                <path
                  d="M20 18C20 18 20 44 40 44C60 44 60 18 60 18H20Z"
                  fill="url(#goldGrad)"
                  filter="url(#trophyShadow)"
                />
                {/* Handles */}
                <path
                  d="M20 22C12 22 12 34 20 36M60 22C68 22 68 34 60 36"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Stem & Base */}
                <path d="M37 44H43V54H37V44Z" fill="#d97706" />
                <rect x="28" y="54" width="24" height="8" rx="4" fill="url(#goldGrad)" filter="url(#trophyShadow)" />
                {/* Star on Cup */}
                <path
                  d="M40 25L42 30H47L43 33L45 38L40 35L35 38L37 33L33 30H38L40 25Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
          </div>
        )}

        {/* VARIANT 7: 3D Blooming Flower */}
        {currentVariant.id === 'flower' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 5 Petals Blooming with Spring Easing */}
            <div className="relative w-28 h-28 flex items-center justify-center animate-flower-sway">
              {[0, 72, 144, 216, 288].map((angle, idx) => (
                <div
                  key={idx}
                  className="absolute w-10 h-10 rounded-full animate-petal-bloom"
                  style={{
                    backgroundColor: ['#fb923c', '#f472b6', '#a78bfa', '#38bdf8', '#4ade80'][idx],
                    boxShadow:
                      'inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.1)',
                    transform: `rotate(${angle}deg) translateY(-22px)`,
                    animationDelay: `${idx * 60}ms`,
                  }}
                />
              ))}
              {/* Flower Center Core */}
              <div
                className="w-12 h-12 rounded-full relative z-10 flex items-center justify-center animate-celebrate-pop"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 100%)',
                  boxShadow:
                    'inset 0 2px 3px #ffffff, inset 0 -2px 3px #b45309, 0 4px 10px rgba(180,83,9,0.3)',
                }}
              >
                <Check className="w-6 h-6 stroke-[3.5] text-amber-900" />
              </div>
            </div>
          </div>
        )}

        {/* VARIANT 8: Concentric Energy Shockwaves */}
        {currentVariant.id === 'shockwave' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Concentric expanding ripples */}
            <div className="absolute w-20 h-20 rounded-full border-2 border-orange-400/50 animate-wave-1" />
            <div className="absolute w-28 h-28 rounded-full border-2 border-amber-400/40 animate-wave-2" />
            <div className="absolute w-36 h-36 rounded-full border border-teal-400/30 animate-wave-3" />

            {/* Flying badges - centered with symmetrical burst */}
            <div className="absolute text-base animate-badge-fly-1 pointer-events-none select-none">✨</div>
            <div className="absolute text-base animate-badge-fly-2 pointer-events-none select-none">🏆</div>
            <div className="absolute text-base animate-badge-fly-3 pointer-events-none select-none">🎯</div>
            <div className="absolute text-base animate-badge-fly-4 pointer-events-none select-none">🚀</div>

            {/* Center Volumetric Core */}
            <div className="w-16 h-16 rounded-full btn-volumetric-cyan flex items-center justify-center shadow-2xl z-10 animate-celebrate-pop">
              <Check className="w-8 h-8 stroke-[3.5] text-white" />
            </div>
          </div>
        )}

        {/* VARIANT 9: 3D Rainbow Arc */}
        {currentVariant.id === 'rainbow' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 3D Rainbow SVG Arc */}
            <div className="animate-rainbow-draw z-10 flex flex-col items-center">
              <svg width="130" height="70" viewBox="0 0 130 70" fill="none">
                <defs>
                  <filter id="clayBlur" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#a0522d" floodOpacity="0.2" />
                  </filter>
                </defs>
                {/* 4 Colored Arcs */}
                <path d="M15 65 A50 50 0 0 1 115 65" stroke="#f97316" strokeWidth="8" strokeLinecap="round" filter="url(#clayBlur)" />
                <path d="M23 65 A42 42 0 0 1 107 65" stroke="#fbbf24" strokeWidth="8" strokeLinecap="round" />
                <path d="M31 65 A34 34 0 0 1 99 65" stroke="#34d399" strokeWidth="8" strokeLinecap="round" />
                <path d="M39 65 A26 26 0 0 1 91 65" stroke="#a78bfa" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Clouds at rainbow feet */}
            <div className="absolute bottom-6 left-2 w-10 h-7 rounded-full bg-white shadow-md animate-cloud-bounce-left" />
            <div className="absolute bottom-6 right-2 w-10 h-7 rounded-full bg-white shadow-md animate-cloud-bounce-right" />
          </div>
        )}
      </div>

      {/* Title & Subtitle */}
      <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
        {currentVariant.title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 font-semibold max-w-sm mx-auto mt-1">
        {currentVariant.subtitle}
      </p>

      {/* Completion Metric Chips */}
      <div className="flex items-center justify-center gap-2 mt-3.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-800 border border-orange-300/40">
          ✓ Выполнено: {totalTasks} из {totalTasks}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-800 border border-emerald-300/40">
          🔥 Серия: {streakDays} {streakDays === 1 ? 'день' : streakDays < 5 ? 'дня' : 'дней'}
        </span>
      </div>

      {/* Interactive Switcher / Replay Button */}
      <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-center gap-2">
        <div
          role="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={handleNextRandom}
          style={{ outline: 'none', border: 'none', WebkitTapHighlightColor: 'transparent', userSelect: 'none' }}
          className="btn-volumetric-glass px-4 py-1.5 text-xs font-extrabold text-slate-700 rounded-full flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition"
          title="Случайная анимация"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Случайная анимация ({variantIndex + 1}/10)</span>
        </div>
      </div>
    </div>
  );
};
