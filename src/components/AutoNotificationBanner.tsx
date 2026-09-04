import React, { useState, useEffect } from 'react';
import { Bell, X, ShoppingBag, Sparkles, ChevronLeft, Tag, Flame } from 'lucide-react';
import { 
  ProductNotificationPayload, 
  subscribeToAutoNotifications, 
  requestAutoNotificationPermission,
  getAutoNotificationPermission,
  triggerDeepLinkNavigation,
  getOrCreateAnonymousDeviceToken
} from '../utils/autoNotificationService';

export const AutoNotificationBanner: React.FC = () => {
  const [activeNotification, setActiveNotification] = useState<ProductNotificationPayload | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [progress, setProgress] = useState(100);

  // 1. Check & Prompt for notification permission on first app launch
  useEffect(() => {
    // Silently initialize the anonymous FCM device token on launch
    getOrCreateAnonymousDeviceToken();

    const status = getAutoNotificationPermission();
    if (status === 'default') {
      const timer = setTimeout(() => {
        setShowPermissionPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Subscribe to automatic new product notifications
  useEffect(() => {
    let dismissTimeout: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const unsubscribe = subscribeToAutoNotifications((notif) => {
      setActiveNotification(notif);
      setProgress(100);

      // Smooth progress bar countdown
      const startTime = Date.now();
      const duration = 8000; // 8 seconds display time

      clearInterval(progressInterval);
      clearTimeout(dismissTimeout);

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 100);

      dismissTimeout = setTimeout(() => {
        setActiveNotification(null);
        clearInterval(progressInterval);
      }, duration);
    });

    return () => {
      unsubscribe();
      clearTimeout(dismissTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  const handleGrantPermission = async () => {
    setShowPermissionPrompt(false);
    await requestAutoNotificationPermission();
  };

  const handleNotificationClick = () => {
    if (activeNotification) {
      triggerDeepLinkNavigation(activeNotification.productId);
      setActiveNotification(null);
    }
  };

  return (
    <>
      {/* ─── Permission Prompt Bar (Styled like SHEIN / leading shopping apps) ─── */}
      {showPermissionPrompt && (
        <aside aria-label="تنبيه تفعيل الإشعارات" className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-6 sm:max-w-md z-50 animate-bounce-short">
          <div className="bg-slate-900/98 text-white p-4 rounded-2xl shadow-2xl border border-rose-500/40 backdrop-blur-xl flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/25">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-right min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                  <Flame className="w-3.5 h-3.5 fill-rose-400" />
                  <span>تنبيهات فورية بأسلوب التطبيقات الكبرى</span>
                </div>
                <h4 className="text-sm font-black text-white mt-0.5">
                  فعّل الإشعارات لتصلك أحدث الصفقات فوراً 🛍️
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  تصلك إشعارات فورية ومجانية بالمنتجات والعروض الحصرية بدون الحاجة لأي تسجيل حساب أو رقم هاتف.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                لاحقاً
              </button>
              <button
                type="button"
                onClick={handleGrantPermission}
                className="bg-linear-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-lg shadow-rose-900/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>تفعيل فوري بنقرة واحدة</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ─── SHEIN-Style Expanded Interactive Push Notification Banner ─── */}
      {activeNotification && (
        <aside aria-label="إشعار عرض جديد" className="fixed top-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg z-100 animate-slideDown">
          <div 
            onClick={handleNotificationClick}
            className="group relative bg-linear-to-br from-slate-950 via-slate-900 to-rose-950/90 text-white rounded-2xl shadow-2xl border-2 border-rose-500/60 backdrop-blur-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:border-rose-400"
          >
            {/* Top Auto-dismiss Progress bar */}
            <div className="w-full bg-slate-800/80 h-1">
              <div 
                className="bg-linear-to-r from-amber-400 via-rose-500 to-pink-500 h-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-3.5 sm:p-4">
              {/* Header Badge Row */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    <Flame className="w-3 h-3 fill-white" />
                    <span>وصل حديثاً | NEW IN</span>
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{activeNotification.merchantName || 'عتق أونلاين'}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNotification(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                  title="إغلاق التنبيه"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Content & Expanded Big Picture (SHEIN Style) */}
              <div className="flex items-start gap-3 sm:gap-4">
                {activeNotification.productImage ? (
                  <div className="relative shrink-0">
                    <img 
                      src={activeNotification.productImage} 
                      alt={activeNotification.productName} 
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-rose-500/40 shadow-md group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    {activeNotification.discountPercent && activeNotification.discountPercent > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                        %{activeNotification.discountPercent}-
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-linear-to-br from-rose-600/40 to-amber-500/30 border border-rose-500/50 text-rose-300 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-8 h-8 animate-bounce" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-1">
                    {activeNotification.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {activeNotification.body}
                  </p>

                  {/* Price & Action Button Footer */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-amber-300">
                        {Number(activeNotification.productPrice).toLocaleString('ar-YE')} ر.ي
                      </span>
                      {activeNotification.originalPrice && activeNotification.originalPrice > activeNotification.productPrice && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {Number(activeNotification.originalPrice).toLocaleString('ar-YE')} ر.ي
                        </span>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1 bg-rose-600 group-hover:bg-rose-500 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-sm transition-all shrink-0">
                      <span>تصفح واطلب الآن</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
