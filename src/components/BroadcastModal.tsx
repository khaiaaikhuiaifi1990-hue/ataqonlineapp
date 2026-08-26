import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  MessageSquare, 
  Send, 
  Store,
  Flame,
  Layers,
  Filter
} from 'lucide-react';
import { Product, PlatformSettings } from '../types';

interface BroadcastModalProps {
  products: Product[];
  settings: PlatformSettings;
  onClose: () => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  products,
  settings,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [onlyOffers, setOnlyOffers] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [customHeader, setCustomHeader] = useState<string>(
    '🔥 *أقوى عروض وتخفيضات اليوم في مدينة عتق - شبوة* 🔥'
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (onlyOffers && !p.isOffer) return false;
      if (selectedCategory !== 'الكل' && p.category !== selectedCategory) return false;
      return true;
    }).slice(0, 10); // Take top 10
  }, [products, selectedCategory, onlyOffers]);

  // Generate WhatsApp formatted broadcast text
  const broadcastText = useMemo(() => {
    let text = `${customHeader}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (filteredProducts.length === 0) {
      text += `لا توجد عروض متاحة حالياً في هذا القسم.\n\n`;
    } else {
      filteredProducts.forEach((p, idx) => {
        const hasDiscount = p.discountPrice && p.discountPrice < p.originalPrice;
        const currentPrice = hasDiscount ? p.discountPrice! : p.originalPrice;
        const discountPercent = hasDiscount 
          ? Math.round(((p.originalPrice - p.discountPrice!) / p.originalPrice) * 100) 
          : 0;

        text += `${idx + 1}️⃣ *${p.name}*\n`;
        text += `   🏷️ *السعر:* ${currentPrice} ${settings.currency}`;
        if (hasDiscount) {
          text += ` ~(بدلاً من ${p.originalPrice})~ 🔥 خصم ${discountPercent}%`;
        }
        text += `\n`;
        text += `   🏪 *المتجر:* ${p.merchantName}\n`;
        if (p.merchantLocation) {
          text += `   📍 *الموقع:* ${p.merchantLocation}\n`;
        }
        text += `   📲 *للطلب السريع:* wa.me/${(p.merchantPhone || settings.supportPhone).replace(/[^0-9]/g, '')}\n\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📱 تصفح كافة العروض الحصرية ومتاجر عتق عبر موقعنا:\n`;
    text += `🌐 ${window.location.origin}\n\n`;
    text += `📞 للاستفسارات والدعم الموحد: ${settings.supportPhone}`;

    return text;
  }, [filteredProducts, customHeader, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(broadcastText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsAppShare = () => {
    const encoded = encodeURIComponent(broadcastText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div 
      id="broadcast-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="broadcast-modal-container"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                مولد الرسائل الإعلانية التلقائي لواتساب
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                توليد ونشر رسائل تسويقية منسقة لجروبات شبوة وعتق بضغطة زر
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تصفية حسب القسم
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs font-bold p-2 rounded-lg border border-slate-300 bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={onlyOffers}
                  onChange={(e) => setOnlyOffers(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>تضمين العروض والتخفيضات فقط ({filteredProducts.length})</span>
              </label>
            </div>
          </div>

          {/* Broadcast Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>معاينة نص الرسالة المنسق لواتساب:</span>
              </label>
              <span className="text-[11px] text-slate-400">جاهز للنسخ والنشر الفوري</span>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={10}
                value={broadcastText}
                className="w-full p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 outline-none leading-relaxed select-all"
                dir="rtl"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            تم تضمين {filteredProducts.length} عرض في هذه الرسالة.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ الرسالة'}</span>
            </button>

            <button
              onClick={handleOpenWhatsAppShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>مشاركة مباشرة إلى واتساب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
