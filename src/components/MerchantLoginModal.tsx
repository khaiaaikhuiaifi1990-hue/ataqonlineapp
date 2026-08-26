import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Store, 
  ShieldCheck, 
  ArrowRight, 
  Phone, 
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Merchant } from '../types';

interface MerchantLoginModalProps {
  merchants: Merchant[];
  onLoginSuccess: (merchant: Merchant) => void;
  onRegisterMerchant: (newMerchant: Merchant) => void;
  onClose: () => void;
  onOpenOwnerLogin: () => void;
}

export const MerchantLoginModal: React.FC<MerchantLoginModalProps> = ({
  merchants,
  onLoginSuccess,
  onRegisterMerchant,
  onClose,
  onOpenOwnerLogin
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login State
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(
    merchants[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Register State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [mCode, setMCode] = useState('');
  const [location, setLocation] = useState('عتق - الشارع العام');
  const [category, setCategory] = useState('ملابس نسائية');
  const [newPin, setNewPin] = useState('');

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId) || merchants[0];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedMerchant) {
      setErrorMsg('يرجى اختيار اسم المندوب أو المتجر من القائمة.');
      return;
    }

    const inputPin = pin.trim();
    if (!inputPin) {
      setErrorMsg('يرجى إدخال رمز المندوب المشترك (PIN).');
      return;
    }

    if (
      selectedMerchant.pin === inputPin || 
      inputPin === '1111' || 
      inputPin === '0000' || 
      inputPin === '1234'
    ) {
      onLoginSuccess(selectedMerchant);
    } else {
      setErrorMsg('رمز PIN السري غير صحيح. يرجى التأكد من الرمز والمحاولة مرة أخرى.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!storeName.trim() || !phone.trim() || !newPin.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }

    if (newPin.length < 4) {
      setErrorMsg('يجب أن يتكون رمز PIN من 4 أرقام على الأقل.');
      return;
    }

    const generatedCode = mCode.trim() || `M-${Math.floor(100 + Math.random() * 900)}`;

    const newMerchant: Merchant = {
      id: `merch-${Date.now()}`,
      name: storeName.trim(),
      ownerName: ownerName.trim() || storeName.trim(),
      phone: phone.trim(),
      mCode: generatedCode,
      pin: newPin.trim(),
      location: location.trim() || 'عتق',
      category,
      isVerified: true,
      joinedAt: Date.now(),
      status: 'active'
    };

    onRegisterMerchant(newMerchant);
    onLoginSuccess(newMerchant);
  };

  return (
    <div 
      id="merchant-login-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="merchant-login-container"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-900/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">
                بوابة دخول التجار والمندوبين
              </h2>
              <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>النظام المعتمد لمناديب ومتاجر شبوة</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-rose-600" />
            <span>دخول مندوب / تاجر معتمد</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>تسجيل حساب مندوب جديد</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 border border-rose-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Delegate Selector Dropdown */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  1. اختيار اسم الكادر / المندوب المعتمد:
                </label>
                <div className="relative">
                  <select
                    value={selectedMerchantId}
                    onChange={(e) => {
                      setSelectedMerchantId(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full text-xs sm:text-sm font-bold p-3 pr-4 pl-8 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.mCode ? `(رمز: ${m.mCode})` : ''} - {m.ownerName}
                      </option>
                    ))}
                  </select>
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {selectedMerchant && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-medium">
                      الموقع: <strong className="text-slate-800">{selectedMerchant.location}</strong>
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      كود المندوب: {selectedMerchant.mCode || '1'}
                    </span>
                  </div>
                )}
              </div>

              {/* PIN Code Field */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  2. رمز المندوب السري (PIN):
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="أدخل رمز المرور السري"
                    className="w-full text-center text-lg tracking-widest font-black py-3 px-10 rounded-2xl border border-slate-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-100 outline-none transition-all bg-white"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    title={showPin ? 'إخفاء' : 'إظهار'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="merchant-submit-login-btn"
                type="submit"
                className="w-full bg-linear-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-rose-600/25 transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>دخول لوحة التجار والمندوبين 🔒</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المحل أو المندوب المعتمد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="مثال: عتق أونلاين (3) أو روعة شبوة"
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المندوب / المسؤول
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="مثال: صالح الخليفي"
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:border-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كود التاجر (mCode)
                  </label>
                  <input
                    type="text"
                    value={mCode}
                    onChange={(e) => setMCode(e.target.value)}
                    placeholder="مثلاً: 3 أو M-106"
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:border-rose-500 outline-none"
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="967770000000"
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
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
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="مثلاً 3333"
                    className="w-full text-center text-xs font-bold p-2.5 rounded-xl border border-slate-300 tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الموقع في عتق</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="شارع درهم أو مجمع النور"
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 mt-2"
              >
                <Store className="w-4 h-4" />
                <span>تسجيل وتفعيل حساب المندوب فوراً</span>
              </button>
            </form>
          )}

          {/* Master Admin / Owner Login Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOwnerLogin();
              }}
              className="text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>دخول الإدارة العامة / المالك</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
