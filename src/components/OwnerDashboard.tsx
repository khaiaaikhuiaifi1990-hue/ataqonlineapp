import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Store, 
  ArrowRight, 
  LogOut, 
  CheckCircle,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Users,
  Settings,
  Database,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  MapPin,
  Phone,
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Edit3,
  Search,
  Flame,
  AlertTriangle,
  Sliders,
  Percent,
  Calculator,
  Save,
  Check,
  X,
  Clock,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserX,
  Send,
  Tag,
  Hash
} from 'lucide-react';
import { Product, Merchant, PlatformSettings } from '../types';
import { StatsPanel } from './StatsPanel';
import { ProductList } from './ProductList';
import { ProductForm } from './ProductForm';
import { BroadcastModal } from './BroadcastModal';
import { calculateCustomerPrice, getNextSupportPhone } from '../utils/supportRouter';

interface OwnerDashboardProps {
  products: Product[];
  merchants: Merchant[];
  settings: PlatformSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onToggleOffer: (id: string, isOffer: boolean) => void;
  onAddMerchant: (merchant: Merchant) => void;
  onUpdateMerchant: (merchant: Merchant) => void;
  onDeleteMerchant: (id: string) => void;
  onUpdateSettings: (settings: PlatformSettings) => void;
  onRestoreData: (products: Product[], merchants: Merchant[], settings: PlatformSettings) => void;
  onResetToDefault: () => void;
  onBackToStore: () => void;
  onLogout: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  products,
  merchants,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateQuantity,
  onToggleOffer,
  onAddMerchant,
  onUpdateMerchant,
  onDeleteMerchant,
  onUpdateSettings,
  onRestoreData,
  onResetToDefault,
  onBackToStore,
  onLogout
}) => {
  // Navigation tabs for all 5 core requested sections + overview/products/broadcast
  const [activeTab, setActiveTab] = useState<
    'overview' | 'margins_settings' | 'support_router' | 'categories' | 'auto_cleanup' | 'merchants' | 'products' | 'broadcast'
  >('overview');

  const [toastMessage, setToastMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Settings State Form
  const [settingsForm, setSettingsForm] = useState<PlatformSettings>(settings);

  // Interactive Price Calculator test cost state
  const [sampleCostPrice, setSampleCostPrice] = useState<number>(100);

  // Round-Robin Support Numbers input state
  const [newSupportPhone, setNewSupportPhone] = useState('');

  // Categories input state
  const [newCategoryName, setNewCategoryName] = useState('');

  // Delegate / Merchant Form State
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [merchantToDelete, setMerchantToDelete] = useState<Merchant | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [merchantFormName, setMerchantFormName] = useState('');
  const [merchantFormOwner, setMerchantFormOwner] = useState('');
  const [merchantFormPhone, setMerchantFormPhone] = useState('');
  const [merchantFormMCode, setMerchantFormMCode] = useState('');
  const [merchantFormPin, setMerchantFormPin] = useState('');
  const [merchantFormLocation, setMerchantFormLocation] = useState('عتق - شارع درهم');
  const [merchantFormCategory, setMerchantFormCategory] = useState('إلكترونيات وجوالات');

  // Keep settings form in sync when props update
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SETTINGS & MARGINS SECTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const calculatedSamplePrice = useMemo(() => {
    return calculateCustomerPrice(sampleCostPrice, settingsForm.profitMarginPercent);
  }, [sampleCostPrice, settingsForm.profitMarginPercent]);

  const sampleProfitAmount = useMemo(() => {
    return Math.max(0, calculatedSamplePrice - (sampleCostPrice || 0));
  }, [calculatedSamplePrice, sampleCostPrice]);

  const handleSaveAllSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateSettings(settingsForm);
    showToast('تم حفظ وتطبيق الخيارات والإعدادات فورياً في السيرفر 💾');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ROUND-ROBIN SUPPORT NUMBERS HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAddSupportPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSupportPhone.trim().replace(/[^0-9]/g, '');
    if (!clean || clean.length < 7) {
      showToast('يرجى إدخال رقم واتساب صحيح يبدأ بمفتاح الدولة');
      return;
    }

    const currentList = settingsForm.supportPhoneNumbers || [];
    if (currentList.includes(clean)) {
      showToast('هذا الرقم مضاف بالفعل في قائمة التدوير');
      return;
    }

    const updatedList = [...currentList, clean];
    const updatedSettings = {
      ...settingsForm,
      supportPhoneNumbers: updatedList,
      supportPhone: updatedList[0] || settingsForm.supportPhone
    };
    setSettingsForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    setNewSupportPhone('');
    showToast(`تمت إضافة الرقم (${clean}) إلى التوزيع الدوري بنجاح ➕`);
  };

  const handleRemoveSupportPhone = (phoneToRemove: string) => {
    const currentList = settingsForm.supportPhoneNumbers || [];
    if (currentList.length <= 1) {
      showToast('يجب الاحتفاظ برقم واحد على الأقل لخدمة العملاء');
      return;
    }
    const updatedList = currentList.filter((p) => p !== phoneToRemove);
    const updatedSettings = {
      ...settingsForm,
      supportPhoneNumbers: updatedList,
      supportPhone: updatedList[0] || settingsForm.supportPhone
    };
    setSettingsForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    showToast('تم حذف الرقم من قائمة التوزيع الدوري 🗑️');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CATEGORIES MANAGEMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast('يرجى كتابة اسم القسم');
      return;
    }

    const currentCategories = settingsForm.categories || [];
    if (currentCategories.includes(trimmed)) {
      showToast('هذا القسم موجود بالفعل في القائمة');
      return;
    }

    const updatedCategories = [...currentCategories, trimmed];
    const updatedSettings = {
      ...settingsForm,
      categories: updatedCategories
    };
    setSettingsForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    setNewCategoryName('');
    showToast(`تمت إضافة قسم "${trimmed}" إلى أقسام المتجر بنجاح ➕`);
  };

  const handleRemoveCategory = (catToRemove: string) => {
    const currentCategories = settingsForm.categories || [];
    if (currentCategories.length <= 1) {
      showToast('يجب الإبقاء على قسم واحد على الأقل');
      return;
    }

    if (window.confirm(`هل تريد بالتأكيد حذف قسم "${catToRemove}" من المعرض؟`)) {
      const updatedCategories = currentCategories.filter((c) => c !== catToRemove);
      const updatedSettings = {
        ...settingsForm,
        categories: updatedCategories
      };
      setSettingsForm(updatedSettings);
      onUpdateSettings(updatedSettings);
      showToast(`تم حذف قسم "${catToRemove}" بنجاح 🗑️`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. AUTO CLEANUP & MAINTENANCE SYSTEM
  // ─────────────────────────────────────────────────────────────────────────────
  const expiredProducts = useMemo(() => {
    const now = Date.now();
    return products.filter((p) => {
      if (p.status === 'expired') return true;
      if (p.isOffer && p.offerEndsAt) {
        return new Date(p.offerEndsAt).getTime() < now;
      }
      return false;
    });
  }, [products]);

  const activeValidProducts = useMemo(() => {
    return products.length - expiredProducts.length;
  }, [products, expiredProducts]);

  const handleToggleAutoCleanup = () => {
    const updatedState = !settingsForm.autoCleanupExpired;
    const updatedSettings = {
      ...settingsForm,
      autoCleanupExpired: updatedState
    };
    setSettingsForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    showToast(
      updatedState 
        ? 'تم تفعيل الحذف والتنظيف التلقائي المستمر للعروض المنتهية ⚡' 
        : 'تم إيقاف الحذف التلقائي للعروض'
    );
  };

  const handleExecuteImmediateCleanup = () => {
    const now = Date.now();
    let cleanedCount = 0;

    products.forEach((p) => {
      let isExpired = false;
      if (p.status === 'expired') isExpired = true;
      if (p.isOffer && p.offerEndsAt && new Date(p.offerEndsAt).getTime() < now) {
        isExpired = true;
      }

      if (isExpired) {
        // Toggle offer flag and mark as out of stock / updated
        onToggleOffer(p.id, false);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      showToast(`تم تنظيف وصيانة ${cleanedCount} من العروض المنتهية فورياً ⚡`);
    } else {
      showToast('جميع العروض الحالية سارية المفعول ولا توجد عروض منتهية ⚡');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MERCHANTS & DELEGATES MANAGEMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenAddMerchant = () => {
    setEditingMerchant(null);
    setMerchantFormName('');
    setMerchantFormOwner('');
    setMerchantFormPhone('967770000000');
    setMerchantFormMCode(`M-${100 + merchants.length + 1}`);
    setMerchantFormPin(String(Math.floor(1000 + Math.random() * 9000)));
    setMerchantFormLocation('عتق - شارع درهم');
    setMerchantFormCategory(settingsForm.categories?.[0] || 'إلكترونيات وجوالات');
    setIsMerchantModalOpen(true);
  };

  const handleOpenEditMerchant = (m: Merchant) => {
    setEditingMerchant(m);
    setMerchantFormName(m.name);
    setMerchantFormOwner(m.ownerName || m.name);
    setMerchantFormPhone(m.phone);
    setMerchantFormMCode(m.mCode || `M-${m.id.replace(/[^0-9]/g, '') || '101'}`);
    setMerchantFormPin(m.pin);
    setMerchantFormLocation(m.location);
    setMerchantFormCategory(m.category);
    setIsMerchantModalOpen(true);
  };

  const handleSaveMerchantForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantFormName.trim() || !merchantFormPhone.trim() || !merchantFormPin.trim()) {
      showToast('يرجى ملء جميع الحقول الإلزامية للمندوب');
      return;
    }

    if (editingMerchant) {
      const updated: Merchant = {
        ...editingMerchant,
        name: merchantFormName.trim(),
        ownerName: merchantFormOwner.trim() || merchantFormName.trim(),
        phone: merchantFormPhone.trim(),
        mCode: merchantFormMCode.trim() || `M-${100 + merchants.length}`,
        pin: merchantFormPin.trim(),
        location: merchantFormLocation.trim(),
        category: merchantFormCategory,
        isVerified: true
      };
      onUpdateMerchant(updated);
      showToast(`تم تحديث بيانات المندوب (${updated.name}) بنجاح ⚡`);
    } else {
      const created: Merchant = {
        id: `merch-${Date.now()}`,
        name: merchantFormName.trim(),
        ownerName: merchantFormOwner.trim() || merchantFormName.trim(),
        phone: merchantFormPhone.trim(),
        mCode: merchantFormMCode.trim() || `M-${100 + merchants.length + 1}`,
        pin: merchantFormPin.trim(),
        location: merchantFormLocation.trim(),
        category: merchantFormCategory,
        isVerified: true,
        joinedAt: Date.now(),
        status: 'active'
      };
      onAddMerchant(created);
      showToast(`تم تسجيل المندوب (${created.name}) وتوفير صلاحيات الرفع والسحب له ➕`);
    }
    setIsMerchantModalOpen(false);
  };

  const handleToggleMerchantStatus = (m: Merchant) => {
    const nextStatus: 'active' | 'suspended' = m.status === 'active' ? 'suspended' : 'active';
    const updated: Merchant = { ...m, status: nextStatus };
    onUpdateMerchant(updated);
    showToast(
      nextStatus === 'active' 
        ? `تم تنشيط صلاحية المندوب (${m.name}) ✅` 
        : `تم إيقاف صلاحية المندوب (${m.name}) ⛔`
    );
  };

  // Product actions
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
    if (editingProduct) {
      onUpdateProduct(product);
      showToast('تم تحديث العرض بنجاح ⚡');
    } else {
      onAddProduct(product);
      showToast('تم نشر العرض الجديد في سوق عتق بنجاح 🚀');
    }
  };

  // JSON Backups
  const handleExportBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      platform: settings.platformName,
      products,
      merchants,
      settings: settingsForm
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ataq_online_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير نسخة احتياطية كاملة بنجاح 💾');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.products && Array.isArray(parsed.products)) {
          onRestoreData(
            parsed.products,
            parsed.merchants || merchants,
            parsed.settings || settingsForm
          );
          showToast('تم استعادة البيانات والنسخة الاحتياطية بنجاح! 🎉');
        } else {
          showToast('ملف النسخ الاحتياطي غير صالح.');
        }
      } catch (err) {
        showToast('حدث خطأ أثناء قراءة ملف النسخ الاحتياطي.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="owner-dashboard-root" className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 flex flex-col selection:bg-rose-500 selection:text-white pb-20">
      {/* Dynamic Toast Notice */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 animate-fadeIn max-w-[90vw] text-center">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBackToStore}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer active:scale-95 shadow-xs"
              title="معاينة المتجر كزبون"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">معاينة المتجر</span>
            </button>

            <div className="h-5 w-px bg-slate-700 hidden sm:block shrink-0" />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight truncate">
                  نظام التحكم المركزي لعتق أونلاين
                </h1>
                <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0">
                  المدير العام
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate block">
                {settings.platformName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleOpenAddProduct}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>إضافة عرض جديد</span>
            </button>

            <button
              onClick={onLogout}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Core Feature Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar flex items-center gap-1 border-t border-slate-800/80 pt-1.5 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>نظرة عامة والتحليلات</span>
          </button>

          {/* 1. Settings & Margins */}
          <button
            onClick={() => setActiveTab('margins_settings')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'margins_settings'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>ضبط المتغيرات والنسب (1)</span>
          </button>

          {/* 2. Round-Robin Support Phone Numbers */}
          <button
            onClick={() => setActiveTab('support_router')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'support_router'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>أرقام خدمة العملاء والتوزيع (2)</span>
          </button>

          {/* 3. Categories Management */}
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'categories'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4 text-blue-400" />
            <span>أقسام وتصنيفات المتجر (3)</span>
          </button>

          {/* 4. Auto Cleanup System */}
          <button
            onClick={() => setActiveTab('auto_cleanup')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'auto_cleanup'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>تنظيف وصيانة المعرض (4)</span>
          </button>

          {/* 5. Merchants & Delegates Management */}
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'merchants'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-rose-400" />
            <span>إدارة المناديب والمصرحين (5) ({merchants.length})</span>
          </button>

          {/* Products & Broadcast */}
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'products'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>العروض والمنتجات ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === 'broadcast'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>رسائل الواتساب</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* ========================================================================= */}
        {/* TAB 0: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <StatsPanel products={products} />

            {/* 5 Feature Quick Cards Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Margins & Variables */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Percent className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      هامش الربح: {settingsForm.profitMarginPercent}%
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">1. ضبط المتغيرات والنسب</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    تعديل شريط هامش أرباح المشتركين (0% - 150%) مع الحساب التلقائي لأسعار الزبائن ورموز الوصول.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('margins_settings')}
                  className="mt-4 text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <span>فتح ضبط المتغيرات والنسب</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {/* Card 2: Round-Robin Support Numbers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      {(settingsForm.supportPhoneNumbers || []).length} أرقام نشطة
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">2. خدمة العملاء (التوزيع الدوري)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    توزيع طلبات الزبائن الواردة عبر الواتساب تلقائياً وبالتساوي بنظام Round-Robin الدوري.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('support_router')}
                  className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>إدارة أرقام خدمة العملاء</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {/* Card 3: Categories Management */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Tag className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      {(settingsForm.categories || []).length} تصنيفات
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">3. إدارة أقسام وتصنيفات المتجر</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    إضافة وحذف أقسام المتجر (ملابس نسائية، عالم الأطفال، إلكترونيات، تجميل، مفروشات...)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="mt-4 text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>إدارة تصنيفات المتجر</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {/* Card 4: Auto Cleanup */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                      settingsForm.autoCleanupExpired 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {settingsForm.autoCleanupExpired ? 'التنظيف التلقائي مفعّل ⚡' : 'معطل'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">4. تنظيف وصيانة المعرض</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {expiredProducts.length > 0 
                      ? `يوجد حالياً ${expiredProducts.length} عروض منتهية تحتاج تنظيف.` 
                      : 'جميع العروض الحالية سارية ومحدثة بالكامل.'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('auto_cleanup')}
                  className="mt-4 text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1"
                >
                  <span>لوحة الصيانة والتنظيف الفوري</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {/* Card 5: Merchants & Delegates */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                      {merchants.length} مناديب وتجار
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">5. إدارة المناديب والمصرحين</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    تسجيل المناديب برموز PIN و mCode وتوفير صلاحيات الرفع مع روابط المراسلة المباشرة.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('merchants')}
                  className="mt-4 text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
                >
                  <span>إدارة حسابات المناديب</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>

              {/* JSON Backup Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">النسخ الاحتياطي واستعادة البيانات</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    تصدير ملف JSON آمن لجميع المنتجات والمتاجر والخيارات واستعادتها بضغطة زر.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={handleExportBackup}
                    className="text-xs font-bold bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-xl transition-colors"
                  >
                    تصدير JSON 💾
                  </button>
                  <label className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl transition-colors cursor-pointer">
                    استيراد 📂
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Recent Products Snippet */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>أحدث عروض المعرض المنشورة</span>
                  <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                    ({Math.min(5, products.length)})
                  </span>
                </h2>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  عرض كافة العروض ({products.length})
                </button>
              </div>

              <ProductList
                products={products.slice(0, 5)}
                onEdit={handleEditProduct}
                onDelete={onDeleteProduct}
                onDeleteProduct={(prod) => setProductToDelete(prod)}
                onUpdateQuantity={onUpdateQuantity}
                onToggleOffer={onToggleOffer}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SETTINGS & MARGINS (ضبط المتغيرات والنسب) */}
        {/* ========================================================================= */}
        {activeTab === 'margins_settings' && (
          <form onSubmit={handleSaveAllSettings} className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      1. ضبط المتغيرات والنسب وهامش الأرباح
                    </h2>
                    <p className="text-xs text-slate-500">
                      التحكم بهامش ربح المتجر، المعادلة التلقائية لتسعير الزبائن، ورموز الوصول والأمان
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتطبيق الخيارات فورياً في السيرفر 💾</span>
                </button>
              </div>

              {/* Slider Section */}
              <div className="bg-amber-50/50 border border-amber-200/80 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-600" />
                      <span>شريط هامش أرباح المتجر للمشتركين (من 0% إلى 150%)</span>
                    </label>
                    <p className="text-xs text-slate-600 mt-0.5">
                      يتم تطبيق هذه النسبة تلقائياً لإضافة هامش الربح إلى سعر التكلفة المحدد للعروض والمنتجات.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-2xl font-black font-mono text-amber-700 bg-white px-4 py-1 rounded-xl border border-amber-300 shadow-xs">
                      {settingsForm.profitMarginPercent}%
                    </span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                      {settingsForm.profitMarginPercent === 0 
                        ? 'بدون ربح (0%)' 
                        : settingsForm.profitMarginPercent <= 25 
                        ? 'ربح معتدل' 
                        : settingsForm.profitMarginPercent <= 50 
                        ? 'ربح قياسي' 
                        : 'هامش مرتفع'}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="pt-2">
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="1"
                    value={settingsForm.profitMarginPercent}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        profitMarginPercent: parseInt(e.target.value, 10) || 0
                      })
                    }
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 pt-1">
                    <span>0% (بدون ربح)</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                    <span>150% (الحد الأقصى)</span>
                  </div>
                </div>

                {/* Live Formula Box */}
                <div className="bg-white p-4 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Calculator className="w-4 h-4 text-amber-600" />
                    <span>المعادلة التلقائية لتوضيح السعر للزبون عند إدخال التكلفة:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        جرّب إدخال سعر التكلفة التجريبي:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={sampleCostPrice}
                          onChange={(e) => setSampleCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 focus:border-amber-500 outline-none"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">
                          {settingsForm.currency}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                      <span className="text-[11px] text-slate-500 font-medium">هامش ربح المنصة ({settingsForm.profitMarginPercent}%):</span>
                      <span className="text-sm font-black text-emerald-600 font-mono">
                        +{sampleProfitAmount} {settingsForm.currency}
                      </span>
                    </div>

                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 flex flex-col justify-center">
                      <span className="text-[11px] text-amber-900 font-medium">السعر النهائي المقترح للزبون:</span>
                      <span className="text-base font-black text-amber-700 font-mono">
                        {calculatedSamplePrice} {settingsForm.currency}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg font-mono border border-slate-100" dir="ltr">
                    Customer Price = Cost ({sampleCostPrice}) + ({sampleCostPrice} × {settingsForm.profitMarginPercent}%) = <strong className="text-amber-700 font-bold">{calculatedSamplePrice} {settingsForm.currency}</strong>
                  </div>
                </div>
              </div>

              {/* Security & Access Codes Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    رمز وصول التجار والمندوبين المعتمدين لتصفح لوحة الرفع:
                  </label>
                  <p className="text-[11px] text-slate-500">
                    الرمز السري الموحد لتخويل المناديب للدخول السريع للوحة الرفع والسحب
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={settingsForm.merchantAccessCode || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, merchantAccessCode: e.target.value })}
                      placeholder="مثال: 1234 أو ATAQ2026"
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 tracking-wider text-slate-800"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    رمز دخول المالك (المدير العام):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    رمز PIN السري الرئيسي للوصول إلى لوحة الإدارة المركزية
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={settingsForm.ownerPin || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ownerPin: e.target.value })}
                      className="w-full text-center text-sm font-black p-3 rounded-xl border border-slate-300 tracking-widest text-rose-600"
                    />
                    <ShieldCheck className="w-4 h-4 text-rose-500 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>

              {/* General Platform Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنصة</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.platformName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العملة الافتراضية</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.currency}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الدعم الفني الافتراضي</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.supportPhone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Banner Texts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان البانر الإعلاني</label>
                  <input
                    type="text"
                    value={settingsForm.bannerTitle}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bannerTitle: e.target.value })}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوصف الفرعي للبانر</label>
                  <input
                    type="text"
                    value={settingsForm.bannerSubtitle}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bannerSubtitle: e.target.value })}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتطبيق الخيارات فورياً في السيرفر 💾</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ROUND-ROBIN SUPPORT NUMBERS (أرقام خدمة العملاء والتوزيع الدوري) */}
        {/* ========================================================================= */}
        {activeTab === 'support_router' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    2. أرقام خدمة العملاء - التوزيع الدوري (Round-Robin Support)
                  </h2>
                  <p className="text-xs text-slate-500">
                    توزيع طلبات المتسوقين الواردة عبر واتساب دورياً وبالتساوي بين الأرقام المسجلة
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>الآلية التلقائية: تدوير فوري متساوٍ</span>
              </div>
            </div>

            {/* Explanation card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                كيف يعمل نظام التدوير الآلي؟
              </p>
              <p>
                عند ضغط الزبون على زر <strong>"تقديم طلب بالواتساب"</strong> أو طلب سلة المشتريات، يقوم النظام تلقائياً وبشكل دوري متسلسل (Round-Robin) بتوجيه الرسالة إلى الرقم التالي في القائمة أدناه، مما يضمن توزيع ضغط الطلبات بالتساوي بين خدمة العملاء والمناديب.
              </p>
            </div>

            {/* Add Phone Form */}
            <form onSubmit={handleAddSupportPhone} className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                إضافة رقم واتساب جديد إلى حلقة التدوير:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder="مثال: 967770000000 (مع مفتاح الدولة)"
                    value={newSupportPhone}
                    onChange={(e) => setNewSupportPhone(e.target.value)}
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none pr-3 pl-10"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ➕</span>
                </button>
              </div>
            </form>

            {/* List of Registered Support Numbers */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>قائمة الأرقام المسجلة في التدوير الدوري:</span>
                <span className="bg-slate-100 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
                  {(settingsForm.supportPhoneNumbers || []).length} أرقام
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(settingsForm.supportPhoneNumbers || []).map((num, idx) => (
                  <div
                    key={num + idx}
                    className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono text-xs font-black">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-900" dir="ltr">
                          +{num}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          نشط في حلقة التوزيع
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={`https://wa.me/${num.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        title="تجربة المراسلة عبر واتساب"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveSupportPhone(num)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                        title="حذف الرقم من التدوير"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CATEGORIES MANAGEMENT (إدارة أقسام وتصنيفات المتجر) */}
        {/* ========================================================================= */}
        {activeTab === 'categories' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    3. قسم إدارة أقسام وتصنيفات المتجر
                  </h2>
                  <p className="text-xs text-slate-500">
                    إضافة وحذف التصنيفات التي تظهر للزبائن في المتجر وللتجار عند رفع العروض
                  </p>
                </div>
              </div>

              <span className="bg-blue-50 text-blue-800 text-xs font-black px-3.5 py-1.5 rounded-xl border border-blue-200">
                {(settingsForm.categories || []).length} تصنيفات نشطة
              </span>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="bg-blue-50/40 p-4 rounded-2xl border border-blue-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                إضافة تصنيف أو قسم جديد للمتجر:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder="مثال: ملابس نسائية، عالم الأطفال، تجميل وإكسسوارات، المطبخ الحديثة، مفروشات، أحذية..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة قسم ➕</span>
                </button>
              </div>
            </form>

            {/* Categories List Cards */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">
                أقسام وتصنيفات المعرض الحالية:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(settingsForm.categories || []).map((cat) => {
                  const count = products.filter((p) => p.category === cat).length;
                  return (
                    <div
                      key={cat}
                      className="bg-slate-50 hover:bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{cat}</span>
                          <span className="text-[10px] text-slate-500">{count} عروض منشورة</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="حذف هذا القسم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUTO CLEANUP SYSTEM (تنظيف وصيانة المعرض الآلي) */}
        {/* ========================================================================= */}
        {activeTab === 'auto_cleanup' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    4. قسم تنظيف وصيانة المعرض (Auto Cleanup System)
                  </h2>
                  <p className="text-xs text-slate-500">
                    فحص وإلغاء العروض المنتهية تلقائياً والحفاظ على سرعة المتجر ونقاء المحتوى
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleAutoCleanup}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl font-bold text-xs shadow-xs transition-colors ${
                  settingsForm.autoCleanupExpired
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {settingsForm.autoCleanupExpired ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-white" />
                    <span>الحذف التلقائي: مُفعّل ومستمر ⚡</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span>الحذف التلقائي: مُعطّل</span>
                  </>
                )}
              </button>
            </div>

            {/* Counters and Status Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-purple-800 font-bold block">العروض المنتهية حالياً</span>
                  <div className="text-3xl font-black text-purple-950 font-mono mt-1">
                    {expiredProducts.length}
                  </div>
                </div>
                <span className="text-[11px] text-purple-700 mt-2">
                  عروض تجاوزت تاريخ صلاحيتها أو تم وضع علامة انتهاء عليها
                </span>
              </div>

              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-bold block">العروض السارية النشطة</span>
                  <div className="text-3xl font-black text-emerald-950 font-mono mt-1">
                    {activeValidProducts}
                  </div>
                </div>
                <span className="text-[11px] text-emerald-700 mt-2">
                  عروض سارية تظهر للزبائن حالياً في سوق عتق
                </span>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-700 font-bold block">حالة نظام التنظيف</span>
                  <div className="text-sm font-black text-slate-900 mt-2 flex items-center gap-1.5">
                    {settingsForm.autoCleanupExpired ? (
                      <span className="text-purple-600 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        تنظيف تلقائي نشط ومستمر
                      </span>
                    ) : (
                      <span className="text-slate-500">تنظيف يدوي حسب الطلب</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteImmediateCleanup}
                  className="mt-3 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تنظيف العروض المنتهية الآن ⚡</span>
                </button>
              </div>
            </div>

            {/* Expired Products List Preview if any */}
            {expiredProducts.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-700">
                  العروض المنتهية المعلقة ({expiredProducts.length}):
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {expiredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-[10px] text-slate-500">({p.merchantName})</span>
                      </div>
                      <button
                        onClick={() => onToggleOffer(p.id, false)}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        إلغاء العرض الآن
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MERCHANTS & DELEGATES MANAGEMENT (إدارة المناديب والمصرحين) */}
        {/* ========================================================================= */}
        {activeTab === 'merchants' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      5. قسم إدارة حسابات المناديب والمصرحين (Merchants Management)
                    </h2>
                    <p className="text-xs text-slate-500">
                      إدارة التراخيص، رموز PIN المشفرة، الرمز التعريفي mCode، وروابط التواصل المباشر
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-rose-50 text-rose-800 text-xs font-black px-3 py-1.5 rounded-xl border border-rose-200">
                    عدد المندوبين الترخيصين المعتمدين: {merchants.length}
                  </span>

                  <button
                    onClick={handleOpenAddMerchant}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل مندوب جديد ➕</span>
                  </button>
                </div>
              </div>

              {/* Merchants Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {merchants.map((m) => {
                  const storeDealsCount = products.filter(
                    (p) => p.merchantId === m.id || p.merchantName === m.name
                  ).length;
                  const isActive = m.status === 'active';

                  return (
                    <div
                      key={m.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-rose-300 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                              <Store className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                              <span className="text-[11px] text-slate-500 font-medium block">
                                المندوب: {m.ownerName || m.name}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {isActive ? 'مُوضّح ومُنَشّط ✅' : 'موقوف الصلاحية ⛔'}
                          </span>
                        </div>

                        {/* Delegate Details Box */}
                        <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">الرمز التعريفي (mCode):</span>
                            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700">
                              {m.mCode || `M-${m.id.replace(/[^0-9]/g, '') || '101'}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">الرمز السري (PIN):</span>
                            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-600">
                              {m.pin}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span dir="ltr" className="font-mono text-slate-800 font-bold">{m.phone}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span>{m.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 font-bold">
                          {storeDealsCount} عروض
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Direct WhatsApp Chat */}
                          <a
                            href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                            title="مراسلة المندوب عبر واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>راسلـه</span>
                          </a>

                          {/* Toggle Suspend/Activate */}
                          <button
                            type="button"
                            onClick={() => handleToggleMerchantStatus(m)}
                            className={`p-1.5 rounded-xl transition-colors ${
                              isActive
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                            title={isActive ? 'إيقاف الصلاحية' : 'تنشيط الصلاحية'}
                          >
                            {isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditMerchant(m)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                            title="تعديل بيانات المندوب"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            id={`delete-merchant-${m.id}-btn`}
                            type="button"
                            onClick={() => setMerchantToDelete(m)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف حساب المندوب نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: ALL PRODUCTS & DEALS */}
        {/* ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  كافة عروض ومنتجات منصة عتق أونلاين
                </h2>
                <p className="text-xs text-slate-500">
                  إدارة وتعديل وحذف العروض لجميع المحلات والتجار والمناديب
                </p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة عرض جديد</span>
              </button>
            </div>

            <ProductList
              products={products}
              onEdit={handleEditProduct}
              onDelete={onDeleteProduct}
              onDeleteProduct={(prod) => setProductToDelete(prod)}
              onUpdateQuantity={onUpdateQuantity}
              onToggleOffer={onToggleOffer}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: BROADCAST TOOL */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  مولد الرسائل الإعلانية لجروبات واتساب شبوة
                </h2>
                <p className="text-xs text-slate-500">
                  إنشاء نصوص ترويجية منسقة بأسعار العروض والخصومات لنشرها في مجتمعات شبوة
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              تتيح لك هذه الأداة تجميع أفضل العروض والتخفيضات الحالية في نص رسالة تسويقية جميلة ومنسقة بالإيموجي والروابط المباشرة لتشجيع المتسوقين على الطلب الفوري عبر واتساب.
            </p>

            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors text-xs sm:text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>توليد ومعاينة رسالة الواتساب الآن</span>
            </button>
          </div>
        )}
      </main>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <ProductForm
          initialProduct={editingProduct}
          categories={settingsForm.categories}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Broadcast WhatsApp Tool Modal */}
      {isBroadcastModalOpen && (
        <BroadcastModal
          products={products}
          settings={settingsForm}
          onClose={() => setIsBroadcastModalOpen(false)}
        />
      )}

      {/* ═════════ DELETE MERCHANT CONFIRMATION MODAL ═════════ */}
      {merchantToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMerchantToDelete(null);
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                تأكيد حذف حساب المندوب
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من حذف حساب هذا المندوب نهائياً؟
              </p>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 space-y-2 text-right mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">اسم المندوب:</span>
                  <span className="text-slate-900 font-black">{merchantToDelete.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">الرمز التعريفي:</span>
                  <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {merchantToDelete.mCode || merchantToDelete.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">الهاتف:</span>
                  <span dir="ltr" className="font-mono text-slate-700">{merchantToDelete.phone}</span>
                </div>
                {merchantToDelete.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-normal">الموقع:</span>
                    <span className="text-slate-700">{merchantToDelete.location}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMerchantToDelete(null)}
                className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                id="confirm-delete-merchant-btn"
                onClick={() => {
                  onDeleteMerchant(merchantToDelete.id);
                  setMerchantToDelete(null);
                  showToast('تم حذف حساب المندوب بنجاح 🗑️');
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ DELETE PRODUCT CONFIRMATION MODAL ═════════ */}
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
                هل أنت متأكد من حذف هذا العرض نهائياً من المعرض؟
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 space-y-2 text-right mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">اسم العرض:</span>
                  <span className="text-slate-900 font-black truncate max-w-[180px]">{productToDelete.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">المندوب / المتجر:</span>
                  <span className="text-slate-800 font-bold">{productToDelete.merchantName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">القسم:</span>
                  <span className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
                    {productToDelete.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-normal">السعر:</span>
                  <span className="text-rose-600 font-black font-mono">
                    {(productToDelete.discountPrice || productToDelete.originalPrice).toLocaleString('ar-YE')} ريال يمني
                  </span>
                </div>
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
                id="confirm-delete-product-btn"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  showToast('تم حذف العرض بنجاح من المعرض 🗑️');
                }}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merchant / Delegate Registration Modal */}
      {isMerchantModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMerchantModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingMerchant ? 'تعديل بيانات المندوب / التاجر' : 'تسجيل مندوب جديد وتوفير صلاحيات الرفع'}
                </h3>
              </div>
              <button
                onClick={() => setIsMerchantModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMerchantForm} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المندوب / التاجر المصرح *</label>
                <input
                  type="text"
                  required
                  value={merchantFormName}
                  onChange={(e) => setMerchantFormName(e.target.value)}
                  placeholder="مثال: سالم الشبواني - مندوب التقنية"
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر أو المؤسسة التابعة</label>
                <input
                  type="text"
                  value={merchantFormOwner}
                  onChange={(e) => setMerchantFormOwner(e.target.value)}
                  placeholder="مثال: مركز عتق للتقنية"
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الواتساب *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 967770000001"
                  value={merchantFormPhone}
                  onChange={(e) => setMerchantFormPhone(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرمز التعريفي (mCode) *</label>
                  <input
                    type="text"
                    required
                    value={merchantFormMCode}
                    onChange={(e) => setMerchantFormMCode(e.target.value)}
                    placeholder="M-101"
                    className="w-full text-center text-xs font-bold p-2.5 rounded-xl border border-slate-300 tracking-wider text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرمز السري (PIN) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={merchantFormPin}
                    onChange={(e) => setMerchantFormPin(e.target.value)}
                    placeholder="1234"
                    className="w-full text-center text-xs font-bold p-2.5 rounded-xl border border-slate-300 tracking-widest text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موقع المندوب / المحل في عتق</label>
                <input
                  type="text"
                  value={merchantFormLocation}
                  onChange={(e) => setMerchantFormLocation(e.target.value)}
                  placeholder="عتق - شارع درهم، سوق الذهب، إلخ"
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMerchantModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تسجيل المندوب وتوفير صلاحيات الرفع والسحب له ➕</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
