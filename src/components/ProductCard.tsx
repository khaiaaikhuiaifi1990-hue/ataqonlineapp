import React from 'react';
import { Sparkles, MessageCircle, Eye } from 'lucide-react';
import { Product } from '../types';
import { FastImage } from './FastImage';

interface ProductCardProps {
  product: Product;
  currency?: string;
  onSelect: (product: Product) => void;
  onQuickWhatsApp: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  currency = 'ريال يمني',
  onSelect,
  onQuickWhatsApp
}) => {
  const hasDiscount = product.discountPrice && product.discountPrice < product.originalPrice;
  const currentPrice = hasDiscount ? product.discountPrice! : product.originalPrice;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice - product.discountPrice!) / product.originalPrice) * 100) 
    : 0;

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer hover:border-rose-200"
    >
      {/* Image Container with Badges */}
      <div className="relative overflow-hidden bg-slate-100">
        <FastImage
          src={product.image}
          thumbnail={product.thumbnail}
          alt={product.name}
          aspectRatio="aspect-square"
          className="group-hover:scale-105 transition-transform duration-300"
        />

        {/* Exclusive Offer Badge */}
        {product.isOffer && (
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-amber-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm">
            <Sparkles className="w-3 h-3 fill-current" />
            <span>عرض حصري</span>
          </div>
        )}

        {/* Discount Tag */}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm">
            خصم {discountPercent}%
          </div>
        )}

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>عرض التفاصيل</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span className="truncate max-w-[140px]">{product.category}</span>
            <span className="text-slate-500 font-semibold">{product.merchantName}</span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Pricing & Quick Order Action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-rose-600">
                {currentPrice.toLocaleString('ar-YE')}
              </span>
              <span className="text-xs font-bold text-slate-500">{currency}</span>
            </div>
          </div>

          {/* Quick WhatsApp Action Button */}
          <button
            id={`quick-wa-btn-${product.id}`}
            type="button"
            onClick={(e) => onQuickWhatsApp(product, e)}
            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors border border-emerald-200 hover:border-emerald-600 shrink-0"
            title="طلب سريع عبر واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">طلب واتساب</span>
          </button>
        </div>
      </div>
    </div>
  );
});
