import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  ShoppingBag, 
  Volume2, 
  Smartphone, 
  Send, 
  Trash2, 
  ChevronLeft,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  ProductNotificationPayload, 
  getNotificationHistory, 
  clearNotificationHistory,
  getAutoNotificationPermission,
  requestAutoNotificationPermission,
  getOrCreateAnonymousDeviceToken,
  sendSampleSheinNotification,
  triggerDeepLinkNavigation,
  GLOBAL_PUSH_TOPIC
} from '../utils/autoNotificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<ProductNotificationPayload[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHistory(getNotificationHistory());
      setPermission(getAutoNotificationPermission());
      setDeviceToken(getOrCreateAnonymousDeviceToken());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestAutoNotificationPermission();
    setPermission(res);
  };

  const handleSendTest = () => {
    sendSampleSheinNotification();
    setTestSent(true);
    setTimeout(() => {
      setHistory(getNotificationHistory());
      setTestSent(false);
    }, 500);
  };

  const handleClear = () => {
    clearNotificationHistory();
    setHistory([]);
  };

  const handleItemClick = (productId: string) => {
    triggerDeepLinkNavigation(productId);
    onClose();
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  };

  return (
    <div 
      id="notification-center-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        id="notification-center-container"
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-linear-to-r from-slate-900 via-rose-950/40 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white">مركز الإشعارات والعروض الفورية</h3>
                <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  SHEIN Style
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تنبيهات فورية عند وصول أي منتج أو عرض جديد تلقائياً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Anonymous Device Status Card */}
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Smartphone className="w-4 h-4 text-rose-400" />
                <span>اشتراك الجهاز المجهول (Anonymous Token):</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>نشط في قناة البث المباشر</span>
              </span>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-2.5 text-[11px] font-mono text-slate-400 border border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
              <span className="truncate">{deviceToken || 'fcm_tok_anon_active'}</span>
              <span className="shrink-0 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-sans font-bold">
                {GLOBAL_PUSH_TOPIC}
              </span>
            </div>

            {/* Permission Control & Test Button Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">إشعارات النظام:</span>
                {permission === 'granted' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مفعّلة (صوت + صورة كاملة)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Bell className="w-3 h-3" />
                    <span>تفعيل إشعارات المتصفح</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={testSent}
                className="bg-slate-700 hover:bg-slate-600 text-amber-300 hover:text-amber-200 text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-slate-600 active:scale-95"
              >
                <Zap className="w-3 h-3" />
                <span>{testSent ? 'تم إرسال التنبيه! 🚀' : 'تجربة إشعار فوري الآن'}</span>
              </button>
            </div>
          </div>

          {/* Notifications Feed */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-300 px-1">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>سجل العروض والمنتجات المستلمة ({history.length})</span>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                  title="مسح السجل"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="bg-slate-800/40 rounded-2xl p-8 text-center border border-dashed border-slate-700/80 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">لا توجد إشعارات مسجلة بعد</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  سيصلك إشعار فوري وتلقائي بصوت وصورة المنتج الكبيرة فور نشر أي منتج أو تخفيض جديد من أي تاجر في عتق!
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSendTest}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-rose-900/40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال إشعار تجريبي الآن</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.productId)}
                    className="group bg-slate-800/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 hover:border-rose-500/60 transition-all cursor-pointer flex items-start gap-3 relative overflow-hidden"
                  >
                    {/* Big Expanded Image Preview */}
                    {item.productImage ? (
                      <div className="relative shrink-0">
                        <img 
                          src={item.productImage} 
                          alt={item.productName} 
                          className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        {item.discountPercent && item.discountPercent > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                            %{item.discountPercent}-
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-linear-to-br from-rose-600/30 to-amber-500/30 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}

                    {/* Content Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-rose-300 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>

                      <div className="flex items-center justify-between pt-1 gap-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-amber-300">
                            {Number(item.productPrice).toLocaleString('ar-YE')} ر.ي
                          </span>
                          {item.originalPrice && item.originalPrice > item.productPrice && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {Number(item.originalPrice).toLocaleString('ar-YE')} ر.ي
                            </span>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 bg-rose-600 group-hover:bg-rose-500 text-white text-[11px] font-black px-2.5 py-1 rounded-lg transition-all shrink-0">
                          <span>عرض المنتج</span>
                          <ChevronLeft className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Banner Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام إشعارات فوري آمن ومجاني لجميع العملاء في عتق</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
