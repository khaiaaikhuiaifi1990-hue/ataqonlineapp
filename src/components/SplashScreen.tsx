import React, { useEffect, useState } from 'react';
import { ShoppingBag, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  maxDurationMs?: number; // Default: 800ms
}

/**
 * Ultra-Fast Non-Blocking Splash Screen for Ataq Online
 * Guarantees visual hand-off to the main store interface within <= 800ms max.
 * Fully decoupled from Firebase, background network calls, and analytics.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  maxDurationMs = 800
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // 1. Smooth micro-progress bar advancing rapidly within 600ms
    const startTime = Date.now();
    const progressDuration = Math.max(300, maxDurationMs - 200);

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round(15 + (elapsed / progressDuration) * 85));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressTimer);
      }
    }, 40);

    // 2. Start fade-out before the hard ceiling
    const fadeOutDelay = Math.max(250, maxDurationMs - 220);
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      // Also notify any static HTML splash screen to fade out
      if (typeof window !== 'undefined' && typeof (window as any).__hideHtmlSplash === 'function') {
        try {
          (window as any).__hideHtmlSplash();
        } catch {}
      }
    }, fadeOutDelay);

    // 3. Absolute Hard Ceiling (Strictly <= 800ms)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, maxDurationMs);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [maxDurationMs, onComplete]);

  const handleQuickDismiss = () => {
    setIsFadingOut(true);
    if (typeof window !== 'undefined' && typeof (window as any).__hideHtmlSplash === 'function') {
      try {
        (window as any).__hideHtmlSplash();
      } catch {}
    }
    setTimeout(onComplete, 150);
  };

  return (
    <div
      id="app-splash-overlay"
      onClick={handleQuickDismiss}
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-between bg-white px-6 py-12 transition-all duration-200 ease-out select-none cursor-pointer ${
        isFadingOut ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        willChange: 'opacity, transform',
      }}
      aria-label="شاشة بدء عتق أونلاين"
      role="dialog"
      aria-modal="true"
    >
      {/* Top subtle badge */}
      <div className="pt-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
        <Sparkles className="w-3.5 h-3.5 text-rose-500" />
        <span>منصة شبوة الأولى للتسوق والعروض</span>
      </div>

      {/* Centered Brand Emblem */}
      <div className="flex flex-col items-center text-center -mt-8">
        {/* Animated Brand Logo Icon with gentle pulse */}
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-linear-to-tr from-[#b7336a] via-[#d45679] to-[#f48fb1] flex items-center justify-center text-white shadow-xl shadow-rose-500/25">
            <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          {/* Decorative ping dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white" />
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          عتق أونلاين
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-xs leading-relaxed">
          قناة عرض وتسويق الخدمات والسلع المحلية في شبوة
        </p>

        {/* Micro Fast Progress Bar (Max 800ms) */}
        <div className="w-48 sm:w-56 mt-6">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-rose-500 to-amber-500 transition-all duration-75 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-2 block">
            تحميل فوري من الذاكرة المحلية ⚡
          </span>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center pb-2">
        <p className="text-[11px] text-slate-400 font-medium">
          عتق - شبوة • سرعة فائقة وتحديث فوري
        </p>
      </div>
    </div>
  );
};
