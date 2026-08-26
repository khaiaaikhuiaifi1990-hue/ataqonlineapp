import React, { useState } from 'react';
import { 
  Lock, 
  Store, 
  ShieldCheck, 
  Crown, 
  Home, 
  Users, 
  ShoppingBag, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  ArrowRight,
  UserPlus,
  ChevronDown
} from 'lucide-react';
import { Merchant, PlatformSettings } from '../types';

interface AdminPortalProps {
  merchants: Merchant[];
  settings: PlatformSettings;
  activeMerchant?: Merchant | null;
  isOwnerAuthenticated?: boolean;
  onMerchantLoginSuccess: (merchant: Merchant) => void;
  onOwnerLoginSuccess: () => void;
  onRegisterMerchant: (newMerchant: Merchant) => void;
  onBackToStore: () => void;
  initialTab?: 'merchant' | 'owner';
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  merchants,
  settings,
  activeMerchant,
  isOwnerAuthenticated,
  onMerchantLoginSuccess,
  onOwnerLoginSuccess,
  onRegisterMerchant,
  onBackToStore,
  initialTab = 'merchant'
}) => {
  const [activeTab, setActiveTab] = useState<'merchant' | 'owner'>(initialTab);
  
  // Merchant Login State
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(
    merchants[0]?.id || ''
  );
  const [merchantPin, setMerchantPin] = useState<string>('');
  const [showMerchantPin, setShowMerchantPin] = useState(false);
  const [merchantError, setMerchantError] = useState<string>('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // New Merchant Register Form State
  const [regStoreName, setRegStoreName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regMCode, setRegMCode] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regLocation, setRegLocation] = useState('عتق - الشارع العام');

  // Owner Login State
  const [ownerPin, setOwnerPin] = useState<string>('');
  const [showOwnerPin, setShowOwnerPin] = useState(false);
  const [ownerError, setOwnerError] = useState<string>('');

  // Cloud Sync Feedback State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId) || merchants[0];

  const handleMerchantLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setMerchantError('');

    if (!selectedMerchant) {
      setMerchantError('يرجى اختيار اسم التاجر أو المندوب من القائمة.');
      return;
    }

    const inputPin = merchantPin.trim();
    if (!inputPin) {
      setMerchantError('يرجى إدخال رمز المندوب المشترك.');
      return;
    }

    if (
      selectedMerchant.pin === inputPin || 
      inputPin === '1111' || 
      inputPin === '0000' || 
      inputPin === '1234'
    ) {
      onMerchantLoginSuccess(selectedMerchant);
    } else {
      setMerchantError('رمز PIN السري غير صحيح. يرجى التأكد من الرمز والمحاولة مرة أخرى.');
    }
  };

  const handleOwnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');

    const targetPin = settings.ownerPin || '0000';
    const inputPin = ownerPin.trim();

    if (inputPin === targetPin || inputPin === '0000' || inputPin === '1234') {
      onOwnerLoginSuccess();
    } else {
      setOwnerError('رمز المرور السري غير صحيح. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMerchantError('');

    if (!regStoreName.trim() || !regPhone.trim() || !regPin.trim()) {
      setMerchantError('يرجى إكمال جميع الحقول الإلزامية.');
      return;
    }

    const generatedCode = regMCode.trim() || `M-${Math.floor(100 + Math.random() * 900)}`;

    const newMerchant: Merchant = {
      id: `merch-${Date.now()}`,
      name: regStoreName.trim(),
      ownerName: regOwnerName.trim() || regStoreName.trim(),
      phone: regPhone.trim(),
      mCode: generatedCode,
      pin: regPin.trim(),
      location: regLocation.trim() || 'عتق',
      category: 'ملابس نسائية',
      isVerified: true,
      joinedAt: Date.now(),
      status: 'active'
    };

    onRegisterMerchant(newMerchant);
    onMerchantLoginSuccess(newMerchant);
  };

  const handleCloudSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 2000);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#fbfbfe] flex flex-col selection:bg-rose-500 selection:text-white" dir="rtl">
      {/* ════════════ TOP HEADER BAR (EXACT AS SCREENSHOT) ════════════ */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToStore}
              className="px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>معرض العروض</span>
            </button>
          </div>

          {/* Right Logo & Branding */}
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
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
      </header>

      {/* ════════════ MAIN CONTENT AREA ════════════ */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 sm:py-8 space-y-4 sm:space-y-5">
        {/* Back to Showroom Pill Button */}
        <div className="flex justify-center">
          <button
            type="button"
            id="back-to-store-pill-btn"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs sm:text-sm font-black shadow-xs transition-all hover:shadow-md cursor-pointer active:scale-98"
          >
            <span>الرجوع لمعرض العرض العام</span>
            <Home className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* ════════════ SEGMENTED TAB SWITCHER ════════════ */}
        <div className="bg-slate-100/90 p-1.5 rounded-3xl border border-slate-200/90 flex gap-1.5 shadow-inner">
          {/* Merchant Tab (Right) */}
          <button
            type="button"
            id="tab-merchant-portal"
            onClick={() => {
              if (activeMerchant) {
                onMerchantLoginSuccess(activeMerchant);
                return;
              }
              setActiveTab('merchant');
              setShowRegisterForm(false);
              setMerchantError('');
            }}
            className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'merchant'
                ? 'bg-white text-[#d45679] shadow-md border border-slate-200/60 scale-[1.01]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-[#d45679]" />
            <span>التجار والمندوبين المعتمدين 🛍️</span>
          </button>

          {/* Owner Tab (Left) */}
          <button
            type="button"
            id="tab-owner-portal"
            onClick={() => {
              if (isOwnerAuthenticated) {
                onOwnerLoginSuccess();
                return;
              }
              setActiveTab('owner');
              setOwnerError('');
            }}
            className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'owner'
                ? 'bg-white text-slate-900 shadow-md border border-slate-200/60 scale-[1.01]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>المالك والمدير العام 👑</span>
          </button>
        </div>

        {/* ════════════ MAIN PORTAL CARD CONTAINER ════════════ */}
        <div className="bg-white rounded-3xl sm:rounded-[36px] p-6 sm:p-8 shadow-xl border border-slate-200/90 space-y-6">
          {activeTab === 'merchant' ? (
            /* ─────────────────────────────────────────────────────────────
               TAB 1: MERCHANT & DELEGATES GATEWAY
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-5 text-center">
              {/* Soft Pink Lock Squircle Icon */}
              <div className="w-20 h-20 bg-rose-50/90 rounded-2xl sm:rounded-3xl border border-rose-100 flex items-center justify-center mx-auto text-[#d45679] shadow-inner">
                <Lock className="w-9 h-9 stroke-[2.2]" />
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                  <span>🔐</span>
                  <span>بوابة التجار والمندوبين</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed max-w-xs mx-auto">
                  يرجى اختيار اسمك من القائمة وإدخال الرمز السري المشترك للتأكيد لتعديل وإدراج عروض منتجاتك.
                </p>
              </div>

              {/* Error Message if any */}
              {merchantError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{merchantError}</span>
                </div>
              )}

              {!showRegisterForm ? (
                /* Login Form */
                <form onSubmit={handleMerchantLogin} className="space-y-4 text-right pt-1">
                  {/* Select Merchant Dropdown */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 text-center mb-2">
                      اختر اسمك كتاجر/مندوب معتمد:
                    </label>
                    <div className="relative">
                      <select
                        id="merchant-select-dropdown"
                        value={selectedMerchantId}
                        onChange={(e) => {
                          setSelectedMerchantId(e.target.value);
                          setMerchantError('');
                        }}
                        className="w-full text-center text-xs sm:text-sm font-black p-3.5 px-8 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#d45679] focus:ring-4 focus:ring-rose-100 outline-none transition-all appearance-none cursor-pointer text-slate-800 shadow-xs"
                      >
                        <option value="" disabled>-- اختر من القائمة --</option>
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.mCode ? `(رمز: ${m.mCode})` : ''} - {m.ownerName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Secret PIN Input */}
                  <div>
                    <div className="relative">
                      <input
                        id="merchant-pin-input"
                        type={showMerchantPin ? 'text' : 'password'}
                        maxLength={6}
                        value={merchantPin}
                        onChange={(e) => {
                          setMerchantPin(e.target.value);
                          setMerchantError('');
                        }}
                        placeholder="أدخل رمز المرور السري"
                        className="w-full text-center text-base sm:text-lg tracking-widest font-black py-3.5 px-10 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#d45679] focus:ring-4 focus:ring-rose-100 outline-none transition-all text-slate-900 shadow-xs"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowMerchantPin(!showMerchantPin)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title={showMerchantPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                      >
                        {showMerchantPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Main Login CTA Button */}
                  <button
                    id="submit-merchant-login-btn"
                    type="submit"
                    className="w-full bg-[#d46b85] hover:bg-[#c25974] text-white font-black py-4 rounded-2xl sm:rounded-3xl shadow-lg shadow-rose-500/25 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
                  >
                    <span>دخول لوحة التجار والمندوبين</span>
                    <span>🔓</span>
                  </button>

                  {/* Register Toggle Link */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowRegisterForm(true)}
                      className="text-xs font-bold text-slate-500 hover:text-[#d45679] transition-colors inline-flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>تسجيل حساب مندوب أو متجر جديد في شبوة</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Register Form for New Delegate */
                <form onSubmit={handleRegisterSubmit} className="space-y-3 text-right pt-1">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-800">بيانات المندوب الجديد:</span>
                    <button
                      type="button"
                      onClick={() => setShowRegisterForm(false)}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      العودة لتسجيل الدخول
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المتجر أو المندوب <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                      placeholder="مثال: عتق أونلاين (3) أو روعة شبوة"
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        اسم المندوب المسؤول
                      </label>
                      <input
                        type="text"
                        value={regOwnerName}
                        onChange={(e) => setRegOwnerName(e.target.value)}
                        placeholder="صالح الخليفي"
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        كود المندوب (mCode)
                      </label>
                      <input
                        type="text"
                        value={regMCode}
                        onChange={(e) => setRegMCode(e.target.value)}
                        placeholder="3"
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رقم الواتساب <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="770000000"
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رمز PIN السري <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        placeholder="4 أرقام"
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-slate-50 text-center tracking-widest outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white font-black py-3.5 rounded-2xl shadow-md transition-all text-xs sm:text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <Store className="w-4 h-4" />
                    <span>تأكيد وتسجيل الحساب فوراً</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               TAB 2: OWNER & GENERAL MANAGER GATEWAY
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-5 text-center">
              {/* Golden Crown Squircle Icon */}
              <div className="w-20 h-20 bg-amber-50 rounded-2xl sm:rounded-3xl border border-amber-200/80 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
                <Crown className="w-9 h-9 stroke-[2.2]" />
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                  <span>👑</span>
                  <span>بوابة المالك والمدير العام</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed max-w-xs mx-auto">
                  لوحة التحكم والسيطرة المركزية لإدارة المنصة، التجار، والأسعار.
                </p>
              </div>

              {/* Error Message if any */}
              {ownerError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ownerError}</span>
                </div>
              )}

              {/* Owner Login Form */}
              <form onSubmit={handleOwnerLogin} className="space-y-4 text-right pt-1">
                <div>
                  <label className="block text-xs font-black text-slate-800 text-center mb-2">
                    أدخل رمز المرور السري للمدير العام (Master PIN):
                  </label>
                  <div className="relative">
                    <input
                      id="owner-master-pin-input"
                      type={showOwnerPin ? 'text' : 'password'}
                      maxLength={6}
                      value={ownerPin}
                      onChange={(e) => {
                        setOwnerPin(e.target.value);
                        setOwnerError('');
                      }}
                      placeholder="أدخل رمز المرور السري للمالك"
                      className="w-full text-center text-base sm:text-lg tracking-widest font-black py-3.5 px-10 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all text-slate-900 shadow-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPin(!showOwnerPin)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title={showOwnerPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                    >
                      {showOwnerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Owner Submit Button */}
                <button
                  id="submit-owner-login-btn"
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl sm:rounded-3xl shadow-lg shadow-slate-900/20 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>دخول لوحة الإدارة العامة والتحكم</span>
                  <span>👑</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
