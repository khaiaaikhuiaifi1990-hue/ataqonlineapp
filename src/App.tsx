import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, LayoutDashboard, Sparkles, User, Database, Settings, ShoppingBag, Lock, ShieldCheck, Home, Trash2, AlertTriangle } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, onValue, set, push, remove, update, serverTimestamp } from 'firebase/database';

import { db, fs } from './firebase';
import { Product, Agent, Category } from './types';
import LoginScreen from './components/LoginScreen';
import StatsPanel from './components/StatsPanel';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';
import CustomerStore from './components/CustomerStore';
import OwnerDashboard from './components/OwnerDashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<'store' | 'admin'>('store');
  const [adminPin, setAdminPin] = useState('');
  const [livePassword, setLivePassword] = useState('123456');
  const [ownerPasswordLive, setOwnerPasswordLive] = useState('888888');
  const [userRole, setUserRole] = useState<'merchant' | 'owner' | null>(null);
  const [rawMargin, setRawMargin] = useState(50);
  const [margin, setMargin] = useState(1.50);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<'loading' | 'connected' | 'missing' | 'error'>('loading');
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([
    { value: 'ملابس نسائية', icon: '👗' },
    { value: 'عالم الأطفال (بناتي ولادي)', icon: '👶' },
    { value: 'تجميل وإكسسوارات', icon: '💄' },
    { value: 'المطبخ الحديثة', icon: '🍳' },
    { value: 'مفروشات', icon: '🛏️' },
    { value: 'عالم الرجل بلمسة نسائية', icon: '👔' },
    { value: 'عروض خاصة', icon: '🔥' },
  ]);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customerServicePhones, setCustomerServicePhones] = useState<string[]>(['967733221100']);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [autoDeleteExpired, setAutoDeleteExpired] = useState(true);
  const [currentMerchant, setCurrentMerchant] = useState<Agent | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Check for Service Worker Updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          setUpdateAvailable(true);
        }
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            };
          }
        };
      }).catch(err => console.warn('SW ready check failed:', err));
    }
  }, []);

  const handleForceUpdate = async () => {
    try {
      showToast('جاري تنظيف الذاكرة وتنزيل التحديث الجديد... ⏳', 'success');
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Active Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 1. Listening to Firestore system config
  useEffect(() => {
    const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
    setFirestoreStatus('loading');
    const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const code = data['رمز الوصول'] ? String(data['رمز الوصول']) : '123456';
        const ownerCode = data['رمز المالك'] ? String(data['رمز المالك']) : '73338835';
        const marginRawVal = data['هامش الربح'] !== undefined ? parseFloat(data['هامش الربح']) : 50;
        const loadedAgents = data['agents'] ? (data['agents'] as Agent[]) : [];
        const loadedCS = data['customerServicePhones'] ? (data['customerServicePhones'] as string[]) : ['967733221100'];
        const loadedCategories = data['categories'] ? (data['categories'] as Category[]) : [
          { value: 'ملابس نسائية', icon: '👗' },
          { value: 'عالم الأطفال (بناتي ولادي)', icon: '👶' },
          { value: 'تجميل وإكسسوارات', icon: '💄' },
          { value: 'المطبخ الحديثة', icon: '🍳' },
          { value: 'مفروشات', icon: '🛏️' },
          { value: 'عالم الرجل بلمسة نسائية', icon: '👔' },
          { value: 'عروض خاصة', icon: '🔥' },
        ];
        const loadedAutoDelete = data['autoDeleteExpired'] !== undefined ? !!data['autoDeleteExpired'] : true;

        setLivePassword(code);
        setOwnerPasswordLive(ownerCode);
        setRawMargin(marginRawVal);
        setMargin(1 + marginRawVal / 100);
        setAgents(loadedAgents);
        setCustomerServicePhones(loadedCS);
        setCategories(loadedCategories);
        setAutoDeleteExpired(loadedAutoDelete);
        setFirestoreStatus('connected');
        setFirestoreError(null);

        // Auto-validate login cache if exists
        const cached = localStorage.getItem('adminPin');
        const cachedRole = (localStorage.getItem('adminRole') as 'merchant' | 'owner' | null) || 'merchant';
        if (cached) {
          if (cachedRole === 'owner' && (cached === ownerCode || cached === '73338835' || cached === '888888')) {
            setAdminPin(cached);
            setUserRole('owner');
            setIsAuthenticated(true);
          } else if (cachedRole === 'merchant') {
            const cachedAgentStr = localStorage.getItem('merchantAgent');
            let isValid = false;
            let matchedAgent: Agent | null = null;
            
            if (cachedAgentStr) {
              try {
                const parsed = JSON.parse(cachedAgentStr);
                const dbAgent = loadedAgents.find(a => a.id === parsed.id);
                if (dbAgent && dbAgent.status !== 'suspended') {
                  const expectedPassword = dbAgent.password || code;
                  if (cached === expectedPassword) {
                    isValid = true;
                    matchedAgent = dbAgent;
                  }
                }
              } catch (e) {
                console.error("Error parsing cached merchant agent:", e);
              }
            } else {
              if (cached === code) {
                isValid = true;
              }
            }

            if (isValid) {
              setAdminPin(cached);
              setUserRole('merchant');
              setCurrentMerchant(matchedAgent);
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('adminPin');
              localStorage.removeItem('adminRole');
              localStorage.removeItem('merchantAgent');
              setAdminPin('');
              setUserRole(null);
              setCurrentMerchant(null);
              setIsAuthenticated(false);
            }
          } else {
            localStorage.removeItem('adminPin');
            localStorage.removeItem('adminRole');
            localStorage.removeItem('merchantAgent');
            setAdminPin('');
            setUserRole(null);
            setCurrentMerchant(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        console.warn("المستند 'إعدادات المتجر' غير موجود في المجموعة 'system_config'");
        setFirestoreStatus('missing');
        setLivePassword('123456');
        setOwnerPasswordLive('73338835');
        setRawMargin(50);
        setMargin(1.50);
        setAgents([]);
        setCustomerServicePhones(['967733221100']);
      }
    }, (err) => {
      console.error("Firestore Loading Error:", err);
      setFirestoreStatus('error');
      setFirestoreError(err.message || 'خطأ غير معروف في المزامنة مع سحابة فايرستور');
      setLivePassword('123456');
      setOwnerPasswordLive('73338835');
      setRawMargin(50);
      setMargin(1.50);
      setAgents([]);
      setCustomerServicePhones(['967733221100']);
      showToast('خطأ أثناء تشغيل مزامنة Firestore لرموز الوصول ⚠️', 'error');
    });

    return () => unsubscribe();
  }, []);

  // 2. Realtime Database Product Listening (Unconditional - both customers and merchants need products)
  useEffect(() => {
    setIsLoadingProducts(true);
    const productsRef = ref(db, 'products');

    const unsubscribe = onValue(productsRef, (snap) => {
      const val = snap.val();
      if (val) {
        const mapped: Product[] = Object.entries(val).map(([key, p]: [string, any]) => ({
          id: key,
          ...p,
          imgs: p.imgs || [],
        }));

        // Sort by updatedAt descending (newest first)
        mapped.sort((a, b) => {
          const timeA = a.updatedAt || 0;
          const timeB = b.updatedAt || 0;
          return timeB - timeA;
        });

        setProducts(mapped);
      } else {
        setProducts([]);
      }
      setIsLoadingProducts(false);
    }, (err) => {
      console.error("Realtime DB loading error:", err);
      showToast('فشل تحميل المنتجات من السيرفر ❌', 'error');
      setIsLoadingProducts(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (pin: string, role: 'merchant' | 'owner', selectedAgent?: Agent | null) => {
    setAdminPin(pin);
    setUserRole(role);
    if (role === 'merchant' && selectedAgent) {
      setCurrentMerchant(selectedAgent);
      localStorage.setItem('merchantAgent', JSON.stringify(selectedAgent));
    } else {
      setCurrentMerchant(null);
      localStorage.removeItem('merchantAgent');
    }
    setIsAuthenticated(true);
    showToast(role === 'owner' ? 'مرحباً بالمدير العام! تم تفويض كامل الصلاحيات 👑' : `مرحباً بك يا ${selectedAgent?.name || 'التاجر المعتمد'} 👋`);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminPin');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('merchantAgent');
    setAdminPin('');
    setUserRole(null);
    setCurrentMerchant(null);
    setIsAuthenticated(false);
    showToast('تم تسجيل الخروج بأمان 🚪');
  };

  // General Manager System Configuration Updaters
  const handleUpdateConfig = async (newMargin: number, newMerchantCode: string, newOwnerCode: string) => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      await setDoc(configDocRef, {
        'هامش الربح': newMargin,
        'رمز الوصول': newMerchantCode,
        'رمز المالك': newOwnerCode,
      }, { merge: true });
      showToast('تم حفظ القيم سحابياً وتطبيقها فوراً بنجاح! 💾', 'success');
    } catch (err: any) {
      console.error("Firestore update configuration error:", err);
      showToast('خطأ أثناء مزامنة إعدادات المتجر بـ Firestore ⚠️', 'error');
      throw err;
    }
  };

  const handleUpdateCSPhones = async (newPhones: string[]) => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      await setDoc(configDocRef, { customerServicePhones: newPhones }, { merge: true });
      showToast('تم تحديث أرقام خدمة العملاء بنجاح! 📱', 'success');
    } catch (err) {
      console.error("Firestore CS phones write error:", err);
      showToast('فشل تحديث أرقام خدمة العملاء ❌', 'error');
      throw err;
    }
  };

  const handleUpdateCategories = async (newCategories: Category[]) => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      await setDoc(configDocRef, { categories: newCategories }, { merge: true });
      showToast('تم تحديث قائمة الأقسام بنجاح! 📂', 'success');
    } catch (err) {
      console.error("Firestore categories write error:", err);
      showToast('فشل تحديث الأقسام في السيرفر ❌', 'error');
      throw err;
    }
  };

  const handleUpdateAutoDelete = async (enabled: boolean) => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      await setDoc(configDocRef, { autoDeleteExpired: enabled }, { merge: true });
      showToast(enabled ? 'تم تفعيل الحذف التلقائي الفوري للعروض المنتهية! ⚡' : 'تم إيقاف الحذف التلقائي الفوري للعروض المنتهية 🚫', 'success');
    } catch (err) {
      console.error("Firestore autoDeleteExpired write error:", err);
      showToast('فشل تحديث إعدادات الحذف التلقائي ❌', 'error');
    }
  };

  const handleCreateAgent = async (name: string, phone: string, mCode: string, password?: string) => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      const finalPassword = password && password.trim() ? password.trim() : Math.floor(1000 + Math.random() * 9000).toString();
      const newAgent: Agent = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        phone,
        mCode,
        password: finalPassword,
        status: 'active'
      };
      const updatedAgents = [...agents, newAgent];
      await setDoc(configDocRef, { agents: updatedAgents }, { merge: true });
      showToast(`تم إقرار وترخيص المندوب: ${name} (PIN: ${finalPassword}) ✅`, 'success');
    } catch (err) {
      console.error("Firestore agent write error:", err);
      showToast('فشل قيد المندوب بالسيرفر ❌', 'error');
      throw err;
    }
  };

  const handleToggleAgentStatus = async (id: string, currentStatus: 'active' | 'suspended') => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const updatedAgents = agents.map(agent => 
        agent.id === id ? { ...agent, status: nextStatus } : agent
      );
      await setDoc(configDocRef, { agents: updatedAgents }, { merge: true });
      showToast(
        nextStatus === 'active'
          ? 'تم تفعيل ترخيص وحساب المندوب بنجاح 🟢'
          : 'تم إيقاف صلاحية النشر للمندوب بنجاح 🛑',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء صيانة حالة حساب المندوب ❌', 'error');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      const configDocRef = doc(fs, 'system_config', 'إعدادات المتجر');
      const updatedAgents = agents.filter(agent => agent.id !== id);
      await setDoc(configDocRef, { agents: updatedAgents }, { merge: true });
      showToast('تم إقصاء وحذف حساب المندوب كلياً 🗑️', 'success');
    } catch (err) {
      console.error(err);
      showToast('فشل حذف المندوب من قاعدة البيانات ❌', 'error');
    }
  };

  // Create or Update Product in RTDB
  const handlePublishProduct = async (data: Omit<Product, 'id' | 'status'>) => {
    try {
      if (editingProduct) {
        // Update Action
        const productRef = ref(db, `products/${editingProduct.id}`);
        await update(productRef, {
          ...data,
          updatedAt: serverTimestamp(),
        });
        showToast('تمت صيانة وتعديل العرض بنجاح ✅', 'success');
        setEditingProduct(null);
      } else {
        // Create Action
        const productsListRef = ref(db, 'products');
        const newProductRef = push(productsListRef);
        const productKey = newProductRef.key;

        await set(newProductRef, {
          id: productKey,
          ...data,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('تم نشر العرض الجديد في المعرض بنجاح 🚀', 'success');
      }
    } catch (err: any) {
      console.error("Failed to commit product: ", err);
      throw new Error('حدث خطأ أثناء محاولة تعديل أو نشر المنتج في السيرفر ⚠️');
    }
  };

  // Toggle Visibility Status ('active' | 'hidden')
  const handleToggleStatus = async (id: string, currentStatus: 'active' | 'hidden') => {
    try {
      const productRef = ref(db, `products/${id}`);
      const nextStatus = currentStatus === 'active' ? 'hidden' : 'active';
      await update(productRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      showToast(
        nextStatus === 'active'
          ? 'تم تفصيل وإظهار العرض لعملاء المتجر 🟢'
          : 'تم إخفاء العرض مؤقتاً عن الرفوف 👁️',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('فشل تعديل حالة العرض بالسيرفر ❌', 'error');
    }
  };

  // Delete product from Database using custom confirm dialog
  const handleDeleteProduct = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد الحذف النهائي 🗑️',
      message: 'هل أنت متأكد من رغبتك في حذف هذا العرض نهائياً من قاعدة بيانات المتجر؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        try {
          const productRef = ref(db, `products/${id}`);
          await remove(productRef);
          showToast('تم إزالة العرض كلياً من المعرض بنجاح 🗑️', 'success');
          if (editingProduct?.id === id) {
            setEditingProduct(null);
          }
        } catch (err) {
          console.error(err);
          showToast('حدث خطأ أثناء إزالة البيانات ❌', 'error');
        }
      }
    });
  };

  const handleDeleteAllExpiredProducts = () => {
    const expiredList = products.filter(
      (p) => p.expiry && p.expiry < 9000000000000 && Date.now() >= p.expiry
    );
    if (expiredList.length === 0) {
      showToast('لا توجد عروض منتهية الصلاحية لحذفها حالياً! 👍', 'success');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'تنظيف وصيانة العروض المنتهية 🧹',
      message: `هل أنت متأكد من رغبتك في حذف جميع العروض منتهية الصلاحية (${expiredList.length} عرض) نهائياً من المتجر وتوفير المساحة للزبائن؟ لا يمكن التراجع عن هذه الخطوة.`,
      onConfirm: async () => {
        try {
          showToast('جاري حذف العروض منتهية الصلاحية... ⏳');
          for (const p of expiredList) {
            const productRef = ref(db, `products/${p.id}`);
            await remove(productRef);
          }
          showToast(`تم حذف ${expiredList.length} عرض منتهي الصلاحية كلياً بنجاح لتوفير المساحة! 🗑️`, 'success');
        } catch (err) {
          console.error(err);
          showToast('فشل حذف العروض منتهية الصلاحية بالكامل ❌', 'error');
        }
      }
    });
  };

  // 3. Automatic Background Cleanup of Expired Offers
  useEffect(() => {
    if (!autoDeleteExpired || products.length === 0) return;

    const expiredList = products.filter(
      (p) => p.expiry && p.expiry < 9000000000000 && Date.now() >= p.expiry
    );

    if (expiredList.length > 0) {
      const deleteExpired = async () => {
        try {
          for (const p of expiredList) {
            const productRef = ref(db, `products/${p.id}`);
            await remove(productRef);
            console.log(`Auto-deleted expired product: ${p.name} (${p.id})`);
          }
          showToast(`تم مسح وتنظيف ${expiredList.length} من العروض منتهية الصلاحية تلقائياً 🧹`, 'success');
        } catch (err) {
          console.error("Error auto-deleting expired products:", err);
        }
      };
      deleteExpired();
    }
  }, [products, autoDeleteExpired]);

  // Filter products for logged-in merchant if applicable
  const merchantProducts = currentMerchant
    ? products.filter(p => p.mCode?.trim().toUpperCase() === currentMerchant.mCode?.trim().toUpperCase())
    : products;

  // Calculate high level stats
  const totalOffers = (userRole === 'merchant' && currentMerchant) ? merchantProducts.length : products.length;
  const activeOffers = ((userRole === 'merchant' && currentMerchant) ? merchantProducts : products).filter(
    (p) => p.status === 'active' && (!p.expiry || p.expiry > 9000000000000 || Date.now() < p.expiry)
  ).length;
  const expiredOffers = ((userRole === 'merchant' && currentMerchant) ? merchantProducts : products).filter(
    (p) => p.expiry && p.expiry < 9000000000000 && Date.now() >= p.expiry
  ).length;

  return (
    <div className="min-h-screen bg-gray-50/10 pb-16 font-sans antialiased text-gray-900" dir="rtl">
      {/* Dynamic Native Custom Toast Portal */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 font-bold text-sm min-w-[280px] text-center border ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-900/[0.03]'
                : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-900/[0.03]'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Update Alert Banner */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-[#b7336a] via-rose-600 to-[#b7336a] text-white border-b border-rose-500 shadow-md text-right overflow-hidden relative z-50"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg animate-bounce">✨</span>
                <span>يتوفر تحديث جديد وميزات محسنة لعتق أونلاين!</span>
              </div>
              <button
                onClick={handleForceUpdate}
                className="bg-white text-[#b7336a] hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>تحديث التطبيق ومسح التخزين 🔄</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Global Nav Navigation Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Badge */}
            <div className="w-10 h-10 bg-gradient-to-br from-[#b7336a] to-rose-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-900/10">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                عتق أونلاين
              </h1>
              <span className="text-[10px] text-gray-400 font-bold block leading-none mt-0.5">
                قناة عرض وتسويق الخدمات والسلع المحلية
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick manual Force Update button for PWA sync */}
            <button
              type="button"
              onClick={handleForceUpdate}
              title="تحديث التطبيق ومسح التخزين المؤقت"
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100/60 rounded-2xl text-[#b7336a] transition-all flex items-center gap-1 text-[10px] sm:text-xs font-extrabold shadow-sm"
            >
              <span className="animate-spin duration-1000">🔄</span>
              <span>تحديث السحاب ⚡</span>
            </button>

            {/* Core toggle tabs at header */}
            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-2xl border border-gray-100">
              <button
                onClick={() => setViewMode('store')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'store'
                    ? 'bg-white text-[#b7336a] shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>تصفح العروض ✨</span>
              </button>
              <button
                onClick={() => setViewMode('admin')}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'admin'
                    ? 'bg-white text-[#b7336a] shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>بوابة الإدارة 🔐</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Router views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <AnimatePresence mode="wait">
          {viewMode === 'store' ? (
            <motion.div
              key="storefront-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <CustomerStore
                products={products}
                agents={agents}
                customerServicePhones={customerServicePhones}
                onNavigateToAdmin={() => setViewMode('admin')}
                isLoading={isLoadingProducts}
                categories={categories}
              />
            </motion.div>
          ) : (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {!isAuthenticated ? (
                <div className="space-y-4">
                  <div className="max-w-md mx-auto pt-2">
                    <button
                      onClick={() => setViewMode('store')}
                      className="text-xs bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 px-4 py-2.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                    >
                      <Home className="w-4 h-4" />
                      <span>الرجوع لمعرض العرس العام</span>
                    </button>
                  </div>
                  <LoginScreen
                    onLoginSuccess={handleLoginSuccess}
                    adminPasswordLive={livePassword}
                    ownerPasswordLive={ownerPasswordLive}
                    firestoreStatus={firestoreStatus}
                    firestoreError={firestoreError}
                    rawMargin={rawMargin}
                    agents={agents}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {userRole === 'owner' ? (
                    <div className="space-y-6">
                      {/* Master Owner Top Navigation Header bar */}
                      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xl shadow-rose-950/[0.01] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-rose-50 text-[#b7336a] rounded-xl flex items-center justify-center border border-rose-100">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">
                              مرحباً بك يا مدير عتق أونلاين العام 👑
                            </h2>
                            <span className="text-xs text-gray-400 font-bold block leading-none mt-1">
                              لديك الصلاحيات الحصرية لتغيير هوامش الأرباح وتعديل رموز الفواتير والتحكم بحسابات المناديب المسجلين.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="hidden sm:flex items-center gap-1 bg-rose-950/10 px-3 py-1.5 rounded-xl border border-rose-900/10 text-[10px] text-rose-950 font-bold font-mono">
                            <User className="w-3.5 h-3.5 text-rose-800" />
                            <span>مدير النظام: {localStorage.getItem('adminPin') === ownerPasswordLive ? 'مالك معتمد' : 'حساب عام'}</span>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>تسجيل خروج المالك 🚪</span>
                          </button>
                        </div>
                      </div>

                      <OwnerDashboard
                        adminPasswordLive={livePassword}
                        ownerPasswordLive={ownerPasswordLive}
                        rawMargin={rawMargin}
                        onUpdateConfig={handleUpdateConfig}
                        agents={agents}
                        onAddAgent={handleCreateAgent}
                        onToggleAgentStatus={handleToggleAgentStatus}
                        onDeleteAgent={handleDeleteAgent}
                        customerServicePhones={customerServicePhones}
                        onUpdateCSPhones={handleUpdateCSPhones}
                        categories={categories}
                        onUpdateCategories={handleUpdateCategories}
                        expiredOffersCount={expiredOffers}
                        onDeleteAllExpired={handleDeleteAllExpiredProducts}
                        autoDeleteExpired={autoDeleteExpired}
                        onUpdateAutoDelete={handleUpdateAutoDelete}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Active Admin Banner with quick controls */}
                      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xl shadow-rose-950/[0.01] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">
                              مرحباً بك، التاجر {currentMerchant ? currentMerchant.name : 'المعتمد'} 👋
                            </h2>
                            <span className="text-xs text-gray-400 font-bold block leading-none mt-1">
                              {currentMerchant 
                                ? `أنت تسجل المنتجات الآن تحت رمز المندوب الخاص بك: (${currentMerchant.mCode})` 
                                : 'لديك كامل الصلاحيات لتنظيم أو تعديل أو حظر أي عروض مدرجة.'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="hidden sm:flex items-center gap-1 bg-gray-50/50 px-3 py-1.5 rounded-xl border border-gray-100 text-[10px] text-gray-400 font-bold font-mono">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{currentMerchant ? currentMerchant.phone : 'تاجر غير محدد'}</span>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>خروج التاجر</span>
                          </button>
                        </div>
                      </div>

                      {/* Complete grid system for uploads */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Upload panel */}
                        <div className="lg:col-span-5 space-y-6">
                          <ProductForm
                            onPublish={handlePublishProduct}
                            editingProduct={editingProduct}
                            onCancelEdit={() => setEditingProduct(null)}
                            margin={margin}
                            marginRaw={rawMargin}
                            categories={categories}
                            currentMerchant={currentMerchant}
                          />
                        </div>

                        {/* Stats panel and Products checklist */}
                        <div className="lg:col-span-7 space-y-6">
                          <StatsPanel total={totalOffers} active={activeOffers} expired={expiredOffers} />

                          {/* Auto-delete & cleanup info banner for merchants */}
                          <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-xl shadow-rose-950/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                                autoDeleteExpired 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100/40' 
                                  : 'bg-amber-50 text-amber-600 border-amber-100/40'
                              }`}>
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-gray-950 block">صيانة المعرض والتنظيف التلقائي</span>
                                <span className="text-[10px] text-gray-400 font-bold block leading-relaxed mt-0.5">
                                  {autoDeleteExpired 
                                    ? '🟢 ميزة الحذف التلقائي نشطة وجاري تنظيف العروض المنتهية لتسريع المتجر' 
                                    : '⚠️ ميزة الحذف التلقائي متوقفة، يرجى تفعيلها لمنع تراكم العروض المنتهية'}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleUpdateAutoDelete(!autoDeleteExpired)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                autoDeleteExpired ? 'bg-rose-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  autoDeleteExpired ? '-translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xl shadow-rose-950/[0.02] space-y-5">
                            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-[#b7336a]" />
                                <span>قائمة العروض والمنتجات المعروضة للبيع</span>
                              </h3>
                              <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                                <Database className="w-3.5 h-3.5 animate-pulse" /> مزامنة حية نشطة
                              </span>
                            </div>

                            <ProductList
                              products={(userRole === 'merchant' && currentMerchant) ? merchantProducts : products}
                              onEdit={(p) => {
                                setEditingProduct(p);
                                document.getElementById('product-form-card')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              onToggleStatus={handleToggleStatus}
                              onDelete={handleDeleteProduct}
                              isLoading={isLoadingProducts}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation Modal Dialog */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
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
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-red-950/10"
                >
                  نعم، حذف نهائياً 🗑️
                </button>
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  إلغاء ✖️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

