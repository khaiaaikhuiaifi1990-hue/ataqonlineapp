import React, { useState, useEffect } from 'react';
import { Bell, X, ShoppingBag } from 'lucide-react';
import { 
  ProductNotificationPayload, 
  subscribeToAutoNotifications, 
  requestAutoNotificationPermission,
  getAutoNotificationPermission
} from '../utils/autoNotificationService';

export const AutoNotificationBanner: React.FC = () => {
  const [activeNotification, setActiveNotification] = useState<ProductNotificationPayload | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // 1. Check & Prompt for notification permission on first app launch
  useEffect(() => {
    const status = getAutoNotificationPermission();
    if (status === 'default') {
      const timer = setTimeout(() => {
        setShowPermissionPrompt(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Subscribe to automatic new product notifications
  useEffect(() => {
    const unsubscribe = subscribeToAutoNotifications((notif) => {
      setActiveNotification(notif);

      // Auto dismiss after 7 seconds
      const timer = setTimeout(() => {
        setActiveNotification((curr) => (curr?.id === notif.id ? null : curr));
      }, 7000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  const handleGrantPermission = async () => {
    setShowPermissionPrompt(false);
    await requestAutoNotificationPermission();
  };

  return (
    <>
      {/* ─── Permission Prompt Bar (shown once if permission is default) ─── */}
      {showPermissionPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-6 sm:max-w-sm z-50 animate-bounce-short">
          <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold">تفعيل التنبيهات الفورية 🔔</div>
                <div className="text-[11px] text-slate-300">لتصلك العروض الجديدة فور إضافتها من التجار</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleGrantPermission}
                className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                تفعيل
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg text-xs"
                title="إغلاق"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Automatic Push Notification Floating Toast ─── */}
      {activeNotification && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-100 animate-slideDown">
          <div className="bg-linear-to-r from-slate-950 via-slate-900 to-rose-950 text-white p-4 rounded-2xl shadow-2xl border border-rose-500/40 backdrop-blur-xl flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {activeNotification.productImage ? (
                <img 
                  src={activeNotification.productImage} 
                  alt={activeNotification.productName} 
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 shrink-0 mt-0.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-rose-600/30 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingBag className="w-5 h-5 animate-bounce" />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-md">
                    تنبيه فوري 🛍️
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold">عتق أونلاين</span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-white truncate">
                  {activeNotification.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-2 leading-relaxed">
                  {activeNotification.body}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
