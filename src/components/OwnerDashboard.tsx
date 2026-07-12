import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Users, Key, Save, UserPlus, Phone, BadgePlus, UserMinus, ShieldAlert, CheckCircle, Trash2, ArrowLeftRight, HelpCircle, MessageCircle, FolderPlus, LayoutGrid } from 'lucide-react';
import { Agent, Category } from '../types';

interface OwnerDashboardProps {
  adminPasswordLive: string;
  ownerPasswordLive: string;
  rawMargin: number;
  onUpdateConfig: (newMargin: number, newMerchantCode: string, newOwnerCode: string) => Promise<void>;
  agents: Agent[];
  onAddAgent: (name: string, phone: string, mCode: string) => Promise<void>;
  onToggleAgentStatus: (id: string, currentStatus: 'active' | 'suspended') => Promise<void>;
  onDeleteAgent: (id: string) => Promise<void>;
  customerServicePhones?: string[];
  onUpdateCSPhones?: (phones: string[]) => Promise<void>;
  categories?: Category[];
  onUpdateCategories?: (cats: Category[]) => Promise<void>;
  expiredOffersCount?: number;
  onDeleteAllExpired?: () => void;
  autoDeleteExpired?: boolean;
  onUpdateAutoDelete?: (enabled: boolean) => void;
}

export default function OwnerDashboard({
  adminPasswordLive,
  ownerPasswordLive,
  rawMargin,
  onUpdateConfig,
  agents,
  onAddAgent,
  onToggleAgentStatus,
  onDeleteAgent,
  customerServicePhones = ['967733221100'],
  onUpdateCSPhones,
  categories = [],
  onUpdateCategories,
  expiredOffersCount = 0,
  onDeleteAllExpired,
  autoDeleteExpired = true,
  onUpdateAutoDelete,
}: OwnerDashboardProps) {
  // Config state
  const [marginInput, setMarginInput] = useState<number>(rawMargin);
  const [merchantPassInput, setMerchantPassInput] = useState<string>(adminPasswordLive);
  const [ownerPassInput, setOwnerPassInput] = useState<string>(ownerPasswordLive);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Customer Service state
  const [newCSPhone, setNewCSPhone] = useState('');
  const [isAddingCS, setIsAddingCS] = useState(false);
  const [csError, setCsError] = useState<string | null>(null);

  // New Agent input state
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentMCode, setAgentMCode] = useState('');
  const [isAddingAgent, setIsAddingAgent] = useState(false);

  // Category state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryConfirm, setCategoryConfirm] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      setCategoryError('الرجاء إدخال اسم القسم! ⚠️');
      return;
    }
    const exists = categories.some(cat => cat.value.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      setCategoryError('هذا القسم مضاف بالفعل! ⚠️');
      return;
    }

    try {
      setIsAddingCategory(true);
      const updated = [...categories, { value: cleanName, icon: newCategoryIcon }];
      if (onUpdateCategories) {
        await onUpdateCategories(updated);
        setNewCategoryName('');
        setNewCategoryIcon('📦');
      }
    } catch (err) {
      console.error(err);
      setCategoryError('فشل إضافة القسم الجديد ❌');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    setCategoryError(null);
    if (categories.length <= 1) {
      setCategoryError('يجب بقاء قسم واحد على الأقل بالمتجر! ⚠️');
      return;
    }
    setCategoryConfirm(categoryToDelete);
  };

  const executeDeleteCategory = async (categoryToDelete: string) => {
    try {
      const updated = categories.filter(c => c.value !== categoryToDelete);
      if (onUpdateCategories) {
        await onUpdateCategories(updated);
      }
    } catch (err) {
      console.error(err);
      setCategoryError('حدث خطأ أثناء حذف القسم ❌');
    } finally {
      setCategoryConfirm(null);
    }
  };

  const handleAddCSPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCsError(null);
    const cleanPhone = newCSPhone.trim();
    if (!cleanPhone) {
      setCsError('الرجاء إدخال رقم هاتف صحيح ⚠️');
      return;
    }
    if (customerServicePhones.includes(cleanPhone)) {
      setCsError('هذا الرقم مضاف بالفعل! ⚠️');
      return;
    }

    try {
      setIsAddingCS(true);
      const updated = [...customerServicePhones, cleanPhone];
      if (onUpdateCSPhones) {
        await onUpdateCSPhones(updated);
        setNewCSPhone('');
      }
    } catch (err) {
      console.error(err);
      setCsError('فشل إضافة رقم خدمة العملاء ❌');
    } finally {
      setIsAddingCS(false);
    }
  };

  const handleDeleteCSPhone = async (phoneToDelete: string) => {
    setCsError(null);
    if (customerServicePhones.length <= 1) {
      setCsError('لا يمكن حذف آخر رقم لخدمة العملاء. يجب توفر رقم واحد على الأقل! ⚠️');
      return;
    }

    try {
      const updated = customerServicePhones.filter(p => p !== phoneToDelete);
      if (onUpdateCSPhones) {
        await onUpdateCSPhones(updated);
      }
    } catch (err) {
      console.error(err);
      setCsError('حدث خطأ أثناء حذف الرقم ❌');
    }
  };

  // Handle saving core configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantPassInput.trim() || !ownerPassInput.trim()) {
      alert('الرجاء تعبئة حقول كلمات المرور بشكل دقيق! ⚠️');
      return;
    }
    
    try {
      setIsSavingConfig(true);
      await onUpdateConfig(marginInput, merchantPassInput.trim(), ownerPassInput.trim());
    } catch (err) {
      console.error(err);
      alert('فشل تطبيق التحديث بـ Firestore ❌');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle adding new agent to system
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim() || !agentMCode.trim()) {
      alert('يرجى ملء جميع حقول المندوب بدقة ⚠️');
      return;
    }

    try {
      setIsAddingAgent(true);
      await onAddAgent(agentName.trim(), agentPhone.trim(), agentMCode.trim().toUpperCase());
      // Reset inputs
      setAgentName('');
      setAgentPhone('');
      setAgentMCode('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تسجيل المندوب بالسيرفر ❌');
    } finally {
      setIsAddingAgent(false);
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Overview Intro Banner */}
      <div className="bg-rose-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-900/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase">
            👑 لوحة الإشراف العام - مالك التطبيق
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-sans leading-tight">
            نظام التحكم المركزي لعتق أونلاين
          </h2>
          <p className="text-rose-100/80 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            مرحباً بك يا صديقي المدير. من هنا يمكنك تحديد هامش ربح المتجر، وتعديل كلمات المرور الفورية للتاجر ونفسك، والموافقة الفورية على حسابات المندوبين أو حظرهم ومنعهم من النشر.
          </p>
        </div>
      </div>

      {/* Main Grid: Left is Configuration, Right is User Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Core Settings Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xl shadow-rose-950/[0.01] space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 bg-rose-50 text-[#b7336a] rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-950 text-lg leading-tight">ضبط المتغيرات والنسب</h3>
                <span className="text-[10px] text-gray-400 font-bold">تعديل قيم وعمولات المتجر الفورية</span>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} action="javascript:void(0);" className="space-y-6">
              
              {/* Margin Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                  <span className="flex items-center gap-1">📊 هامش أرباح عتق أونلاين للمشتركين:</span>
                  <span className="text-rose-700 text-sm font-black font-sans">{marginInput}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={marginInput}
                  onChange={(e) => setMarginInput(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#b7336a]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-extrabold font-mono">
                  <span>0% (بدون ربح)</span>
                  <span>50%</span>
                  <span>100% (ضعف التكلفة)</span>
                  <span>150%</span>
                </div>
                <p className="text-[11px] text-gray-400 font-semibold leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                  💡 عند إدخال المندوب لتكلفة سلعة بـ <strong className="text-gray-750">1,000 ريال</strong>، ستعرض للمستهلك بتسعيرة <strong className="text-[#b7336a]">{(1000 * (1 + marginInput / 100)).toLocaleString()} ريال</strong> تلقائياً.
                </p>
              </div>

              {/* Passwords adjustment */}
              <div className="space-y-4 pt-2 border-t border-gray-50">
                
                {/* Merchant Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-gray-400" />
                    <span>رمز وصول التجار والمندوبين الموحد (لتصفح قائمة الرفع):</span>
                  </label>
                  <input
                    type="text"
                    value={merchantPassInput}
                    onChange={(e) => setMerchantPassInput(e.target.value)}
                    placeholder="ضع كود التاجر هنا..."
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#b7336a]/20 focus:border-[#b7336a]"
                  />
                  <span className="text-[10px] text-gray-400 block font-semibold leading-none mt-1">
                    * هذا هو الرمز الذي ستعطيه للمناديب ليدخلوا به لوحة الرفع.
                  </span>
                </div>

                {/* Owner Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
                    <span>رمز دخول المالك (المدير العام):</span>
                  </label>
                  <input
                    type="text"
                    value={ownerPassInput}
                    onChange={(e) => setOwnerPassInput(e.target.value)}
                    placeholder="ضع كود المالك السري..."
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-950"
                  />
                  <span className="text-[10px] text-gray-400 block font-semibold leading-none mt-1">
                    * هذا الرمز خاص بك وحدك! لا تدعه يتسرب لأي مستخدم آخر.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingConfig}
                className="w-full bg-[#b7336a] text-white py-3 px-5 rounded-2xl font-black text-xs sm:text-sm shadow-md hover:bg-[#a02c5c] focus:outline-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingConfig ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري حفظ القيم بـ Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ وتطبيق الخيارات فورياً في السيرفر ☁️</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Explanatory note */}
          <div className="bg-rose-50/30 border border-rose-100/50 rounded-2xl p-4 text-xs font-semibold text-rose-950 leading-relaxed space-y-1">
            <span className="block font-bold">✨ حماية الخوادم وعتق أونلاين:</span>
            <p className="text-gray-500 font-medium">
              عند نقرك على حفظ، تُعدّل القيم بقاعدة بيانات Firestore السحابية فوراً (بدون حاجة لإعادة صيانة التطبيق)، وتستجيب جميع متصفحات العملاء والزوار للنسبة الجديدة مباشرة!
            </p>
          </div>

          {/* Customer Service Numbers Panel */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xl shadow-rose-950/[0.01] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-rose-50 text-[#b7336a] rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-950 text-sm leading-tight">أرقام خدمة العملاء (التوزيع الدواري)</h3>
                <span className="text-[10px] text-gray-400 font-bold block">التناوب التلقائي بالتساوي لطلبات الواتساب العامة</span>
              </div>
            </div>

            <form onSubmit={handleAddCSPhone} className="flex gap-2">
              <input
                type="text"
                value={newCSPhone}
                onChange={(e) => setNewCSPhone(e.target.value)}
                placeholder="رقم الواتساب (مثال: 777094875)"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#b7336a]"
              />
              <button
                type="submit"
                disabled={isAddingCS}
                className="bg-[#b7336a] hover:bg-[#a02c5c] text-white px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {isAddingCS ? 'جاري...' : 'إضافة ➕'}
              </button>
            </form>

            {csError && (
              <p className="text-[10px] text-red-600 font-extrabold bg-red-50 p-2 rounded-lg">
                {csError}
              </p>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {customerServicePhones.map((phone, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#b7336a]/10 text-[#b7336a] text-[10px] font-black rounded-full flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800 font-mono" dir="ltr">
                      {phone}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteCSPhone(phone)}
                    disabled={customerServicePhones.length <= 1}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                    title="حذف رقم خدمة العملاء"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-gray-400 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium leading-relaxed">
              💡 <strong>كيف تعمل الميزة؟</strong> عند تصفح الزبون للمتجر والنقر على زر <strong>"تقديم طلب بالواتساب"</strong> على منتج لا يحتوي على كود مندوب خاص (مخصوم)، سيتم تحويل الزبون إلى الأرقام المضافة أعلاه بالتناوب التلقائي (الزبون الأول يذهب للرقم 1، والزبون الثاني للرقم 2، وهكذا...) لضمان توزيع الطلبات بالتساوي بين موظفي خدمة العملاء!
            </div>
          </div>

          {/* Store Categories Management Panel */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xl shadow-rose-950/[0.01] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-rose-50 text-[#b7336a] rounded-lg flex items-center justify-center">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-950 text-sm leading-tight">إدارة أقسام وتصنيفات المتجر</h3>
                <span className="text-[10px] text-gray-400 font-bold block">إضافة وتعديل وحذف تصنيفات المنتجات الحالية</span>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-2.5">
              <div className="flex gap-2">
                {/* Emoji Selector */}
                <select
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-1 focus:ring-[#b7336a]"
                  title="اختر أيقونة/إيموجي القسم"
                >
                  <option value="👗">👗</option>
                  <option value="👶">👶</option>
                  <option value="💄">💄</option>
                  <option value="🍳">🍳</option>
                  <option value="🛏️">🛏️</option>
                  <option value="👔">👔</option>
                  <option value="🔥">🔥</option>
                  <option value="👜">👜</option>
                  <option value="👠">👠</option>
                  <option value="💍">💍</option>
                  <option value="📦">📦</option>
                  <option value="✨">✨</option>
                  <option value="🌸">🌸</option>
                </select>

                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="اسم القسم الجديد (مثال: حقائب فاخرة)"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#b7336a]"
                />
                
                <button
                  type="submit"
                  disabled={isAddingCategory}
                  className="bg-[#b7336a] hover:bg-[#a02c5c] text-white px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {isAddingCategory ? 'جاري...' : 'إضافة ➕'}
                </button>
              </div>
            </form>

            {categoryError && (
              <p className="text-[10px] text-red-600 font-extrabold bg-red-50 p-2 rounded-lg">
                {categoryError}
              </p>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {cat.icon || '📦'}
                    </span>
                    <span className="text-xs font-bold text-gray-800">
                      {cat.value}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteCategory(cat.value)}
                    disabled={categories.length <= 1}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                    title="حذف هذا القسم"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-gray-400 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium leading-relaxed">
              💡 <strong>كيف تعمل الميزة؟</strong> عند إضافة قسم جديد، سيظهر فوراً كخيار للتجار/المناديب أثناء رفع المنتجات في لوحة الرفع، وكفلتر تصفح سريع أعلى متجر الزبائن لتسهيل فرز السلع والمنتجات!
            </div>
          </div>

          {/* Delete Expired Offers Panel */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xl shadow-rose-950/[0.01] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-950 text-sm leading-tight">تنظيف وصيانة المعرض</h3>
                <span className="text-[10px] text-gray-400 font-bold block">إدارة حذف العروض والموديلات منتهية الصلاحية</span>
              </div>
            </div>

            {/* Toggle Switch Card */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="space-y-0.5 text-right">
                <span className="text-xs font-black text-gray-800 block">حذف تلقائي مستمر:</span>
                <span className="text-[10px] font-bold text-gray-400 block">حذف العروض من السيرفر فور انتهاء مدتها</span>
              </div>
              <button
                onClick={() => onUpdateAutoDelete && onUpdateAutoDelete(!autoDeleteExpired)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoDeleteExpired ? 'bg-[#b7336a]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoDeleteExpired ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-red-50/50 border border-red-100 rounded-2xl">
              <div className="space-y-0.5 text-right">
                <span className="text-xs font-black text-red-950 block">العروض المنتهية حالياً:</span>
                <span className="text-[10px] font-bold text-red-600 block">العروض التي تجاوزت موعد انتهاء الصلاحية المحدد</span>
              </div>
              <span className="bg-red-100 text-red-700 text-sm font-black px-3.5 py-1.5 rounded-xl font-mono">
                {expiredOffersCount} {expiredOffersCount === 1 ? 'عرض' : 'عروض'}
              </span>
            </div>

            <button
              onClick={onDeleteAllExpired}
              disabled={!expiredOffersCount || expiredOffersCount === 0 || autoDeleteExpired}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-red-950/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{autoDeleteExpired ? 'التنظيف التلقائي مستمر ونشط ⚡' : 'حذف كافة العروض منتهية الصلاحية نهائياً 🗑️'}</span>
            </button>

            <div className="text-[10px] text-gray-400 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium leading-relaxed">
              💡 <strong>كيف تعمل الميزة؟</strong> عند تفعيل <strong>الحذف التلقائي المستمر</strong>، سيقوم النظام بمراقبة العروض وحذف أي موديل من قاعدة البيانات فور انتهاء وقته تماماً. وإذا قمت بإيقافه، يمكنك حذف الموديلات المنتهية يدوياً في أي وقت بضغطة واحدة باستخدام الزر أعلاه!
            </div>
          </div>
        </div>

        {/* User / Agent Management Center (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xl shadow-rose-950/[0.01] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-rose-50 text-[#b7336a] rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-950 text-lg leading-tight">إدارة حسابات المناديب والمصرحين</h3>
                  <span className="text-[10px] text-gray-400 font-bold">كل مناديب عتق أونلاين المعتمدين لتنزيل السلع</span>
                </div>
              </div>
              <span className="bg-rose-50 text-[#b7336a] text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-100">
                {agents.length} مندوب مرخص
              </span>
            </div>

            {/* Layout divided: top adds agent, bottom list them */}
            
            {/* Create new Agent form */}
            <div className="bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-xs font-black text-gray-700 mb-3 flex items-center gap-1.5 leading-none">
                <UserPlus className="w-4 h-4 text-[#b7336a]" />
                <span>إضافة مندوب أو تاجر مرخص جديد للمتجر:</span>
              </h4>

              <form onSubmit={handleCreateAgent} action="javascript:void(0);" className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-bold text-gray-700">
                <div className="sm:col-span-4 space-y-1">
                  <span>اسم المندوب:</span>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="مثال: صالح العولقي"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#b7336a]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <span>رقم الهاتف/الواتساب:</span>
                  <input
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="مثال: 777123456"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#b7336a]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <span>رمز تعريفي (mCode):</span>
                  <input
                    type="text"
                    value={agentMCode}
                    onChange={(e) => setAgentMCode(e.target.value)}
                    placeholder="مثال: S1"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#b7336a]"
                  />
                </div>
                <div className="sm:col-span-12 pt-1">
                  <button
                    type="submit"
                    disabled={isAddingAgent}
                    className="w-full bg-rose-950 text-white font-extrabold py-2.5 rounded-xl transition-all hover:bg-rose-900 flex items-center justify-center gap-1.5"
                  >
                    <BadgePlus className="w-4 h-4" />
                    <span>تسجيل المندوب وتوفير صلاحيات الرفع والسحب له 🚀</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of active agents */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold text-gray-400">📋 المناديب المسجلين بالخادم حالياً:</span>
              
              {agents.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/20 border border-dashed border-gray-200 rounded-2xl">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-450 font-bold">لا يوجد أي مناديب مسجلين حالياً بالمركب.</p>
                  <p className="text-[10px] text-gray-400 mt-1">يرجى تسجيل المندوبين وتزويدهم برموز لفلترة عروضهم بمحرك البحث.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`g-white border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        agent.status === 'suspended'
                          ? 'bg-red-50/20 border-red-100 text-red-950'
                          : 'bg-white border-gray-150 text-gray-900 hover:border-gray-200 shadow-sm'
                      }`}
                    >
                      {/* Agent Info */}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold shrink-0 border ${
                          agent.status === 'suspended'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-rose-50 text-[#b7336a] border-rose-100'
                        }`}>
                          {agent.mCode}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-sm font-black">{agent.name}</strong>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              agent.status === 'suspended'
                                ? 'bg-red-100/50 text-red-850'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {agent.status === 'suspended' ? 'موقوف إدارياً 🛑' : 'مؤهل ونشط ✅'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 font-bold">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{agent.phone}</span>
                            <span>•</span>
                            <a
                              href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-0.5 font-sans"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 fill-emerald-600 shrink-0" />
                              <span>راسله</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Control Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleAgentStatus(agent.id, agent.status)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                            agent.status === 'suspended'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {agent.status === 'suspended' ? 'تفعيل الصلاحية' : 'إيقاف الصلاحية'}
                        </button>

                        <button
                          onClick={() => onDeleteAgent(agent.id)}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-650 rounded-xl border border-gray-150 transition-all"
                          title="حذف كلي للحساب"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Category Deletion Confirmation Modal */}
      {categoryConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4 text-right"
          >
            <div className="text-red-600 bg-red-50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-2 text-center">
              <h3 className="font-extrabold text-gray-950 text-base">
                تأكيد حذف القسم 📂
              </h3>
              <p className="text-xs text-gray-500 font-bold leading-relaxed">
                هل أنت متأكد من رغبتك في حذف قسم <strong className="text-gray-900">"{categoryConfirm}"</strong>؟ لن يتم حذف السلع المدرجة فيه ولكن لن تظهر تحت هذا التصنيف بعد الآن.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => executeDeleteCategory(categoryConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-red-950/10"
              >
                نعم، تأكيد الحذف 🗑️
              </button>
              <button
                onClick={() => setCategoryConfirm(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                إلغاء ✖️
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
