import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Store, 
  ArrowRight, 
  LogOut, 
  Package, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  MessageSquare,
  MapPin,
  Phone,
  ShieldCheck,
  Tag,
  Search,
  Clock,
  Trash2,
  Edit3,
  Filter,
  DollarSign,
  Hash,
  Layers,
  Shirt,
  Palette,
  RefreshCw,
  X
} from 'lucide-react';
import { Product, Merchant, PlatformSettings } from '../types';
import { ProductForm } from './ProductForm';
import { BroadcastModal } from './BroadcastModal';
import { FastImage } from './FastImage';

interface MerchantDashboardProps {
  merchant: Merchant;
  allProducts: Product[];
  settings: PlatformSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onToggleOffer: (id: string, isOffer: boolean) => void;
  onBackToStore: () => void;
  onLogout: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  merchant,
  allProducts,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateQuantity,
  onToggleOffer,
  onBackToStore,
  onLogout
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'hidden' | 'out_of_stock'>('all');

  // Filter products belonging to this delegate/merchant
  const merchantProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const isOwner = 
        p.merchantId === merchant.id || 
        p.merchantName === merchant.name ||
        (merchant.mCode && p.mCode === merchant.mCode);
      return isOwner;
    });
  }, [allProducts, merchant]);

  // Statistics calculation
  const stats = useMemo(() => {
    const now = Date.now();
    let totalOffers = merchantProducts.length;
    let activeOffers = 0;
    let expiredOffers = 0;
    let outOfStock = 0;
    let totalStockQuantity = 0;

    merchantProducts.forEach((p) => {
      const isExpired = p.offerEndsAt && new Date(p.offerEndsAt).getTime() < now;
      if (isExpired || p.status === 'expired') {
        expiredOffers++;
      } else if (p.status === 'active' || (p.isOffer && !isExpired)) {
        activeOffers++;
      }

      if (p.quantity <= 0) {
        outOfStock++;
      }

      totalStockQuantity += (p.quantity || 0);
    });

    return {
      totalOffers,
      activeOffers,
      expiredOffers,
      outOfStock,
      totalStockQuantity
    };
  }, [merchantProducts]);

  // Filtered List based on Search, Category & Status
  const filteredProducts = useMemo(() => {
    const now = Date.now();
    return merchantProducts.filter((p) => {
      // 1. Search Query (Name or mCode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.mCode ? p.mCode.toLowerCase().includes(q) : false;
        const matchesCategory = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCategory) return false;
      }

      // 2. Category
      if (selectedCategory !== 'الكل' && p.category !== selectedCategory) {
        return false;
      }

      // 3. Status Filter
      const isExpired = p.offerEndsAt && new Date(p.offerEndsAt).getTime() < now;
      if (statusFilter === 'active') {
        if (p.status === 'hidden' || isExpired || p.status === 'expired') return false;
      } else if (statusFilter === 'expired') {
        if (!isExpired && p.status !== 'expired') return false;
      } else if (statusFilter === 'hidden') {
        if (p.status !== 'hidden') return false;
      } else if (statusFilter === 'out_of_stock') {
        if (p.quantity > 0) return false;
      }

      return true;
    });
  }, [merchantProducts, searchQuery, selectedCategory, statusFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleOpenAddForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleToggleHideProduct = (product: Product) => {
    const nextStatus = product.status === 'hidden' ? 'active' : 'hidden';
    const updated: Product = { ...product, status: nextStatus };
    onUpdateProduct(updated);
    showToast(nextStatus === 'hidden' ? 'تم إخفاء العرض مؤقتاً من المتجر 👁️‍🗨️' : 'تم تفعيل وإظهار العرض في المتجر ✅');
  };

  const handleSaveProduct = (product: Product) => {
    // Enrich with delegate/merchant details
    const enriched: Product = {
      ...product,
      merchantId: merchant.id,
      merchantName: merchant.name,
      merchantPhone: merchant.phone,
      merchantLocation: merchant.location,
      mCode: product.mCode || merchant.mCode || '1'
    };

    if (editingProduct) {
      onUpdateProduct(enriched);
      showToast('تم حفظ وتحديث بيانات العرض بنجاح ⚡');
    } else {
      onAddProduct(enriched);
      showToast('تم نشر وتثبيت العرض الجديد في سوق عتق بنجاح 🚀');
    }
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleRenewOffer = (product: Product) => {
    const newExpiry = new Date(Date.now() + 3 * 86400000).toISOString();
    const updated: Product = {
      ...product,
      isOffer: true,
      status: 'active',
      offerEndsAt: newExpiry
    };
    onUpdateProduct(updated);
    showToast('تم تجديد وتمديد العرض لمدة 3 أيام إضافية ⏳');
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 flex flex-col selection:bg-rose-500 selection:text-white pb-20">
      {/* Floating Toast Notification at Bottom of Screen */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-black flex items-center gap-2.5 border border-slate-700/80 backdrop-blur-md animate-slideUp max-w-[90vw] text-center">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ═════════ TOP NAVBAR & MERCHANT BRANDING ═════════ */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs w-full">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 w-full">
          {/* Left Brand info */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 max-w-full">
            <button
              onClick={onBackToStore}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer active:scale-95 shadow-2xs"
              title="معاينة المتجر العام"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">معاينة المتجر</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-tight truncate">
                  {merchant.name}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>معتمد</span>
                </span>
                {merchant.mCode && (
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200 shrink-0 font-mono">
                    كود: {merchant.mCode}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                <span className="flex items-center gap-0.5 shrink-0">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  {merchant.location}
                </span>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline truncate">المسؤول: {merchant.ownerName}</span>
              </div>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="hidden md:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-colors border border-emerald-200 shadow-2xs cursor-pointer shrink-0"
              title="توليد رسالة واتساب للعروض"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span>رسائل واتساب</span>
            </button>

            <button
              id="merchant-add-deal-btn"
              onClick={handleOpenAddForm}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-rose-600/25 transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>إضافة عرض جديد</span>
            </button>

            <button
              id="merchant-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
              title="تسجيل الخروج من لوحة التاجر"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
              <span className="whitespace-nowrap">تسجيل الخروج 🚪</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═════════ DASHBOARD MAIN CONTAINER ═════════ */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {/* ═════════ 1. KPI STATS COUNTERS ═════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Offers */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">إجمالي العروض المرفوعة</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {stats.totalOffers}
              </div>
            </div>
          </div>

          {/* Active Offers */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">العروض النشطة الحالية</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                {stats.activeOffers}
              </div>
            </div>
          </div>

          {/* Expired Offers */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">العروض منتهية الصلاحية</div>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                {stats.expiredOffers}
              </div>
            </div>
          </div>

          {/* Total Stock Quantity */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">إجمالي المخزون المتوفر</div>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">
                {stats.totalStockQuantity.toLocaleString('ar-YE')}{' '}
                <span className="text-xs font-bold text-slate-500">قطعة</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════ 2. SEARCH & FILTER TOOLBAR ═════════ */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input (Name or mCode) */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المنتج أو كود التاجر (mCode)..."
                className="w-full text-xs sm:text-sm font-bold py-3 pr-10 pl-4 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 shrink-0">القسم:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto text-xs font-bold py-2.5 px-3.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-rose-500 outline-none cursor-pointer"
              >
                <option value="الكل">كل الأقسام والتصنيفات</option>
                {settings.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">الحالة:</span>
            {[
              { id: 'all', label: `الكل (${merchantProducts.length})` },
              { id: 'active', label: `النشطة بالمعرض 🟢 (${stats.activeOffers})` },
              { id: 'expired', label: `منتهية الصلاحية ⏳ (${stats.expiredOffers})` },
              { id: 'hidden', label: 'المخفية 👁️‍🗨️' },
              { id: 'out_of_stock', label: `نفدت من المخزون ⚠️ (${stats.outOfStock})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═════════ 3. OFFER CARDS LIST ═════════ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-600" />
              <span>قائمة المرفوعات ({filteredProducts.length})</span>
            </h2>

            <button
              onClick={handleOpenAddForm}
              className="text-xs font-black text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>نشر عرض جديد</span>
            </button>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((item) => {
                const now = Date.now();
                const isExpired = item.offerEndsAt && new Date(item.offerEndsAt).getTime() < now;
                const isHidden = item.status === 'hidden';
                const hasDiscount = item.discountPrice && item.discountPrice < item.originalPrice;
                const customerPrice = hasDiscount ? item.discountPrice! : item.originalPrice;
                const cost = item.costPrice || 0;
                const profit = cost > 0 ? customerPrice - cost : 0;
                const totalPhotosCount = 1 + (item.additionalImages?.length || 0);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col justify-between gap-4 ${
                      isHidden 
                        ? 'border-slate-300 opacity-75 bg-slate-50/70' 
                        : isExpired
                        ? 'border-amber-200/80 bg-amber-50/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Image & Offer Metadata */}
                    <div className="flex gap-4">
                      {/* Product Primary Image with multi-photo badge */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 relative group">
                        <FastImage
                          src={item.image}
                          thumbnail={item.thumbnail}
                          alt={item.name}
                          aspectRatio="aspect-square"
                        />
                        {totalPhotosCount > 1 && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-0.5">
                            📸 {totalPhotosCount} صور
                          </span>
                        )}
                        {item.mCode && (
                          <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                            #{item.mCode}
                          </span>
                        )}
                      </div>

                      {/* Info & Badges */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {item.category}
                          </span>

                          {/* Status Badge */}
                          {isHidden ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              <span>مخفي</span>
                            </span>
                          ) : isExpired ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>منتهي الصلاحية</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              <span>نشط بالمعرض</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-black text-slate-900 line-clamp-2 leading-snug">
                          {item.name}
                        </h3>

                        {/* Specs (Sizes / Colors) */}
                        {(item.sizes || item.colors) && (
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                            {item.sizes && <span>مقاس: <strong>{item.sizes}</strong></span>}
                            {item.sizes && item.colors && <span>•</span>}
                            {item.colors && <span>ألوان: <strong>{item.colors}</strong></span>}
                          </div>
                        )}

                        {/* Pricing Display: Only the merchant's entered cost price */}
                        <div className="pt-1 flex items-center gap-3 text-xs flex-wrap">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">سعر العرض (المدخل)</span>
                            <span className="font-black text-slate-900 text-sm">
                              {(cost > 0 ? cost : customerPrice).toLocaleString('ar-YE')} ريال يمني
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Quantity Stepper & Action Controls */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-2xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-black ml-1">الكمية:</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold shadow-xs"
                          title="إنقاص الكمية"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-black text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold shadow-xs"
                          title="زيادة الكمية"
                        >
                          +
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Renew if expired */}
                        {isExpired && (
                          <button
                            type="button"
                            onClick={() => handleRenewOffer(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 transition-colors"
                            title="تجديد العرض 3 أيام"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>تجديد ⏳</span>
                          </button>
                        )}

                        {/* Hide / Show Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleHideProduct(item)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isHidden
                              ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-900'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                          title={isHidden ? 'إظهار بالمتجر' : 'إخفاء مؤقت'}
                        >
                          {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditProduct(item)}
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                          title="تعديل العرض"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setProductToDelete(item)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                          title="حذف العرض نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-black text-slate-700">لا توجد عروض مطابقة للبحث</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                يمكنك الضغط على زر "إضافة عرض جديد (8 خطوات)" لإدراج ونشر سلعة جديدة في سوق عتق فورياً.
              </p>
              <button
                onClick={handleOpenAddForm}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors"
              >
                + نشر أول عرض الآن
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ═════════ DELETE CONFIRMATION MODAL ═════════ */}
      {productToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProductToDelete(null);
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                تأكيد حذف العرض
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من حذف هذا العرض نهائياً؟
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 truncate mt-2">
                🏷️ {productToDelete.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  showToast('تم حذف العرض بنجاح 🗑️');
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              >
                تأكيد (نعم)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ ADD / EDIT PRODUCT FORM MODAL (8 STEPS) ═════════ */}
      {isFormOpen && (
        <ProductForm
          initialProduct={editingProduct}
          categories={settings.categories}
          profitMarginPercent={settings.profitMarginPercent}
          activeMerchant={merchant}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* ═════════ BROADCAST WHATSAPP MODAL ═════════ */}
      {isBroadcastOpen && (
        <BroadcastModal
          products={merchantProducts}
          settings={settings}
          onClose={() => setIsBroadcastOpen(false)}
        />
      )}
    </div>
  );
};
