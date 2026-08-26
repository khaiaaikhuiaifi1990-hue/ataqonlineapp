import React, { useEffect, useState } from 'react';
import { 
  X, 
  MessageCircle, 
  MapPin, 
  Clock, 
  Share2, 
  Check, 
  ShieldCheck, 
  ShoppingBag, 
  Sparkles,
  Store,
  Tag,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  Palette,
  Ruler,
  Info,
  Camera
} from 'lucide-react';
import { Product } from '../types';
import { FastImage } from './FastImage';

interface OfferDetailsModalProps {
  product: Product | null;
  currency?: string;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
}

export const OfferDetailsModal: React.FC<OfferDetailsModalProps> = ({
  product,
  currency = 'ريال يمني',
  onClose,
  onAddToCart
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSharingImage, setIsSharingImage] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedImg(product.image);
      setZoomLevel(1);
    }
  }, [product]);

  // Hash-based navigation for Fullscreen Image viewer
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash;
      // If hash transitioned back from #view-image to #product, close fullscreen image only
      if (currentHash === '#product') {
        setIsFullscreenImageOpen(false);
        setZoomLevel(1);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleOpenFullscreenImage = () => {
    setIsFullscreenImageOpen(true);
    window.location.hash = 'view-image';
  };

  const closeFullscreenImage = () => {
    setIsFullscreenImageOpen(false);
    setZoomLevel(1);
    if (window.location.hash === '#view-image') {
      window.history.back();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreenImageOpen) {
          closeFullscreenImage();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFullscreenImageOpen]);

  if (!product) return null;

  const allImages = [product.image, ...(product.additionalImages || [])].filter(Boolean);
  const currentImageIndex = allImages.indexOf(selectedImg || product.image);

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    const nextIdx = (currentImageIndex + 1) % allImages.length;
    setSelectedImg(allImages[nextIdx]);
    setZoomLevel(1);
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    const prevIdx = (currentImageIndex - 1 + allImages.length) % allImages.length;
    setSelectedImg(allImages[prevIdx]);
    setZoomLevel(1);
  };

  const toggleZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(prev => (prev === 1 ? 1.75 : prev === 1.75 ? 2.5 : 1));
  };

  const hasDiscount = product.discountPrice && product.discountPrice < product.originalPrice;
  const currentPrice = hasDiscount ? product.discountPrice! : product.originalPrice;
  const savings = hasDiscount ? product.originalPrice - product.discountPrice! : 0;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice - product.discountPrice!) / product.originalPrice) * 100) 
    : 0;

  // Format offer duration to match merchant dashboard entry format (e.g. 3 أيام (72 ساعة))
  const getOfferDurationDisplay = () => {
    if (product.offerDurationText) {
      return product.offerDurationText;
    }
    const days = product.offerDurationDays;
    if (days === 1) return 'يوم واحد (24 ساعة)';
    if (days === 2) return 'يومين (48 ساعة)';
    if (days === 3) return '3 أيام (72 ساعة)';
    if (days === 4) return '4 أيام (96 ساعة)';
    if (days === 5) return '5 أيام (120 ساعة)';
    if (days === 6) return '6 أيام (144 ساعة)';
    if (days === 7) return 'أسبوع كامل (168 ساعة)';
    if (days && days > 7) return `${days} أيام (${days * 24} ساعة)`;

    if (product.offerEndsAt) {
      const targetDate = new Date(product.offerEndsAt).getTime();
      if (!isNaN(targetDate)) {
        const baseTime = product.createdAt ? new Date(product.createdAt).getTime() : Date.now();
        const diffMs = targetDate - baseTime;
        const approxDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        if (approxDays === 1) return 'يوم واحد (24 ساعة)';
        if (approxDays === 2) return 'يومين (48 ساعة)';
        if (approxDays === 3) return '3 أيام (72 ساعة)';
        if (approxDays === 4) return '4 أيام (96 ساعة)';
        if (approxDays === 5) return '5 أيام (120 ساعة)';
        if (approxDays === 6) return '6 أيام (144 ساعة)';
        if (approxDays === 7) return 'أسبوع كامل (168 ساعة)';
        if (approxDays > 7) return `${approxDays} أيام (${approxDays * 24} ساعة)`;
      }
    }

    return product.isOffer ? '3 أيام (72 ساعة)' : 'عرض مستمر (دائم)';
  };

  const offerDurationDisplay = getOfferDurationDisplay();

  // Generate Direct WhatsApp Order Link for Merchant
  const getWhatsAppOrderUrl = () => {
    const cleanPhone = (product.merchantPhone || '967770000001').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله، أود الاستفسار من تطبيق عتق أونلاين:\n\n` +
      `🏷️ المنتج: ${product.name}\n` +
      `💰 السعر: ${currentPrice.toLocaleString('ar-YE')} ${currency}\n` +
      `📍 المتجر: ${product.merchantName}\n\n` +
      `هل المنتج متوفر حالياً لإتمام الطلب والتوصيل؟`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  // Share ONLY the product image file without link or text via WhatsApp / native share
  const handleShareImageOnly = async () => {
    const activeImage = selectedImg || product.image;
    if (!activeImage) return;

    setIsSharingImage(true);

    try {
      let fileToShare: File | null = null;

      if (activeImage.startsWith('data:image/')) {
        const res = await fetch(activeImage);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        fileToShare = new File([blob], `${product.name || 'product'}.${ext}`, { type: blob.type || 'image/jpeg' });
      } else {
        try {
          const res = await fetch(activeImage, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            const ext = blob.type.includes('png') ? 'png' : 'jpg';
            fileToShare = new File([blob], `${product.name || 'product'}.${ext}`, { type: blob.type || 'image/jpeg' });
          }
        } catch {
          // Fallback to canvas
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = activeImage;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
              if (blob) {
                fileToShare = new File([blob], `${product.name || 'product'}.jpg`, { type: 'image/jpeg' });
              }
            }
          } catch {
            // ignore
          }
        }
      }

      if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        // Native share sheet with ONLY the image file - no text, no url
        await navigator.share({
          files: [fileToShare]
        });
        setIsSharingImage(false);
        return;
      }
    } catch {
      // User dismissed or aborted share
      setIsSharingImage(false);
      return;
    }

    // Fallback: download the image
    try {
      const link = document.createElement('a');
      link.href = activeImage;
      link.download = `${product.name || 'product'}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(activeImage, '_blank');
    }
    setIsSharingImage(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} - عتق أونلاين`,
          text: `شاهد هذا العرض المميز على عتق أونلاين: ${product.name} بسعر ${currentPrice} ${currency} فقط!`,
          url: window.location.href
        });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ═══════════════ MAIN DETAILS MODAL ═══════════════ */}
      <div 
        id="offer-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          id="offer-modal-container"
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                <Tag className="w-3 h-3 ml-1" />
                {product.category}
              </span>
              {product.isOffer && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                  <Sparkles className="w-3 h-3 ml-1" />
                  عرض حصري
                </span>
              )}
            </div>
            
            <button
              id="close-offer-modal-btn"
              onClick={onClose}
              aria-label="إغلاق"
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Main Visual Image Gallery with Fullscreen Zoom Trigger */}
            <div className="space-y-3">
              <div 
                onClick={handleOpenFullscreenImage}
                className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-950/5 max-h-80 flex items-center justify-center cursor-zoom-in transition-all"
                title="اضغط لتكبير الصورة ملء الشاشة بجودة عالية"
              >
                <FastImage
                  src={selectedImg || product.image}
                  thumbnail={product.thumbnail}
                  alt={product.name}
                  aspectRatio="aspect-video"
                  className="w-full max-h-80 object-contain group-hover:scale-102 transition-transform duration-300"
                />

                {/* Floating Fullscreen Hint Badge */}
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md border border-white/20 opacity-90 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>تكبير الصورة ملء الشاشة</span>
                </div>
              </div>

              {/* Thumbnails if extra images exist */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImg(img)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        (selectedImg || product.image) === img ? 'border-rose-600 shadow-md ring-2 ring-rose-200' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Pricing Block */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug mb-2.5">
                {product.name}
              </h2>

              <div className="flex flex-wrap items-baseline gap-3 p-4 bg-rose-50/70 rounded-2xl border border-rose-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600">
                    {currentPrice.toLocaleString('ar-YE')}
                  </span>
                  <span className="text-sm font-black text-rose-700">{currency}</span>
                </div>
              </div>
            </div>

            {/* Offer Expiry / Stock Alerts */}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {product.mCode && (
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                  <Tag className="w-3.5 h-3.5 text-slate-600" />
                  <span>كود المندوب: {product.mCode}</span>
                </div>
              )}
              {product.isOffer && offerDurationDisplay && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>مدة العرض: {offerDurationDisplay}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>متوفر وجاهز للتسليم الفوري في عتق</span>
              </div>
            </div>

            {/* Sizes & Colors if available */}
            {(product.sizes || product.colors) && (
              <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {product.sizes && (
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-slate-400" />
                      المقاسات المتوفرة:
                    </span>
                    <span className="font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-block w-full">
                      {product.sizes}
                    </span>
                  </div>
                )}
                {product.colors && (
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      الألوان المتاحة:
                    </span>
                    <span className="font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-block w-full">
                      {product.colors}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Complete Product Description & Specifications */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-rose-600" />
                تفاصيل ومواصفات العرض الكاملة:
              </h3>
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200/90 font-medium">
                {product.description && product.description.trim() ? (
                  product.description
                ) : (
                  <div className="text-slate-400 text-xs italic flex items-center gap-1.5 py-2">
                    <Info className="w-4 h-4" />
                    عرض مميز متاح في عتق أونلاين. تواصل مباشرة مع التاجر لمعرفة أي استفسارات إضافية.
                  </div>
                )}
              </div>
            </div>

            {/* Merchant Info Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{product.merchantName || 'متجر معتمد - عتق'}</h4>
                    <span className="text-xs text-slate-500 font-medium">تاجر موثق في منصة عتق أونلاين</span>
                  </div>
                </div>
              </div>

              {product.merchantLocation && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>الموقع: {product.merchantLocation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2">
            {/* Direct WhatsApp Instant Order Button */}
            <a
              id="whatsapp-order-link"
              href={getWhatsAppOrderUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-3 sm:px-4 rounded-2xl shadow-md transition-all active:scale-[0.98] text-xs sm:text-sm"
            >
              <MessageCircle className="w-5 h-5 fill-current shrink-0" />
              <span>طلب فوري عبر واتساب</span>
            </a>

            {/* Share Product Image Only Button */}
            <button
              id="share-product-image-btn"
              type="button"
              onClick={handleShareImageOnly}
              disabled={isSharingImage}
              title="مشاركة صورة المنتج فقط لأي رقم عبر واتساب"
              className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-3.5 px-3 sm:px-4 rounded-2xl border border-emerald-200 shadow-xs transition-all active:scale-[0.98] text-xs sm:text-sm cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="whitespace-nowrap">مشاركة الصورة</span>
            </button>

            {/* Add to Cart / Order List */}
            {onAddToCart && (
              <button
                id="add-to-cart-modal-btn"
                type="button"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                title="إضافة للسلة"
                className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer shrink-0"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
            )}

            {/* General Share Button */}
            <button
              id="share-offer-btn"
              type="button"
              onClick={handleShare}
              title="مشاركة رابط العرض"
              className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════ FULLSCREEN HIGH-RESOLUTION LIGHTBOX ═══════════════ */}
      {isFullscreenImageOpen && (
        <div 
          id="fullscreen-image-viewer"
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between animate-fadeIn select-none"
          onClick={() => {
            closeFullscreenImage();
          }}
        >
          {/* Top Bar Controls */}
          <div 
            className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base line-clamp-1">{product.name}</h3>
              <p className="text-xs text-white/70">
                صورة {currentImageIndex + 1} من {allImages.length} • دقة عالية
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Share Image Only */}
              <button
                type="button"
                onClick={handleShareImageOnly}
                disabled={isSharingImage}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                title="مشاركة صورة هذا العرض فقط بدون نصوص أو روابط"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">مشاركة الصورة</span>
              </button>

              {/* Zoom In/Out Toggle */}
              <button
                type="button"
                onClick={toggleZoom}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={zoomLevel > 1 ? 'إعادة ضبط الحجم' : 'تكبير التفاصيل'}
              >
                {zoomLevel > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  closeFullscreenImage();
                }}
                className="p-2.5 rounded-full bg-white/20 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                title="إغلاق ملء الشاشة"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Central High-Resolution Zoomable Image Display */}
          <div 
            className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-auto relative cursor-grab active:cursor-grabbing"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeFullscreenImage();
              }
            }}
          >
            {/* Previous Image Button */}
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-lg z-10 transition-all active:scale-90 cursor-pointer"
                title="الصورة السابقة"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* High-Resolution Image Element */}
            <img
              src={selectedImg || product.image}
              alt={product.name}
              decoding="async"
              onClick={toggleZoom}
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)'
              }}
              className="max-h-[82vh] max-w-[94vw] object-contain rounded-lg shadow-2xl cursor-pointer select-none"
            />

            {/* Next Image Button */}
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-lg z-10 transition-all active:scale-90 cursor-pointer"
                title="الصورة التالية"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails & Hint */}
          <div 
            className="p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {allImages.length > 1 ? (
              <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2 py-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImg(img);
                      setZoomLevel(1);
                    }}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      (selectedImg || product.image) === img ? 'border-rose-500 scale-105 ring-2 ring-rose-400' : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-white/60 text-xs">اضغط على الصورة أو زر التكبير للتكبير والتصغير</span>
            )}
          </div>
        </div>
      )}
    </>
  );
};

