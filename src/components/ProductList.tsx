import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Eye, EyeOff, Trash2, Search, Filter, Clock, Tag, ShoppingBag, FolderOpen } from 'lucide-react';
import { Product } from '../types';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onToggleStatus: (id: string, currentStatus: 'active' | 'hidden') => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export default function ProductList({ products, onEdit, onToggleStatus, onDelete, isLoading }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const calculateRemaining = (expiry: number) => {
    if (!expiry || expiry > 9000000000000) return '♾️ مستمر';
    const diff = expiry - Date.now();
    if (diff <= 0) return 'منتهي ⏱️';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `${Math.floor(hours / 24)} يوم` : `${hours} ساعة`;
  };

  const getUniqueCategories = () => {
    const list = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set(list));
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (p.mCode?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (p.about?.toLowerCase().includes(searchTerm.toLowerCase()) || '');

    const matchesCategory = categoryFilter ? p.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="product-list-section" className="space-y-4" dir="rtl">
      {/* Search and filter controls */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج، كود التاجر (mCode)، أو الوصف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-11 pl-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
          />
        </div>

        <div className="flex gap-2 min-w-[200px]">
          <Filter className="text-gray-400 w-5 h-5 my-auto shrink-0 mr-2" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
          >
            <option value="">جميع الأقسام</option>
            {getUniqueCategories().map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-50 shadow-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#b7336a] animate-spin" />
          <p className="text-gray-500 font-bold text-sm">جاري مزامنة المنتجات حياً من قاعدة البيانات...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-50 shadow-sm flex flex-col items-center justify-center gap-3">
          <FolderOpen className="w-10 h-10 text-gray-300" />
          <p className="text-gray-500 font-bold text-sm">
            {products.length === 0 ? 'لم تقم برفع أي عروض حالياً.' : 'لم يتم العثور على عروض تطابق شروط البحث.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((p, i) => {
              const remaining = calculateRemaining(p.expiry);
              const isExpired = p.expiry && p.expiry < 9000000000000 && Date.now() > p.expiry;
              const hasImgs = p.imgs && p.imgs.length > 0;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    p.status === 'hidden'
                      ? 'border-gray-100 bg-gray-55/40 opacity-75'
                      : isExpired
                      ? 'border-amber-100 bg-amber-50/5'
                      : 'border-rose-100/30 hover:border-rose-100/70'
                  }`}
                >
                  {/* Right hand layout: product details */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-20 h-20 shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center shadow-inner">
                      {hasImgs ? (
                        <img
                          src={p.imgs[0]}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                      )}

                      {/* Images count indicator */}
                      {hasImgs && p.imgs.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                          +{p.imgs.length - 1} صور
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-right flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-gray-800 text-base truncate max-w-[220px]" title={p.name}>
                          {p.name}
                        </h4>
                        {p.mCode && (
                          <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono">
                            {p.mCode}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-xs">
                        <span className="font-semibold text-rose-800">
                          سعر التكلفة المدخل: <strong className="font-sans font-bold text-sm text-gray-800">{p.costPrice?.toLocaleString('en-US')}</strong> ريال يمني
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        {/* Category Badge */}
                        <span className="bg-rose-50 text-rose-700 text-[11px] px-2.5 py-1 rounded-full font-bold">
                          {p.category}
                        </span>

                        {/* Status Badge */}
                        {p.status === 'hidden' ? (
                          <span className="bg-gray-100 text-gray-500 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <EyeOff className="w-3.5 h-3.5" /> مخفي عن الزبائن
                          </span>
                        ) : isExpired ? (
                          <span className="bg-amber-100 text-amber-700 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            🖤 منتهي العرض
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            🟢 نشط بالمعرض
                          </span>
                        )}

                        {/* Expiry Badge */}
                        <span className="bg-indigo-50/70 text-indigo-700 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" /> المتبقي: {remaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Left hand layout: Action controls */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 pt-3 sm:pt-0 shrink-0">
                    <button
                      onClick={() => onEdit(p)}
                      className="p-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1 font-bold text-xs shadow-sm hover:shadow border border-sky-100/30"
                      title="تعديل العرض"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => onToggleStatus(p.id, p.status || 'active')}
                      className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1 font-bold text-xs shadow-sm hover:shadow border ${
                        p.status === 'hidden'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100/35'
                          : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-100/35'
                      }`}
                      title={p.status === 'hidden' ? 'إظهار المنتج' : 'إخفاء المنتج'}
                    >
                      {p.status === 'hidden' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      <span>{p.status === 'hidden' ? 'إظهار' : 'إخفاء'}</span>
                    </button>

                    <button
                      onClick={() => onDelete(p.id)}
                      className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-1 font-bold text-xs shadow-sm hover:shadow border border-red-100/30"
                      title="حذف العرض"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Simple local refresh svg for the spinner state
const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);
