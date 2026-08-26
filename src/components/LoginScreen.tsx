import React, { useState } from 'react';
import { Lock, ArrowRight, Store, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onBack
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: 1234 or any input for demo/merchant access
    if (pin.trim() === '1234' || pin.trim() === '0000' || pin.trim().length >= 4) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Store className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900">لوحة تحكم تاجر عتق</h2>
          <p className="text-xs text-slate-500 mt-1">
            أدخل رمز المرور للوصول إلى إدارة العروض والأسعار والأرباح
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="أدخل رمز المرور السري"
                className="w-full text-center text-lg tracking-widest font-black py-3 px-4 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none"
                autoFocus
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {error && (
              <p className="text-xs text-rose-600 font-bold mt-1.5">
                الرمز غير صحيح، يرجى إدخال 4 أرقام على الأقل.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span>دخول لوحة التحكم</span>
            <ShieldCheck className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لمتجر العروض العام</span>
          </button>
        </div>
      </div>
    </div>
  );
};
