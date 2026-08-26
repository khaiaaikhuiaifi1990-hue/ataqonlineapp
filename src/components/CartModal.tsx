import React from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  MessageCircle, 
  ShoppingBag, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CartItem, PlatformSettings } from '../types';
import { FastImage } from './FastImage';
import { getNextSupportPhone } from '../utils/supportRouter';

interface CartModalProps {
  items: CartItem[];
  settings: PlatformSettings;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onClose: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  items,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onClose
}) => {
  const totalPrice = items.reduce((sum, item) => {
    const price = item.product.discountPrice || item.product.originalPrice;
    return sum + price * item.quantity;
  }, 0);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSendOrderWhatsApp = () => {
    if (items.length === 0) return;

    let message = `*طلب جديد من منصة (${settings.platformName})*\n`;
    message += `───────────────────\n`;

    items.forEach((item, index) => {
      const price = item.product.discountPrice || item.product.originalPrice;
      message += `${index + 1}. *${item.product.name}*\n`;
      message += `   - المتجر: ${item.product.merchantName}\n`;
      message += `   - الكمية: ${item.quantity}\n`;
      message += `   - السعر: ${price} ${settings.currency} (الإجمالي: ${price * item.quantity} ${settings.currency})\n`;
    });

    message += `───────────────────\n`;
    message += `*المجموع الكلي: ${totalPrice.toLocaleString('ar-YE')} ${settings.currency}*\n`;
    message += `عدد الأصناف: ${totalItemsCount} قطعة\n\n`;
    message += `يرجى تأكيد توفر الطلب وترتيب الاستلام والتوصيل في عتق. شكراً!`;

    const selectedPhone = getNextSupportPhone(settings);
    const cleanPhone = selectedPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      id="cart-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="cart-modal-container"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">سلة الطلبات والرغبات</h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {totalItemsCount} {totalItemsCount === 1 ? 'عنصر' : 'عناصر'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
              >
                تفريغ السلة
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {items.length > 0 ? (
            items.map((item) => {
              const currentPrice = item.product.discountPrice || item.product.originalPrice;
              return (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                      <FastImage
                        src={item.product.image}
                        thumbnail={item.product.thumbnail}
                        alt={item.product.name}
                        aspectRatio="aspect-square"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {item.product.name}
                      </h4>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {item.product.merchantName}
                      </div>
                      <div className="text-xs font-black text-rose-600 mt-1">
                        {(currentPrice * item.quantity).toLocaleString('ar-YE')} {settings.currency}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="p-0.5 text-slate-600 hover:text-slate-900"
                        title="إنقاص"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="p-0.5 text-slate-600 hover:text-slate-900"
                        title="زيادة"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف من السلة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">السلة فارغة حالياً</h3>
              <p className="text-xs text-slate-500 mt-1">
                تصفح العروض المميزة وأضف منتجاتك المفضلة هنا لإرسالها دفعة واحدة.
              </p>
            </div>
          )}
        </div>

        {/* Footer with Summary & WhatsApp Button */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-bold">المجموع الإجمالي:</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-600">
                  {totalPrice.toLocaleString('ar-YE')}
                </span>
                <span className="text-xs font-bold text-slate-500">{settings.currency}</span>
              </div>
            </div>

            <button
              onClick={handleSendOrderWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] text-sm"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>إرسال الطلب المجمع عبر واتساب</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
