import React, { useState } from 'react';
import { 
  Edit3, 
  Trash2, 
  Sparkles, 
  Plus, 
  Minus, 
  ExternalLink, 
  Tag, 
  Clock,
  Search
} from 'lucide-react';
import { Product } from '../types';
import { FastImage } from './FastImage';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDeleteProduct?: (product: Product) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onToggleOffer: (id: string, isOffer: boolean) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onDeleteProduct,
  onUpdateQuantity,
  onToggleOffer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('الكل');

  const filtered = products.filter((p) => {
    if (selectedCat !== 'الكل' && p.category !== selectedCat) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.merchantName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* List Filter Header */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في منتجاتك..."
            className="w-full text-xs font-medium py-2 pr-9 pl-3 rounded-xl border border-slate-300 bg-white focus:border-rose-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="text-xs text-slate-500 font-bold self-end sm:self-auto">
          إجمالي النتائج: {filtered.length}
        </div>
      </div>

      {/* Desktop and Mobile Friendly Responsive List */}
      <div className="divide-y divide-slate-100">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const hasDiscount = item.discountPrice && item.discountPrice < item.originalPrice;
            const currentPrice = hasDiscount ? item.discountPrice! : item.originalPrice;
            const profit = (item.costPrice && item.costPrice > 0) ? currentPrice - item.costPrice : null;

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Image & Basic Info */}
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <FastImage
                      src={item.image}
                      thumbnail={item.thumbnail}
                      alt={item.name}
                      aspectRatio="aspect-square"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                      {item.isOffer && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>عرض مميز</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</h4>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-black text-rose-600">
                        {currentPrice.toLocaleString('ar-YE')} ريال يمني
                      </span>
                      {hasDiscount && (
                        <span className="text-slate-400 line-through text-[11px]">
                          {item.originalPrice} ريال يمني
                        </span>
                      )}
                      {profit !== null && profit > 0 && (
                        <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          ربح: +{profit} ريال يمني
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Controls & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold ml-1">الكمية:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-700"
                      title="إنقاص"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-700"
                      title="زيادة"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors"
                      title="تعديل العرض"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`delete-product-${item.id}-btn`}
                      type="button"
                      onClick={() => {
                        if (onDeleteProduct) {
                          onDeleteProduct(item);
                        } else {
                          onDelete(item.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 transition-colors cursor-pointer"
                      title="حذف العرض نهائياً من المعرض"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs font-bold">
            لا توجد منتجات مطابقة في قائمتك.
          </div>
        )}
      </div>
    </div>
  );
};
