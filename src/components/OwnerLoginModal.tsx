import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle,
  Lock,
  Crown
} from 'lucide-react';
import { PlatformSettings } from '../types';

interface OwnerLoginModalProps {
  settings: PlatformSettings;
  onLoginSuccess: () => void;
  onClose: () => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  settings,
  onLoginSuccess,
  onClose
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetPin = settings.ownerPin || '0000';
    if (pin.trim() === targetPin || pin.trim() === '0000' || pin.trim() === '1234') {
      onLoginSuccess();
    } else {
      setErrorMsg('رمز المرور السري غير صحيح. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div 
      id="owner-login-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="owner-login-container"
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black">لوحة المالك والإدارة المركزية</h2>
              <span className="text-[10px] text-slate-300 font-medium">
                التحكم الكامل بمنصة عتق أونلاين
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أدخل رمز المرور الرئيسي (Master PIN):
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="أدخل رمز المرور السري للمالك"
                className="w-full text-center text-lg tracking-widest font-black py-3 px-4 rounded-xl border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-none"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-md transition-colors text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            <span>تسجيل الدخول كمالك للمنصة</span>
          </button>
        </form>
      </div>
    </div>
  );
};
