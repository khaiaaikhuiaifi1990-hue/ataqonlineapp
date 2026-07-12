import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingBag, Clock, Tag, MessageCircle, Share2, X, ChevronLeft, ChevronRight, Sparkles, Lock, ArrowLeft, ArrowUpRight, Copy, Check, Maximize2 } from 'lucide-react';
import { Product, Agent, Category } from '../types';

interface CustomerStoreProps {
  products: Product[];
  agents?: Agent[];
  customerServicePhones?: string[];
  onNavigateToAdmin: () => void;
  isLoading: boolean;
  categories?: Category[];
}

const CATEGORIES_ICONS: Record<string, string> = {
  'ملابس نسائية': '👗',
  'عالم الأطفال (بناتي ولادي)': '👶',
  'تجميل وإكسسوارات': '💄',
  'المطبخ الحديثة': '🍳',
  'مفروشات': '🛏️',
  'عالم الرجل بلمسة نسائية': '👔',
  'عروض خاصة': '🔥',
};

export default function CustomerStore({ products, agents = [], customerServicePhones = ['967733221100'], onNavigateToAdmin, isLoading, categories }: CustomerStoreProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  const dynamicCategoriesIcons: Record<string, string> = {};
  if (categories) {
    categories.forEach(c => {
      dynamicCategoriesIcons[c.value] = c.icon;
    });
  } else {
    Object.assign(dynamicCategoriesIcons, CATEGORIES_ICONS);
  }

  // Filter only active and non-expired products
  const activeProducts = products.filter((p) => {
    const isNotHidden = p.status !== 'hidden';
    const isNotExpired = !p.expiry || p.expiry > 9000000000000 || Date.now() < p.expiry;
    return isNotHidden && isNotExpired;
  });

  const uniqueCategories = Array.from(new Set(activeProducts.map((p) => p.category).filter(Boolean)));

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.about?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const calculateRemaining = (expiry: number, isLong = false) => {
    if (!expiry || expiry > 9000000000000) {
      return isLong ? 'مدة العرض حتى انتهاء مدة هذا العرض في المتجر: عرض مستمر' : '⏳ عرض مستمر';
    }
    const diff = expiry - Date.now();
    if (diff <= 0) return 'منتهي';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      let daysText = `${days} يوم`;
      if (days === 1) daysText = 'يوم واحد';
      else if (days === 2) daysText = 'يومين';
      
      const hoursText = remainingHours > 0 ? ` و ${remainingHours} ساعة` : '';
      if (isLong) {
        return `مدة العرض حتى انتهاء مدة هذا العرض في المتجر: ${daysText}${hoursText}`;
      }
      return `⏳ متبقي ${daysText}${hoursText}`;
    }
    if (isLong) {
      return `مدة العرض حتى انتهاء مدة هذا العرض في المتجر: ${hours} ساعة فقط`;
    }
    return `⏳ متبقي ${hours} ساعة فقط`;
  };

  const getProductAbout = (about?: string) => {
    if (!about || about.trim() === '' || about.trim() === 'تلقائي') {
      return 'منتج عالي الجودة من متجر عتّق أونلاين';
    }
    return about;
  };

  const getProductSizes = (sizes?: string) => {
    if (!sizes || sizes.trim() === '' || sizes.trim() === 'تلقائي') {
      return 'متوفر جميع المقاسات';
    }
    return sizes;
  };

  const handleCopyLink = (product: Product) => {
    const textToCopy = `🛒 منتج: ${product.name}\n🔖 كود المنتج (mCode): ${product.mCode || 'غير متوفر'}\n💰 السعر: ${product.price?.toLocaleString()} ريال\n📍 قسم: ${product.category}\n🌐 اطلب الآن عبر عتق أونلاين!`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppOrder = (product: Product) => {
    // Determine the WhatsApp phone number of the target Customer Service / Agent
    let targetPhone = '967733221100'; // Default customer service number
    let agentMatched = false;
    
    if (product.mCode && agents && agents.length > 0) {
      const matchingAgent = agents.find(
        (a) => a.status === 'active' && a.mCode.trim().toLowerCase() === product.mCode.trim().toLowerCase()
      );
      if (matchingAgent && matchingAgent.phone) {
        // Format phone: remove any non-digit characters
        let cleaned = matchingAgent.phone.replace(/[^0-9]/g, '');
        // If it's 9 digits starting with 7, add Yemen country code
        if (cleaned.length === 9 && cleaned.startsWith('7')) {
          cleaned = '967' + cleaned;
        }
        targetPhone = cleaned;
        agentMatched = true;
      }
    }

    // If no agent matched the specific product code, use the Round Robin customer service pool
    if (!agentMatched && customerServicePhones && customerServicePhones.length > 0) {
      // Get last selected index of customer service from localStorage
      const lastIdx = parseInt(localStorage.getItem('last_cs_index') || '-1');
      const nextIdx = (lastIdx + 1) % customerServicePhones.length;
      localStorage.setItem('last_cs_index', nextIdx.toString());
      
      let rawPhone = customerServicePhones[nextIdx] || '967733221100';
      let cleaned = rawPhone.replace(/[^0-9]/g, '');
      if (cleaned.length === 9 && cleaned.startsWith('7')) {
        cleaned = '967' + cleaned;
      }
      targetPhone = cleaned;
    }

    const templateMessage = `السلام عليكم عتق أونلاين\n\nأود الاستفسار وطلب منتج من المعرض:\n- *اسم المنتج:* ${product.name}\n- *كود المنتج (mCode):* ${product.mCode || 'عادي'}\n- *السعر المعلن للبيع:* ${product.price?.toLocaleString()} ريال\n- *القسم:* ${product.category}\n\nشكراً لكم وجاري مراجعة طلبي معكم وسداد القيمة`;
    const encodedText = encodeURIComponent(templateMessage);
    // Open Whatsapp link
    window.open(`https://wa.me/${targetPhone}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Dynamic Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#b7336a]/10 via-[#b7336a]/5 to-rose-50/50 rounded-3xl border border-rose-100/30 p-6 sm:p-10 text-right">
        {/* Abstract background decorative patterns */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#b7336a]/5 rounded-full filter blur-xl -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-rose-200/20 rounded-full filter blur-2xl translate-x-20 translate-y-20" />

        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#b7336a]/10 text-[#b7336a] px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>معرض العروض الحية اليومية</span>
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            استمتع بالتسوق من <span className="bg-gradient-to-l from-[#b7336a] to-rose-700 bg-clip-text text-transparent">عتق أونلاين</span> 🛍️
          </h2>
          
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed font-medium">
            تصفح أرقى العروض والمنتجات المتوفرة والمُضافة حديثاً من قبل التجار. عروض عاجلة ومحسوبة بهوامش أرباح يسيرة لتسهيل تسوقكم في عتق ومديرياتها.
          </p>
        </div>
      </section>

      {/* Advanced Search and Filter Utilities */}
      <section className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xl shadow-rose-950/[0.01] space-y-5">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Custom Search field */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ابحث عن منتجك المفضل، كود، أو تفاصيل العرض السريع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3.5 bg-gray-50/70 hover:bg-gray-50 border border-gray-200 focus:border-[#b7336a] rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-rose-50/50 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                مسح
              </button>
            )}
          </div>

          {/* Quick Stats of Active listings */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-3 bg-rose-50/50 border border-rose-100/30 rounded-2xl text-xs text-[#b7336a] font-bold shrink-0">
            <ShoppingBag className="w-4 h-4" />
            <span>متوفر حالياً: {activeProducts.length} عرض نشط بالمعرض</span>
          </div>
        </div>

        {/* Scrollable Horizontal Category Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 block pr-1">تصفح الأقسام والتبويبات المتوفرة:</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border ${
                selectedCategory === ''
                  ? 'bg-[#b7336a] border-[#b7336a] text-white shadow-md shadow-rose-900/10'
                  : 'bg-gray-50 border-gray-200/70 text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎯 الكل ({activeProducts.length})
            </button>

            {uniqueCategories.map((cat) => {
              const count = activeProducts.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-[#b7336a] border-[#b7336a] text-white shadow-md shadow-rose-900/10'
                      : 'bg-gray-50 border-gray-200/70 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm">{dynamicCategoriesIcons[cat] || '📦'}</span>
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                    selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Load progress or Empty catalogues feedback */}
      {isLoading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#b7336a] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm font-bold">جاري تحميل المعرض ومزامنة العروض من السيرفر...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300 border border-gray-100">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1 bg-white">
            <h4 className="font-bold text-gray-800 text-base">لا توجد عروض نشطة حالياً</h4>
            <p className="text-gray-400 text-xs font-semibold leading-relaxed">
              {activeProducts.length === 0
                ? 'يرجى مراجعة المعرض لاحقاً، جاري إضافة عروض حديثة من قبل مناديب وتجار عتق أونلاين.'
                : 'لا توجد منتجات تطابق شروط البحث أو الفلترة المحددة.'}
            </p>
          </div>
          {selectedCategory || searchTerm ? (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSearchTerm('');
              }}
              className="text-xs text-[#b7336a] font-bold hover:underline"
            >
              استعادة تهيئة البحث والكل ↩
            </button>
          ) : null}
        </div>
      ) : (
        /* The Storefront Bento grid */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map((p, i) => {
            const hasImages = p.imgs && p.imgs.length > 0;
            
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                onClick={() => {
                  setSelectedProduct(p);
                  setActiveImageIndex(0);
                }}
                className="bg-white border border-gray-100/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col group relative cursor-pointer"
              >
                {/* Card Top Gallery - Primary image only */}
                <div className="relative h-44 sm:h-64 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {hasImages ? (
                    <img
                      src={p.imgs[0]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ShoppingBag className="w-12 h-12 text-gray-300" />
                  )}
                  {/* Subtle fade overlay at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                </div>

                {/* Card Content - Super simplified with Name, Price and WhatsApp Button */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="text-right space-y-1">
                    <h3
                      className="font-extrabold text-gray-800 text-sm sm:text-base line-clamp-1 group-hover:text-[#b7336a] transition-colors"
                      title={p.name}
                    >
                      {p.name}
                    </h3>
                    
                    <div className="flex items-baseline gap-0.5 sm:gap-1 text-[#b7336a]">
                      <span className="text-base sm:text-lg font-black font-sans leading-none">
                        {p.price?.toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold">ريال</span>
                    </div>
                  </div>

                  {/* Wide WhatsApp Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the modal when clicking the button
                      handleWhatsAppOrder(p);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
                  >
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>طلب بالواتساب</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* High-Fidelity Product Full Details Dialog Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop cover blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />

            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 z-10 flex flex-col md:flex-row max-h-[85vh] md:max-h-none overflow-y-auto md:overflow-visible"
            >
              {/* Close Button top edge corner */}
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-gray-500 hover:text-gray-800 p-2 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all z-20 border border-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Column Right: Interactive Gallery display */}
              <div className="w-full md:w-1/2 bg-gray-50 flex flex-col justify-between p-4 relative border-l border-gray-100 shrink-0 select-none">
                <div 
                  onClick={() => {
                    if (selectedProduct.imgs && selectedProduct.imgs[activeImageIndex]) {
                      setFullscreenImageUrl(selectedProduct.imgs[activeImageIndex]);
                    }
                  }}
                  className="flex-1 h-64 md:h-96 flex items-center justify-center relative overflow-hidden rounded-2xl bg-white border border-gray-50 shadow-inner cursor-zoom-in group/mainimg"
                >
                  {selectedProduct.imgs && selectedProduct.imgs[activeImageIndex] ? (
                    <>
                      <img
                        src={selectedProduct.imgs[activeImageIndex]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover/mainimg:scale-[1.02]"
                        referrerPolicy="no-referrer"
                      />
                      {/* Interactive hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover/mainimg:bg-black/[0.03] transition-all flex items-center justify-center">
                        <span className="bg-black/60 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl text-xs font-black opacity-0 group-hover/mainimg:opacity-100 transition-opacity flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover/mainimg:translate-y-0 duration-300">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>عرض ملء الشاشة 🔍</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <ShoppingBag className="w-16 h-16 text-gray-300" />
                  )}

                  {/* Image Navigation Carousel Arrows */}
                  {selectedProduct.imgs && selectedProduct.imgs.length > 1 && (
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between">
                      <button
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === 0 ? selectedProduct.imgs.length - 1 : prev - 1
                          )
                        }
                        className="bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md p-1.5 rounded-full hover:scale-105 active:scale-95 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === selectedProduct.imgs.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md p-1.5 rounded-full hover:scale-105 active:scale-95 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-gallery indicator dots/thumbnails */}
                {selectedProduct.imgs && selectedProduct.imgs.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 overflow-x-auto py-1">
                    {selectedProduct.imgs.map((img, thumbIdx) => (
                      <button
                        key={`thumbnail-${thumbIdx}`}
                        onClick={() => setActiveImageIndex(thumbIdx)}
                        className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white shadow-inner ${
                          thumbIdx === activeImageIndex
                            ? 'border-[#b7336a] scale-105 shadow-md shadow-rose-900/5'
                            : 'border-transparent opacity-60 hover:opacity-100 hover:scale-102'
                        }`}
                      >
                        <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Column Left: Information params */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6 text-right">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3.5">
                    {/* Category text heading */}
                    <span className="bg-[#b7336a]/10 text-[#b7336a] px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <span>{dynamicCategoriesIcons[selectedProduct.category] || '📦'}</span>
                      <span>{selectedProduct.category}</span>
                    </span>

                    {selectedProduct.mCode && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-xl font-bold font-mono">
                        كود المنتج كالتالي: <strong className="text-gray-800">{selectedProduct.mCode}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                    {selectedProduct.name}
                  </h3>

                  {/* Time frame box */}
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#b7336a] bg-rose-50/40 p-2.5 rounded-xl">
                    <Clock className="w-4 h-4 text-[#b7336a] shrink-0" />
                    <span>{calculateRemaining(selectedProduct.expiry, true)}</span>
                  </div>

                  {/* Customer selling Price tag */}
                  <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-gray-500 font-bold text-sm">السعر النهائي للزبون:</span>
                    <div className="flex items-baseline gap-1 text-[#b7336a]">
                      <span className="text-2xl sm:text-3xl font-black font-sans">
                        {selectedProduct.price?.toLocaleString()}
                      </span>
                      <span className="text-sm font-bold">ريال يمني</span>
                    </div>
                  </div>

                  {/* Description space */}
                  <div className="space-y-1.5 pt-1.5">
                    <span className="block text-xs font-bold text-gray-400">📖 وصف المنتج:</span>
                    <p className="text-gray-600 text-sm leading-relaxed font-semibold">
                      {getProductAbout(selectedProduct.about)}
                    </p>
                  </div>

                  {/* Sizing description list */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-gray-400">📏 المقاسات:</span>
                    <div className="p-3 bg-rose-50/10 border border-dashed border-rose-100 rounded-xl text-xs text-rose-900 font-bold">
                      {getProductSizes(selectedProduct.sizes)}
                    </div>
                  </div>
                </div>

                {/* Confirmations & WhatsApp order widgets */}
                <div className="space-y-3 pt-5 border-t border-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleCopyLink(selectedProduct)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {copiedId === selectedProduct.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">تم نسخ التفاصيل</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>نسخ تفاصيل المنتج</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleWhatsAppOrder(selectedProduct)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                    >
                      <MessageCircle className="w-5 h-5 shrink-0" />
                      <span>تقديم طلب بالواتساب</span>
                    </button>
                  </div>

                  <p className="text-center text-[10px] text-gray-400 font-medium">
                    ⚠️ عند النقر على تقديم طلب، سيقوم هاتفك بنقلك للواتساب لإتمام الشراء والمعاينة مع المشرف
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Lightbox Modal */}
      <AnimatePresence>
        {fullscreenImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImageUrl(null)}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center cursor-zoom-out p-4 md:p-8 select-none"
          >
            {/* Close button top right */}
            <button
              onClick={() => setFullscreenImageUrl(null)}
              className="absolute top-6 left-6 bg-white/10 hover:bg-white/25 text-white p-3 rounded-full transition-all border border-white/10 shadow-xl z-[210] hover:scale-110 active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main fullscreen image container */}
            <div className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center">
              <motion.img
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                src={fullscreenImageUrl}
                alt="Product High Resolution"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl selection:bg-transparent cursor-default border border-white/5"
                referrerPolicy="no-referrer"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
              />
            </div>

            {/* Footer indicator */}
            <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none">
              <span className="bg-black/40 backdrop-blur-md text-white/80 px-4 py-2 rounded-full text-[11px] font-black border border-white/5 shadow-md select-none">
                انقر في أي مكان خارج الصورة أو على زر الإغلاق للعودة ✕
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
