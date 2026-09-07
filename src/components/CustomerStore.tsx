import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Flame, 
  SlidersHorizontal, 
  Store, 
  ShoppingBag, 
  Check, 
  MapPin, 
  RefreshCw,
  Phone,
  Crown,
  ShieldCheck,
  Lock,
  Star,
  MessageCircle,
  Tag,
  Filter,
  Download,
  Smartphone,
  Share2,
  X
} from 'lucide-react';
import { Product, StoreCategory, CartItem, PlatformSettings, Merchant } from '../types';
import { ProductCard } from './ProductCard';
import { OfferDetailsModal } from './OfferDetailsModal';
import { CartModal } from './CartModal';
import { ProductSkeletonGrid } from './ProductSkeletonGrid';
import { getNextSupportPhone } from '../utils/supportRouter';
import { isProductExpired } from '../firebase';
import { 
  triggerPwaInstallPrompt, 
  trackAppInstall, 
  isPwaInstalled 
} from '../utils/userTrackingService';

interface CustomerStoreProps {
  products: Product[];
  merchants: Merchant[];
  settings: PlatformSettings;
  cartItems: CartItem[];
  isInitialLoading?: boolean;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onOpenMerchantLogin: () => void;
  onOpenOwnerLogin: () => void;
  onOpenAdminPortal: (tab?: 'merchant' | 'owner') => void;
}

const DEFAULT_CATEGORIES: string[] = [
  'الكل',
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
  'عطور وبخور'
];

const ATAQ_LOCATIONS = [
  'كل المواقع في عتق',
  'شارع درهم',
  'الشارع العام',
  'سوق الذهب',
  'مركز المدينة بلازا',
  'سوق الخضار والتمور',
  'جولة الشهداء',
  'مجمع النور'
];

export const CustomerStore: React.FC<CustomerStoreProps> = ({
  products,
  merchants,
  settings,
  cartItems,
  isInitialLoading = false,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onClearCart,
  onOpenMerchantLogin,
  onOpenOwnerLogin,
  onOpenAdminPortal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedLocation, setSelectedLocation] = useState<string>('كل المواقع في عتق');
  const [activeTab, setActiveTab] = useState<'all' | 'offers_only' | 'top_discounts' | 'featured'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSyncingHeader, setIsSyncingHeader] = useState(false);
  const [syncHeaderDone, setSyncHeaderDone] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isPwaInstalledState, setIsPwaInstalledState] = useState(() => isPwaInstalled());
  const [pwaToastMessage, setPwaToastMessage] = useState<string | null>(null);

  const handleInstallPwaClick = async () => {
    const result = await triggerPwaInstallPrompt();
    if (result.outcome === 'accepted') {
      setIsPwaInstalledState(true);
      setPwaToastMessage('🎉 تم تثبيت تطبيق عتق أونلاين بنجاح على شاشتك!');
      setTimeout(() => setPwaToastMessage(null), 3500);
    } else {
      // Open modal with platform specific instructions
      setIsInstallModalOpen(true);
    }
  };

  const handleConfirmManualInstall = async () => {
    await trackAppInstall();
    setIsPwaInstalledState(true);
    setIsInstallModalOpen(false);
    setPwaToastMessage('📲 تم تسجيل تثبيت التطبيق على شاشتك بنجاح!');
    setTimeout(() => setPwaToastMessage(null), 3500);
  };

  // Comprehensive Hash & Deep Linking Navigation System
  useEffect(() => {
    const syncWithHash = () => {
      const rawHash = window.location.hash;
      const cleanHash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;

      if (cleanHash === 'view-image') {
        // Fullscreen image zoom view (product modal remains open underneath)
        return;
      }

      // Deep linking via #product-<id>
      if (cleanHash.startsWith('product-')) {
        const prodId = cleanHash.replace('product-', '');
        const targetProduct = products.find((p) => p.id === prodId);
        if (targetProduct) {
          setSelectedProduct(targetProduct);
          setIsCartOpen(false);
          return;
        }
      }

      // Check query parameter ?productId=...
      if (typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const qProdId = searchParams.get('productId') || searchParams.get('product');
        if (qProdId) {
          const targetProduct = products.find((p) => p.id === qProdId);
          if (targetProduct) {
            setSelectedProduct(targetProduct);
            setIsCartOpen(false);
            return;
          }
        }
      }

      if (cleanHash === 'product') {
        // Product details modal is active
        setIsCartOpen(false);
        return;
      }

      if (cleanHash === 'cart') {
        // Cart modal is active
        setIsCartOpen(true);
        setSelectedProduct(null);
        return;
      }

      // If not modal state, close modals and sync view
      setSelectedProduct(null);
      setIsCartOpen(false);

      if (cleanHash === 'tab-offers') {
        setActiveTab('offers_only');
        setSelectedCategory('الكل');
      } else if (cleanHash === 'tab-discounts') {
        setActiveTab('top_discounts');
        setSelectedCategory('الكل');
      } else if (cleanHash.startsWith('category-')) {
        const catName = decodeURIComponent(cleanHash.replace('category-', ''));
        setSelectedCategory(catName);
        setActiveTab('all');
      } else {
        // Default / Main Store (All / Home)
        setSelectedCategory('الكل');
        setActiveTab('all');
      }
    };

    // Synchronize state on initial load or hash changes
    syncWithHash();

    const handleOpenProductEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId: string }>;
      const targetId = customEvent.detail?.productId;
      if (targetId) {
        const found = products.find((p) => p.id === targetId);
        if (found) {
          setSelectedProduct(found);
          setIsCartOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('hashchange', syncWithHash);
    window.addEventListener('ataq_open_product_details', handleOpenProductEvent);

    return () => {
      window.removeEventListener('hashchange', syncWithHash);
      window.removeEventListener('ataq_open_product_details', handleOpenProductEvent);
    };
  }, [products]);

  const handleSelectTab = (tab: 'all' | 'offers_only' | 'top_discounts') => {
    setActiveTab(tab);
    if (tab === 'offers_only') {
      if (window.location.hash !== '#tab-offers') {
        window.location.hash = 'tab-offers';
      }
    } else if (tab === 'top_discounts') {
      if (window.location.hash !== '#tab-discounts') {
        window.location.hash = 'tab-discounts';
      }
    } else {
      // tab === 'all'
      if (window.location.hash.startsWith('#tab-')) {
        window.history.back();
      } else if (window.location.hash && !window.location.hash.startsWith('#category-')) {
        window.location.hash = '';
      }
    }
  };

  const handleSelectCategory = (cat: string) => {
    if (cat === 'الكل') {
      setSelectedCategory('الكل');
      if (window.location.hash.startsWith('#category-')) {
        window.history.back();
      } else if (window.location.hash && !window.location.hash.startsWith('#tab-')) {
        window.location.hash = '';
      }
    } else {
      setSelectedCategory(cat);
      const targetHash = 'category-' + encodeURIComponent(cat);
      if (window.location.hash !== '#' + targetHash) {
        window.location.hash = targetHash;
      }
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    const targetHash = 'product-' + product.id;
    if (window.location.hash !== '#' + targetHash) {
      window.location.hash = targetHash;
    }
  };

  const handleCloseProductModal = () => {
    setSelectedProduct(null);
    if (window.location.hash.startsWith('#product') || window.location.hash === '#view-image') {
      window.history.back();
    }
  };

  const handleOpenCart = () => {
    setIsCartOpen(true);
    if (window.location.hash !== '#cart') {
      window.location.hash = 'cart';
    }
  };

  const handleCloseCart = () => {
    setIsCartOpen(false);
    if (window.location.hash === '#cart') {
      window.history.back();
    }
  };

  const handleHeaderCloudSync = () => {
    setIsSyncingHeader(true);
    setTimeout(() => {
      setIsSyncingHeader(false);
      setSyncHeaderDone(true);
      setTimeout(() => setSyncHeaderDone(false), 2000);
    }, 800);
  };

  // Dynamic store categories list
  const activeCategories = useMemo(() => {
    const raw = settings.categories && settings.categories.length > 0
      ? settings.categories
      : DEFAULT_CATEGORIES;
    const cleanList = raw.filter((c) => c !== 'الكل' && c !== 'عروض حصرية');
    return ['الكل', 'عروض حصرية', ...Array.from(new Set(cleanList))];
  }, [settings.categories]);

  // Fast Filter
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Exclude hidden, expired, or deleted products
      if (item.status === 'hidden' || item.status === 'expired' || item.status === 'deleted') {
        return false;
      }

      // 2. Client-side Query Filter: Exclude expired offers by comparing expiration date with current time
      if (isProductExpired(item)) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(queryLower);
        const matchesDesc = (item.description || '').toLowerCase().includes(queryLower);
        const matchesMerchant = (item.merchantName || '').toLowerCase().includes(queryLower);
        const matchesCategory = item.category.toLowerCase().includes(queryLower);
        const matchesLocation = (item.merchantLocation || '').toLowerCase().includes(queryLower);
        if (!matchesName && !matchesDesc && !matchesMerchant && !matchesCategory && !matchesLocation) {
          return false;
        }
      }

      // 2. Location Filter
      if (selectedLocation !== 'كل المواقع في عتق') {
        const loc = item.merchantLocation || '';
        if (!loc.includes(selectedLocation)) return false;
      }

      // 3. Category Filter
      if (selectedCategory === 'عروض حصرية') {
        if (!item.isOffer) return false;
      } else if (selectedCategory !== 'الكل') {
        if (item.category !== selectedCategory) return false;
      }

      // 4. Tab Filter
      if (activeTab === 'offers_only' && !item.isOffer) {
        return false;
      }
      if (activeTab === 'top_discounts') {
        if (!item.discountPrice || item.discountPrice >= item.originalPrice) return false;
      }
      if (activeTab === 'featured') {
        if (!item.isFeatured && !item.isOffer) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedLocation, activeTab]);

  const handleQuickWhatsApp = useCallback((product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = (product.merchantPhone || getNextSupportPhone(settings)).replace(/[^0-9]/g, '');
    const currentPrice = product.discountPrice || product.originalPrice;
    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله، أود الاستفسار من تطبيق عتق أونلاين:\n\n` +
      `🏷️ المنتج: ${product.name}\n` +
      `💰 السعر: ${currentPrice} ${settings.currency}\n` +
      `📍 المتجر: ${product.merchantName}\n\n` +
      `هل المنتج متوفر حالياً لإتمام الطلب والتوصيل؟`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  }, [settings]);

  const handleAddProductToCart = (product: Product) => {
    onAddToCart(product);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const totalOffersCount = useMemo(() => {
    return products.filter((p) => p.isOffer && !isProductExpired(p) && p.status !== 'hidden' && p.status !== 'expired' && p.status !== 'deleted').length;
  }, [products]);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 flex flex-col selection:bg-rose-500 selection:text-white pb-24">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>تمت الإضافة إلى سلة الطلبات بنجاح!</span>
        </div>
      )}

      {/* PWA Toast Notification */}
      {pwaToastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300 border border-purple-500/50">
          <Download className="w-5 h-5 text-purple-300 shrink-0" />
          <span>{pwaToastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-2">
            {/* 1. Install App Button (PWA Install Prompt) */}
            <button
              type="button"
              id="install-pwa-header-btn"
              onClick={handleInstallPwaClick}
              className="h-10 px-2.5 sm:px-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 text-xs font-bold shrink-0"
              title="تثبيت التطبيق / إضافة للشاشة الرئيسية"
            >
              <Download className="w-4 h-4 text-purple-200" />
              <span className="hidden xs:inline">تثبيت التطبيق</span>
            </button>

            {/* 2. Portal Gateway Button */}
            <button
              type="button"
              id="open-admin-portal-header-btn"
              onClick={() => onOpenAdminPortal('merchant')}
              className="w-10 h-10 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/90 text-[#d45679] flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
              title="بوابة الإدارة"
            >
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* 3. Cart Button */}
            <button
              id="open-cart-header-btn"
              onClick={handleOpenCart}
              className="relative w-10 h-10 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-xs transition-all cursor-pointer flex items-center justify-center active:scale-95"
              title="سلة الطلبات"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Logo & Branding matching screenshot */}
          <div className="flex items-center gap-2.5 text-right">
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                عتق أونلاين
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden xs:block">
                قناة عرض وتسويق الخدمات والسلع المحلية
              </p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-linear-to-tr from-[#d45679] to-[#eb7a98] flex items-center justify-center text-white shadow-md shadow-rose-300/40 shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Search & Location Filter Bar */}
        <div className="max-w-6xl mx-auto px-4 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative sm:col-span-2">
            <input
              id="store-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عرض، هاتف، عطر، متجر، أو موقع في عتق..."
              className="w-full bg-slate-100/90 focus:bg-white text-slate-900 text-xs sm:text-sm font-medium py-2.5 pr-10 pl-10 rounded-xl border border-transparent focus:border-rose-300 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 p-1"
              >
                مسح
              </button>
            )}
          </div>

          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-100 text-slate-700 text-xs font-bold py-2.5 px-3 rounded-xl border border-transparent focus:bg-white focus:border-rose-300 outline-none"
            >
              {ATAQ_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  📍 {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Horizontal Category Scroll Pills */}
        <div className="max-w-6xl mx-auto px-4 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {activeCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat === 'عروض حصرية' && <Sparkles className="w-3 h-3 inline ml-1" />}
                {cat}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-4 w-full flex-1">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 text-white rounded-2xl p-4 sm:p-5 mb-5 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold mb-1.5 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>عروض حية ومحدثة من أسواق شبوة</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black leading-tight">
                {settings.bannerTitle}
              </h2>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl">
                {settings.bannerSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl self-start sm:self-auto border border-white/10">
              <Flame className="w-5 h-5 text-amber-300" />
              <div>
                <div className="text-xs text-rose-100">العروض النشطة</div>
                <div className="text-sm sm:text-base font-black">{totalOffersCount} عرض متاح</div>
              </div>
            </div>
          </div>
        </div>

        {/* PWA Install Invitation Strip */}
        {!isPwaInstalledState && (
          <div className="mb-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-right flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  تثبيت تطبيق عتق أونلاين على شاشة جوالك
                </h3>
                <p className="text-[11px] text-slate-500">
                  تصفح سريع بدون انتظار، استهلاك أقل للبيانات، ووصول فوري لأحدث عروض شبوة
                </p>
              </div>
            </div>
            <button
              type="button"
              id="install-pwa-banner-btn"
              onClick={handleInstallPwaClick}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>تثبيت التطبيق / إضافة للشاشة الرئيسية</span>
            </button>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSelectTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              جميع المنتجات ({products.length})
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('offers_only')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'offers_only'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>العروض فقط ({totalOffersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('top_discounts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'top_discounts'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>أكبر التخفيضات</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            عرض {filteredProducts.length} من {products.length}
          </span>
        </div>

        {/* Product Grid / Skeleton State */}
        {isInitialLoading && products.length === 0 ? (
          <ProductSkeletonGrid count={8} />
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 animate-fadeIn">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={settings.currency || 'ريال يمني'}
                onSelect={handleSelectProduct}
                onQuickWhatsApp={handleQuickWhatsApp}
              />
            ))}
          </div>
        ) : (
          /* Empty Search State */
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">لم يتم العثور على نتائج</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              لم نجد عروض تطابق بحثك حالياً في عتق. جرب البحث بكلمات أخرى أو اختر قسماً آخر.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                handleSelectCategory('الكل');
                setSelectedLocation('كل المواقع في عتق');
                handleSelectTab('all');
              }}
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar if items exist */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between animate-fadeIn border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">سلة الطلبات ({totalCartCount} أصناف)</div>
              <div className="text-[11px] text-slate-400">جاهزة للإرسال بالواتساب</div>
            </div>
          </div>

          <button
            onClick={handleOpenCart}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            عرض السلة
          </button>
        </div>
      )}

      {/* Product Details Modal */}
      <OfferDetailsModal
        product={selectedProduct}
        currency={settings.currency || 'ريال يمني'}
        onClose={handleCloseProductModal}
        onAddToCart={handleAddProductToCart}
      />

      {/* Cart Modal */}
      {isCartOpen && (
        <CartModal
          items={cartItems}
          settings={settings}
          onUpdateQuantity={onUpdateCartQuantity}
          onRemoveItem={onRemoveFromCart}
          onClearCart={onClearCart}
          onClose={handleCloseCart}
        />
      )}

      {/* Install PWA Guide Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative border border-purple-100 text-right">
            <button
              type="button"
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تثبيت تطبيق عتق أونلاين
                </h3>
                <p className="text-xs text-slate-500">
                  إضافة التطبيق للشاشة الرئيسية لجهازك
                </p>
              </div>
            </div>

            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3.5 mb-4 text-xs text-slate-700 space-y-2.5">
              <div className="font-bold text-purple-900 flex items-center gap-1.5">
                <span>📱 خطوات سهلة للتثبيت:</span>
              </div>
              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="p-2 rounded-xl bg-white border border-purple-100">
                  <span className="font-bold text-slate-900 block mb-0.5">• لمستخدمي الآيفون (Safari):</span>
                  اضغط على زر المشاركة <Share2 className="w-3 h-3 inline text-blue-600 mx-0.5" /> أسفل المتصفح، ثم اختر <span className="font-bold text-purple-700">"إضافة إلى الصفحة الرئيسية (+)"</span>.
                </div>
                <div className="p-2 rounded-xl bg-white border border-purple-100">
                  <span className="font-bold text-slate-900 block mb-0.5">• لمستخدمي أندرويد (Chrome/Samsung):</span>
                  اضغط على القائمة (⋮) أعلى المتصفح، ثم اختر <span className="font-bold text-purple-700">"تثبيت التطبيق"</span> أو <span className="font-bold text-purple-700">"إضافة للشاشة الرئيسية"</span>.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                id="confirm-pwa-install-btn"
                onClick={handleConfirmManualInstall}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق / إضافة للشاشة الرئيسية</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
