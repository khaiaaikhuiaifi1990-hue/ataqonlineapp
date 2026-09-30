import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Calculator, 
  Check, 
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  Store,
  Phone,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Trash2,
  Clock,
  Shirt,
  Palette,
  FileText,
  Hash,
  HelpCircle,
  Loader2,
  CheckCircle2,
  Rocket
} from 'lucide-react';
import { Product, Merchant } from '../types';
import { compressAndOptimizeImage } from '../utils/imageOptimizer';
import { uploadImageToFirebaseStorage, UPLOAD_TIMEOUT_ERROR_MESSAGE } from '../firebase';
import { FastImage } from './FastImage';
import { calculateCustomerPrice, sanitizeWhatsAppPhone, isDummyPhone } from '../utils/supportRouter';

interface ProductFormProps {
  initialProduct?: Product | null;
  categories?: string[];
  profitMarginPercent?: number;
  activeMerchant?: Merchant | null;
  onSave: (product: Product) => void;
  onClose: () => void;
}

const DEFAULT_FORM_CATEGORIES: string[] = [
  'عروض خاصة',
  'ملابس نسائية',
  'عالم الأطفال',
  'تجميل وإكسسوارات',
  'المطبخ الحديثة',
  'مفروشات',
  'أحذية',
  'إكسسوارات الجوالات',
  'إلكترونيات وجوالات',
  'سوبرماركت ومواد غذائية',
  'عطور وبخور',
  'مطاعم وكافيهات'
];

interface ImageSlot {
  title: string;
  subtitle: string;
  url: string;
  thumbnail: string;
  blob?: Blob;
  stats?: {
    originalSizeFormatted: string;
    compressedSizeFormatted: string;
    savingsPercent: number;
    width: number;
    height: number;
    mimeType?: 'image/webp' | 'image/jpeg';
  };
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct,
  categories: customCategories,
  profitMarginPercent,
  activeMerchant,
  onSave,
  onClose
}) => {
  const formCategories = (customCategories && customCategories.length > 0)
    ? customCategories.filter((c) => c !== 'الكل' && c !== 'عروض حصرية')
    : DEFAULT_FORM_CATEGORIES;

  // 1. Photos State (Up to 4 images)
  const [images, setImages] = useState<ImageSlot[]>([
    {
      title: 'الصورة الأساسية / المظهرية',
      subtitle: 'الواجهة الرئيسية للعرض',
      url: initialProduct?.image || '',
      thumbnail: initialProduct?.thumbnail || ''
    },
    {
      title: 'صورة اللون الثاني',
      subtitle: 'اختياري - مظهر لون إضافي',
      url: initialProduct?.additionalImages?.[0] || '',
      thumbnail: ''
    },
    {
      title: 'صورة اللون الثالث',
      subtitle: 'اختياري - زاوية أو لون آخر',
      url: initialProduct?.additionalImages?.[1] || '',
      thumbnail: ''
    },
    {
      title: 'صورة اللون الرابع / التفاصيل',
      subtitle: 'اختياري - مقاسات أو مواصفات',
      url: initialProduct?.additionalImages?.[2] || '',
      thumbnail: ''
    }
  ]);

  // 2. Product Name
  const [name, setName] = useState(initialProduct?.name || '');

  // 3. Category
  const [category, setCategory] = useState<string>(
    initialProduct?.category || formCategories[0] || 'ملابس نسائية'
  );

  // 4. Offer Duration (Days)
  const [durationOption, setDurationOption] = useState<string>(
    initialProduct?.offerDurationDays 
      ? String(initialProduct.offerDurationDays) 
      : (initialProduct?.isOffer === false ? 'unlimited' : '7')
  );

  // 5. Merchant Code (mCode)
  const [mCode, setMCode] = useState<string>(
    initialProduct?.mCode || activeMerchant?.mCode || '1'
  );

  // 6. Cost Price
  const [costPrice, setCostPrice] = useState<number | ''>(
    initialProduct?.costPrice || ''
  );

  // 7. Description & Specifications
  const [description, setDescription] = useState(initialProduct?.description || '');

  // 8. Sizes and Colors
  const [sizes, setSizes] = useState(initialProduct?.sizes || '');
  const [colors, setColors] = useState(initialProduct?.colors || '');
  const [quantity, setQuantity] = useState<number>(initialProduct?.quantity || 12);

  // Additional Meta
  const [merchantName, setMerchantName] = useState(
    initialProduct?.merchantName || activeMerchant?.name || 'عتق أونلاين (1)'
  );
  const [merchantPhone, setMerchantPhone] = useState(
    initialProduct?.merchantPhone && !isDummyPhone(initialProduct.merchantPhone)
      ? sanitizeWhatsAppPhone(initialProduct.merchantPhone)
      : activeMerchant?.phone && !isDummyPhone(activeMerchant.phone)
        ? sanitizeWhatsAppPhone(activeMerchant.phone)
        : ''
  );
  const [merchantLocation, setMerchantLocation] = useState(
    initialProduct?.merchantLocation || activeMerchant?.location || 'عتق - الشارع العام'
  );

  // UI States
  const [compressingIndex, setCompressingIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishStepText, setPublishStepText] = useState('');

  // Auto calculate suggested customer price based on cost & margin in background
  const numCost = Number(costPrice) || 0;

  // Handle Image Upload for a specific slot with automatic 800px & 70% compression (webp/jpeg)
  const handleUploadSlot = async (index: number, file: File) => {
    try {
      setCompressingIndex(index);
      setErrorMsg('');
      // Ultra-fast non-blocking direct canvas compression: max 800px, quality 0.7 (70%), webp/jpeg
      const compressed = await compressAndOptimizeImage(file, 800, 800, 0.7);
      
      setImages((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          url: compressed.full,
          thumbnail: compressed.thumbnail,
          blob: compressed.blob,
          stats: {
            originalSizeFormatted: compressed.originalSizeFormatted,
            compressedSizeFormatted: compressed.compressedSizeFormatted,
            savingsPercent: compressed.savingsPercent,
            width: compressed.width,
            height: compressed.height,
            mimeType: compressed.mimeType
          }
        };
        return next;
      });
    } catch (err) {
      console.error('Failed to compress image:', err);
      setErrorMsg(`فشل في معالجة وضغط الصورة رقم ${index + 1}. يرجى اختيار صورة أخرى.`);
    } finally {
      setCompressingIndex(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        url: '',
        thumbnail: '',
        blob: undefined,
        stats: undefined
      };
      return next;
    });
  };

  // Submit and Launch 8-Step Product with Instant Ultra-Fast Publishing (< 1-2s)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const primaryImg = images[0].url.trim();
    if (!primaryImg) {
      setErrorMsg('الخطوة 1: يرجى إضافة الصورة الأساسية / المظهرية للمنتج على الأقل.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('الخطوة 2: يرجى كتابة اسم المنتج التجاري.');
      return;
    }

    if (!costPrice || numCost <= 0) {
      setErrorMsg('الخطوة 6: يرجى إدخال سعر شراء المنتج (التكلفة) بالريال.');
      return;
    }

    // Automated background calculation using approved platform profit margin
    // Supports 0% profit margin explicitly - never adds 20% by default!
    const effectiveMargin = typeof profitMarginPercent === 'number' && !isNaN(profitMarginPercent)
      ? Math.max(0, profitMarginPercent)
      : 0;

    // When margin is 0%, finalCustomerPrice matches numCost exactly (Customer Price = Merchant Price)
    const finalCustomerPrice = calculateCustomerPrice(numCost, effectiveMargin);
    const finalOriginalPrice = effectiveMargin > 0
      ? Math.round(finalCustomerPrice * 1.25)
      : finalCustomerPrice;

    // Determine Expiry Date & Offer Status
    const isUnlimited = durationOption === 'unlimited';
    const days = isUnlimited ? 365 : parseInt(durationOption, 10) || 7;
    const expiryDate = isUnlimited 
      ? undefined 
      : new Date(Date.now() + days * 86400000).toISOString();

    const durationTextMap: Record<string, string> = {
      '1': 'يوم واحد (24 ساعة)',
      '2': 'يومين (48 ساعة)',
      '3': '3 أيام (72 ساعة)',
      '4': '4 أيام (96 ساعة)',
      '5': '5 أيام (120 ساعة)',
      '6': '6 أيام (144 ساعة)',
      '7': 'أسبوع كامل (168 ساعة)',
      'unlimited': 'عرض مستمر'
    };

    const productId = initialProduct?.id || `prod-${Date.now()}`;

    // Instant Publishing Transition
    setIsPublishing(true);
    setPublishProgress(60);
    setPublishStepText('جاري الحفظ والتثبيت الفوري...');

    try {
      // 1. Parallel ultra-fast upload (Images are ALREADY pre-compressed to 800px on selection)
      // Fast 2s timeout watchdog per slot ensures zero stalling or hanging
      const uploadTasks = images.map(async (slot, index) => {
        if (!slot.url || !slot.url.trim()) return '';
        if (slot.url.startsWith('http://') || slot.url.startsWith('https://')) return slot.url.trim();

        try {
          const fileExt = slot.stats?.mimeType === 'image/jpeg' ? 'jpg' : 'webp';
          const path = `products/${productId}/${index === 0 ? 'main' : `extra_${index}`}_${Date.now()}.${fileExt}`;
          return await uploadImageToFirebaseStorage(
            slot.blob || slot.url,
            path,
            { timeoutMs: 2000 }
          );
        } catch {
          // Instant safe fallback to the pre-compressed lightweight Data URL (< 50KB)
          return slot.url.trim();
        }
      });

      const uploadResults = await Promise.all(uploadTasks);
      const uploadedPrimary = uploadResults[0] || primaryImg;
      const uploadedExtras = uploadResults.slice(1).filter((u) => Boolean(u && u.trim()));

      const productPayload: Product = {
        id: productId,
        name: name.trim(),
        category,
        description: description.trim() || `عرض مميز متوفر لدى ${merchantName} في مدينة عتق.`,
        originalPrice: finalOriginalPrice,
        discountPrice: finalCustomerPrice,
        customerPrice: finalCustomerPrice,
        appliedMarginPercent: effectiveMargin,
        costPrice: numCost,
        quantity: Number(quantity) || 1,
        image: uploadedPrimary,
        thumbnail: images[0].thumbnail || uploadedPrimary,
        additionalImages: uploadedExtras,
        mCode: mCode.trim() || activeMerchant?.mCode || '1',
        sizes: sizes.trim() || undefined,
        colors: colors.trim() || undefined,
        merchantId: activeMerchant?.id || initialProduct?.merchantId || 'merch-staff-1',
        merchantName: merchantName.trim() || 'عتق أونلاين (1)',
        merchantPhone: merchantPhone.trim() && !isDummyPhone(merchantPhone.trim())
          ? sanitizeWhatsAppPhone(merchantPhone.trim())
          : (activeMerchant?.phone && !isDummyPhone(activeMerchant.phone) ? sanitizeWhatsAppPhone(activeMerchant.phone) : ''),
        merchantLocation: merchantLocation.trim() || 'عتق - الشارع العام',
        isOffer: !isUnlimited,
        offerEndsAt: expiryDate,
        offerDurationDays: days,
        offerDurationText: durationTextMap[durationOption] || `${days} أيام`,
        createdAt: initialProduct?.createdAt || Date.now(),
        status: Number(quantity) > 0 ? 'active' : 'out_of_stock'
      };

      setPublishProgress(100);
      setPublishStepText('تم النشر بنجاح! 🛍️⚡');

      // Immediate UI close and save: zero blocking delay
      onSave(productPayload);
      onClose();
    } catch (publishErr: unknown) {
      console.error('Error during product publishing:', publishErr);
      setIsPublishing(false);
      const errorMessage = publishErr instanceof Error ? publishErr.message : UPLOAD_TIMEOUT_ERROR_MESSAGE;
      setErrorMsg(errorMessage || UPLOAD_TIMEOUT_ERROR_MESSAGE);
    }
  };

  return (
    <div 
      id="product-form-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div 
        id="product-form-container"
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh] relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-900/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">
                {initialProduct ? 'تعديل وتحديث العرض التجاري' : 'إضافة ونشر عرض تجاري جديد (8 خطوات)'}
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                بوابة التاجر والمندوب المعتمد - عتق أونلاين
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ═════════ STEP 1: PHOTOS (UP TO 4 INDEPENDENT SLOTS) ═════════ */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <label className="text-sm font-black text-slate-900">
                  صور المنتج (ضغط وتصغير تلقائي 800px)
                </label>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>أقصى أبعاد 800px | جودة 70% | تحويل فوري webp/jpeg</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {images.map((slot, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-between min-h-[175px] relative ${
                    slot.url 
                      ? 'bg-white border-emerald-200 shadow-xs ring-1 ring-emerald-100' 
                      : 'bg-white/80 border-dashed border-slate-300 hover:border-rose-400'
                  }`}
                >
                  <div className="text-center w-full">
                    <span className="text-[11px] font-black text-slate-800 block truncate">
                      {idx === 0 ? '⭐️ الصورة الأساسية' : `صورة ${idx + 1}`}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate mb-1">
                      {slot.title}
                    </span>
                  </div>

                  {slot.url ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                        <FastImage
                          src={slot.url}
                          thumbnail={slot.thumbnail}
                          alt={`صورة ${idx + 1}`}
                          aspectRatio="aspect-square"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="p-1.5 bg-white text-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 shadow-sm" title="استبدال">
                            <Upload className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadSlot(idx, f);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
                            title="حذف"
                            aria-label="حذف الصورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Compression Savings & Dimensions Badge */}
                      {slot.stats ? (
                        <div className="w-full mt-1.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-[9px] text-emerald-800 font-bold">
                          <span className="truncate">⚡ {slot.stats.compressedSizeFormatted}</span>
                          <span className="text-emerald-600 shrink-0 font-black">وفر {slot.stats.savingsPercent}%</span>
                        </div>
                      ) : (
                        <div className="w-full mt-1.5 px-1.5 py-0.5 bg-emerald-50/60 border border-emerald-100 rounded-md text-center text-[9px] text-emerald-700 font-bold">
                          <span>⚡ محسنة ومضغوطة (800px)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="w-full h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50 hover:bg-rose-50/40 cursor-pointer flex flex-col items-center justify-center p-2 transition-colors group">
                      {compressingIndex === idx ? (
                        <div className="flex flex-col items-center gap-1.5 text-rose-600 text-[10px] font-bold text-center px-1">
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                          <span>جاري تصغير الأبعاد (800px) والضغط الفوري...</span>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-rose-600 transition-colors mb-1" />
                          <span className="text-[10px] font-bold text-slate-600 group-hover:text-rose-600">
                            {idx === 0 ? 'رفع صورة الكاميرا' : '+ إضافة لون'}
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium">800px & 70% فوري</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={compressingIndex !== null}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadSlot(idx, f);
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═════════ STEP 2: PRODUCT TITLE ═════════ */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                2
              </span>
              <label className="text-sm font-black text-slate-900">
                اسم المنتج التجاري <span className="text-rose-500">*</span>
              </label>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: فستان مخملي مطرز فاخر أو طقم أواني جرانيت تركي"
              className="w-full text-sm font-bold p-3.5 rounded-2xl border border-slate-300 bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none transition-all"
            />
          </div>

          {/* ═════════ STEP 3 & STEP 4: CATEGORY & OFFER DURATION ═════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* STEP 3: CATEGORY */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <label className="text-sm font-black text-slate-900">
                  قسم العرض بالمتجر
                </label>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs sm:text-sm font-bold p-3.5 rounded-2xl border border-slate-300 bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none cursor-pointer"
              >
                {formCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* STEP 4: DURATION */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  4
                </span>
                <label className="text-sm font-black text-slate-900">
                  مدة بقاء العرض في التطبيق
                </label>
              </div>
              <select
                value={durationOption}
                onChange={(e) => setDurationOption(e.target.value)}
                className="w-full text-xs sm:text-sm font-bold p-3.5 rounded-2xl border border-slate-300 bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none cursor-pointer"
              >
                <option value="1">يوم واحد (24 ساعة) ⏳</option>
                <option value="2">يومين (48 ساعة)</option>
                <option value="3">3 أيام (72 ساعة) ⭐ الأكثر طلباً</option>
                <option value="4">4 أيام (96 ساعة)</option>
                <option value="5">5 أيام (120 ساعة)</option>
                <option value="6">6 أيام (144 ساعة)</option>
                <option value="7">أسبوع كامل (168 ساعة)</option>
                <option value="unlimited">عرض مستمر (بدون انتهاء / دائم) ♾️</option>
              </select>
            </div>
          </div>

          {/* ═════════ STEP 5 & STEP 6: MCODE & COST PRICING WITH MARGIN ═════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* STEP 5: MCODE */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  5
                </span>
                <label className="text-sm font-black text-slate-900">
                  كود التاجر الخاص بك (mCode)
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={mCode}
                  onChange={(e) => setMCode(e.target.value)}
                  placeholder="مثال: 1 أو M-101"
                  className="w-full text-sm font-black p-3.5 pr-10 rounded-2xl border border-slate-300 bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none text-emerald-800"
                />
                <Hash className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                يربط هذا العرض تلقائياً بحسابك كمندوب معتمد.
              </p>
            </div>

            {/* STEP 6: COST PRICE */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  6
                </span>
                <label className="text-sm font-black text-slate-900">
                  سعر شراء المنتج (التكلفة) ريال يمني <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="أدخل سعر التكلفة بالريال اليمني"
                  className="w-full text-base font-black p-3.5 pr-10 rounded-2xl border border-slate-300 bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium pt-1 px-1 gap-1">
                <span>
                  هامش الربح المعتمد:{' '}
                  <strong className="text-slate-800 font-bold">
                    {typeof profitMarginPercent === 'number' && !isNaN(profitMarginPercent) ? profitMarginPercent : 0}%
                  </strong>
                </span>
                {numCost > 0 && (
                  <span className="text-emerald-700 font-bold">
                    سعر العميل النهائي:{' '}
                    {calculateCustomerPrice(
                      numCost,
                      typeof profitMarginPercent === 'number' && !isNaN(profitMarginPercent) ? profitMarginPercent : 0
                    ).toLocaleString('ar-YE')}{' '}
                    ريال
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ═════════ STEP 7: DESCRIPTION & SPECIFICATIONS ═════════ */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                7
              </span>
              <label className="text-sm font-black text-slate-900">
                وصف مميزات ومواصفات المنتج
              </label>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب مواصفات الخامة، المميزات، الضمان، وطريقة الاستخدام بالتفصيل لتشجيع الزبون على الطلب..."
              className="w-full text-xs sm:text-sm font-medium p-3.5 rounded-2xl border border-slate-300 bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none resize-y"
            />
          </div>

          {/* ═════════ STEP 8: SIZES, COLORS & QUANTITY ═════════ */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                8
              </span>
              <label className="text-sm font-black text-slate-900">
                المقاسات والألوان المتوفرة في المخزن
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  المقاسات المتاحة:
                </label>
                <input
                  type="text"
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  placeholder="مثال: XL, L, M, S أو قياس موحد"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  الألوان المتوفرة:
                </label>
                <input
                  type="text"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  placeholder="مثال: أسود، بيج، زيتي، كحلي"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  الكمية بالمخزن:
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white text-center"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="product-publish-submit-btn"
              type="submit"
              disabled={isPublishing}
              className="w-full bg-linear-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-rose-600/30 text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <Rocket className="w-5 h-5" />
              <span>نشر وتثبيت العرض الآن في المتجر ✅</span>
            </button>
          </div>
        </form>

        {/* ═════════ PUBLISHING PROGRESS OVERLAY ═════════ */}
        {isPublishing && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center mb-4 animate-bounce">
              <Rocket className="w-8 h-8 text-rose-400" />
            </div>

            <h3 className="text-lg font-black tracking-wide mb-1">
              جاري نشر العرض الجديد... 🚀
            </h3>
            <p className="text-xs text-slate-300 font-medium mb-6">
              {publishStepText}
            </p>

            <div className="w-full max-w-xs bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5 mb-2">
              <div 
                className="bg-linear-to-r from-rose-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${publishProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-400">{publishProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
