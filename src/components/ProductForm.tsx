import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, X, Tag, Calendar, DollarSign, Type, FileText, Palette, Trash2 } from 'lucide-react';
import { Product, Category } from '../types';

interface ProductFormProps {
  onPublish: (data: Omit<Product, 'id' | 'status'>) => Promise<void>;
  editingProduct: Product | null;
  onCancelEdit: () => void;
  margin: number;       // e.g. 1.50
  marginRaw: number;    // e.g. 50%
  categories: Category[];
}

const DURATIONS = [
  { value: '1', label: '⏱️ يوم واحد (24 ساعة)' },
  { value: '2', label: '⏱️ يومين (48 ساعة)' },
  { value: '3', label: '⏱️ 3 أيام (72 ساعة)' },
  { value: '4', label: '⏱️ 4 أيام (96 ساعة)' },
  { value: '5', label: '⏱️ 5 أيام (120 ساعة)' },
  { value: '6', label: '⏱️ 6 أيام (144 ساعة)' },
  { value: '7', label: '⏱️ أسبوع كامل (168 ساعة)' },
  { value: '999', label: '♾️ عرض مستمر' },
];

export default function ProductForm({ onPublish, editingProduct, onCancelEdit, margin, marginRaw, categories }: ProductFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('1');
  const [costPrice, setCostPrice] = useState('');
  const [mCode, setMCode] = useState('');
  const [desc, setDesc] = useState('');
  const [sizes, setSizes] = useState('');
  const [imgs, setImgs] = useState<(string | null)[]>([null, null, null, null]);
  const [isUploading, setIsUploading] = useState<boolean[]>([false, false, false, false]);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File input refs
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Set default category when categories list loads
  useEffect(() => {
    if (!category && categories && categories.length > 0) {
      setCategory(categories[0].value);
    }
  }, [categories, category]);

  // Sync edit product
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || '');
      setCategory(editingProduct.category || (categories[0]?.value || ''));
      setMCode(editingProduct.mCode || '');
      setDesc(editingProduct.about || '');
      setSizes(editingProduct.sizes || '');
      setCostPrice(editingProduct.costPrice ? editingProduct.costPrice.toString() : '');

      // Parse expiry to duration
      if (editingProduct.expiry > 9000000000000) {
        setDuration('999');
      } else {
        const diffMs = editingProduct.expiry - Date.now();
        const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
        const cleanDays = Math.max(1, Math.min(7, days)).toString();
        setDuration(cleanDays);
      }

      // Fill images
      const initialImgs: (string | null)[] = [null, null, null, null];
      if (editingProduct.imgs) {
        editingProduct.imgs.forEach((img, i) => {
          if (i < 4) initialImgs[i] = img;
        });
      }
      setImgs(initialImgs);
      setErrorText('');
    } else {
      resetForm();
    }
  }, [editingProduct]);

  const resetForm = () => {
    setName('');
    setCategory('ملابس نسائية');
    setDuration('1');
    setCostPrice('');
    setMCode('');
    setDesc('');
    setSizes('');
    setImgs([null, null, null, null]);
    setErrorText('');
    setStatusText('');
  };

  const getDurationText = (daysStr: string) => {
    const d = parseInt(daysStr);
    if (d === 1) return 'يوم واحد';
    if (d === 2) return 'يومين';
    if (d === 3) return '3 أيام';
    if (d === 4) return '4 أيام';
    if (d === 5) return '5 أيام';
    if (d === 6) return '6 أيام';
    if (d === 7) return 'أسبوع';
    if (d === 999) return '♾️ عرض مستمر';
    return 'مؤقت لفترة محدودة';
  };

  const triggerUploadInput = (index: number) => {
    fileRefs[index].current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 2 * 1024 * 1024) {
      setErrorText('حجم الصورة يجب أن يكون أقل من 2 ميغابايت (2MB) ⚠️');
      return;
    }

    const updatedUploading = [...isUploading];
    updatedUploading[index] = true;
    setIsUploading(updatedUploading);

    try {
      const compressedBase64 = await compressImageFile(file);
      const updatedImgs = [...imgs];
      updatedImgs[index] = compressedBase64;
      setImgs(updatedImgs);
      setErrorText('');
    } catch (err) {
      console.error(err);
      setErrorText('حدث خطأ أثناء معالجة ضغط الصورة ❌');
    } finally {
      const finishedUploading = [...isUploading];
      finishedUploading[index] = false;
      setIsUploading(finishedUploading);
    }
  };

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to create canvas context'));
            return;
          }

          const MAX_WIDTH = 480;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.5);
          resolve(base64);
        };
        img.onerror = () => reject(new Error('Image load error'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File reader error'));
      reader.readAsDataURL(file);
    });
  };

  const clearImageSlot = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updatedImgs = [...imgs];
    updatedImgs[index] = null;
    setImgs(updatedImgs);
    if (fileRefs[index].current) {
      fileRefs[index].current.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setStatusText('');

    const parsedCost = parseFloat(costPrice);
    const finalImages = imgs.filter((img) => img !== null) as string[];

    if (!name.trim()) {
      setErrorText('يرجى تحديد اسم المنتج أو لوحة العرض ⚠️');
      return;
    }
    if (finalImages.length === 0) {
      setErrorText('يرجى رفع الصورة الأساسية على الأقل للمنتج (مطلوبة) 📸');
      return;
    }
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setErrorText('يرجى تحديد سعر تكلفة المنتج الأصلي بشكل صحيح 💰');
      return;
    }

    setIsSubmitting(true);
    setStatusText(editingProduct ? 'جاري حفظ التعديلات... ⚙️' : 'جاري نشر العرض الجديد... 🚀');

    try {
      const days = parseInt(duration);
      const calculatedExpiry = days === 999 
        ? 9999999999999 
        : Date.now() + days * 24 * 60 * 60 * 1000;
      
      const calculatedPrice = Math.round(parsedCost * margin);

      const productPayload = {
        name: name.trim(),
        category,
        mCode: mCode.trim(),
        costPrice: parsedCost,
        price: calculatedPrice,
        about: desc.trim(),
        sizes: sizes.trim(),
        imgs: finalImages,
        expiry: calculatedExpiry,
        durationText: getDurationText(duration),
      };

      await onPublish(productPayload);
      resetForm();
    } catch (err: any) {
      console.error(err);
      setErrorText(err?.message || 'حصل خطأ ما أثناء الاتصال بقاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCost = parseFloat(costPrice) || 0;
  const estimatedSellingPrice = Math.round(currentCost * margin);

  return (
    <div id="product-form-card" className="bg-white border border-gray-100 rounded-3xl shadow-xl shadow-rose-950/[0.02] p-6 text-right" dir="rtl">
      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-6">
        <h3 className="text-xl font-bold text-[#b7336a] flex items-center gap-2">
          {editingProduct ? '✏️ تعديل وتحديث بيانات العرض الساري' : '✨ إضافة ونشر عرض تجاري جديد'}
        </h3>
        {editingProduct && (
          <button
            onClick={onCancelEdit}
            className="text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 px-3 py-1.5 rounded-xl font-bold transition-all"
          >
            إلغاء التعديل ✖
          </button>
        )}
      </div>

      {/* Informational Header Tip */}
      <div className="bg-gray-50 border border-gray-100 text-gray-700 p-4 rounded-2xl mb-6 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#b7336a] rounded-full" />
          <span className="font-semibold">
            لوحة نشر عروض التجار والمندوبين المعتمدين في عتق أونلاين
          </span>
        </div>
        <span className="text-xs text-gray-400 font-medium">مزامنة تامة حية</span>
      </div>

      <form onSubmit={handleFormSubmit} action="javascript:void(0);" className="space-y-6">
        {/* Step 1: Photos uploading slots */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            1. صور المنتج المتوفرة وخيارات الألوان والقياسات (حتى 4 صور مستقلة):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const currentImg = imgs[idx];
              const slotLabels = [
                'الصورة الأساسية (مطلوبة)',
                'اللون الثاني (تفاصيل)',
                'اللون الثالث (تفاصيل)',
                'اللون الرابع (تفاصيل)',
              ];
              return (
                <div
                  key={`image-slot-${idx}`}
                  onClick={() => triggerUploadInput(idx)}
                  className={`relative border-2 border-dashed rounded-2xl h-28 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all text-center p-2 group ${
                    currentImg
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : 'border-rose-100 hover:border-[#b7336a] bg-rose-50/10 hover:bg-rose-50/30'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileRefs[idx]}
                    onChange={(e) => handleFileChange(e, idx)}
                    accept="image/*"
                    className="hidden"
                  />

                  {currentImg ? (
                    <>
                      <img src={currentImg} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => clearImageSlot(e, idx)}
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-10"
                        title="حذف الصورة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : isUploading[idx] ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <RefreshCw className="w-5 h-5 text-[#b7336a] animate-spin" />
                      <span className="text-[10px] text-gray-400 font-bold">جاري الضغط...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center text-[#b7336a] shadow-sm shadow-rose-900/5 group-hover:scale-110 duration-200">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold leading-tight px-1">
                        {slotLabels[idx]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Type className="w-4 h-4 text-[#b7336a]" />
              2. اسم المنتج التجاري:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلا: فستان صيفي تركي ناعم"
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#b7336a]" />
              3. قسم العرض بالمتجر:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#b7336a]" />
              4. مدة بقاء العرض في التطبيق:
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
            >
              {DURATIONS.map((dur) => (
                <option key={dur.value} value={dur.value}>
                  {dur.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#b7336a]" />
              5. كود التاجر الخاص بك (mCode):
            </label>
            <input
              type="text"
              value={mCode}
              onChange={(e) => setMCode(e.target.value)}
              placeholder="مثلا: AT-490"
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#b7336a]" />
              6. سعر شراء المنتج (التكلفة) ريال:
            </label>
            <input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="مثلا: 10000"
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-sans font-bold"
            />
          </div>

          {/* Pricing Info Helper Box for Merchant */}
          <div className="bg-rose-50/10 border border-dashed border-rose-100 p-4 rounded-xl flex flex-col justify-center text-sm">
            <span className="text-rose-900 font-bold mb-1">💡 تنبيه إرشادي هام للتاجر:</span>
            <span className="text-xs text-gray-500 font-medium leading-relaxed">
              يرجى إدخال سعر التكلفة الأصلي للسلعة بدقة. سيقوم نظام عتق أونلاين بجدولة العرض وعرضه بالتسعيرة النهائية المتوافقة تلقائياً دون الحاجة لأي حسابات إضافية من طرفك.
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#b7336a]" />
            7. وصف مميزات و مواصفات المنتج:
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="مثلا: طقم تركي أصلي فاخر مقاوم للحرارة وسهل الغسل"
            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#b7336a]" />
            8. المقاسات والألوان المتوفرة في المخزن:
          </label>
          <input
            type="text"
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            placeholder="مثلا: متوفر بمقاسات M, L, XL ألوان أحمر، أسود، وخوخي"
            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#b7336a]/15 focus:border-[#b7336a] transition-all font-semibold"
          />
        </div>

        {errorText && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2"
          >
            <span>🚨 {errorText}</span>
          </motion.div>
        )}

        {statusText && (
          <div className="text-[#b7336a] text-center text-sm font-bold animate-pulse">
            {statusText}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-[#b7336a] text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-md hover:bg-[#a02c5c] focus:outline-none focus:ring-4 focus:ring-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-rose-900/10 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {editingProduct ? 'حفظ وحفظ التعديلات السريعة 💾' : 'نشر وتثبيت العرض الآن في المتجر ✅'}
          </button>

          {editingProduct && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all focus:outline-none active:scale-[0.99]"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      </form>

      {/* Full screen submitting modal overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-rose-950/45 backdrop-blur-md flex flex-col items-center justify-center z-[999] p-4 text-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white max-w-sm w-full p-8 rounded-3xl shadow-2xl border border-rose-100 flex flex-col items-center gap-4"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-rose-100 border-t-[#b7336a] rounded-full animate-spin" />
                <Camera className="w-6 h-6 text-[#b7336a] absolute animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-gray-900 font-sans">
                  {editingProduct ? 'جاري حفظ التعديلات... ⚙️' : 'جاري نشر العرض الجديد... 🚀'}
                </h4>
                <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                  يرجى الانتظار ولا تغلق الصفحة. جاري معالجة العرض، وضغط الصور المرفقة سحابياً، وتثبيتها بشكل آمن في المتجر... ✨
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
