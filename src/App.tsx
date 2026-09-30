import React, { useState, useEffect, useCallback } from 'react';
import { 
  getLocalCachedProducts, 
  setLocalCachedProducts,
  getLocalCachedMerchants,
  setLocalCachedMerchants,
  getLocalCachedSettings,
  setLocalCachedSettings,
  getLocalCachedReviews,
  setLocalCachedReviews,
  INITIAL_MERCHANTS,
  INITIAL_SETTINGS,
  isProductExpired,
  saveProductToFirestore,
  deleteExpiredProductFromFirestore,
  cleanupExpiredProductsInFirestore,
  subscribeToFirestoreProducts,
  saveSettingsToFirestore,
  subscribeToFirestoreSettings
} from './firebase';
import { Product, Merchant, Review, PlatformSettings, CartItem, ActiveView } from './types';
import { CustomerStore } from './components/CustomerStore';
import { OwnerDashboard } from './components/OwnerDashboard';
import { MerchantDashboard } from './components/MerchantDashboard';
import { MerchantLoginModal } from './components/MerchantLoginModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { AdminPortal } from './components/AdminPortal';
import { AutoNotificationBanner } from './components/AutoNotificationBanner';
import { SplashScreen } from './components/SplashScreen';
import { 
  triggerAutomaticNewProductNotification,
  registerPushServiceWorker
} from './utils/autoNotificationService';
import { trackDeviceOnStartup } from './utils/userTrackingService';

const CART_STORAGE_KEY = 'ataq_online_cart_v2';
const ACTIVE_MERCHANT_SESSION_KEY = 'ataq_active_merchant_v2';
const OWNER_AUTH_SESSION_KEY = 'ataq_owner_auth_v2';

export function App() {
  // Splash Screen State with strict <= 800ms ceiling
  const [showSplash, setShowSplash] = useState(true);

  // 1. Core State loaded instantly (0ms) from local cache (Cache First)
  const [products, setProducts] = useState<Product[]>(() => getLocalCachedProducts());
  const [merchants, setMerchants] = useState<Merchant[]>(() => getLocalCachedMerchants());
  const [settings, setSettings] = useState<PlatformSettings>(() => getLocalCachedSettings());
  const [reviews, setReviews] = useState<Review[]>(() => getLocalCachedReviews());

  // 2. Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 3. Navigation & Authentication State
  const [activeView, setActiveView] = useState<ActiveView>('store');
  const [adminPortalTab, setAdminPortalTab] = useState<'merchant' | 'owner'>('merchant');
  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_MERCHANT_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(OWNER_AUTH_SESSION_KEY) === 'true';
  });

  // Modal Triggers
  const [isMerchantLoginOpen, setIsMerchantLoginOpen] = useState(false);
  const [isOwnerLoginOpen, setIsOwnerLoginOpen] = useState(false);

  const handleOpenAdminPortal = (tab: 'merchant' | 'owner' = 'merchant') => {
    if (tab === 'merchant' && currentMerchant) {
      setActiveView('merchant_dashboard');
      return;
    }
    if (tab === 'owner' && isOwnerAuthenticated) {
      setActiveView('owner_dashboard');
      return;
    }
    setAdminPortalTab(tab);
    setActiveView('admin_portal');
  };

  // Sync Cart changes to Local Storage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Could not save cart to storage:', e);
    }
  }, [cartItems]);

  // Multi-tab storage sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ataq_online_products_cache_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {}
      }
      if (e.key === 'ataq_online_merchants_cache_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMerchants(parsed);
        } catch {}
      }
      if (e.key === 'ataq_online_settings_cache_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setSettings(parsed);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Non-blocking background initialization: run device tracking & SW registration
  // strictly in the background without blocking initial paint or the splash screen
  useEffect(() => {
    const runBackgroundBootstrap = () => {
      trackDeviceOnStartup().catch(() => {});
      registerPushServiceWorker();
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(runBackgroundBootstrap, { timeout: 3000 });
      return () => {
        if ('cancelIdleCallback' in window) window.cancelIdleCallback(handle);
      };
    } else {
      const timer = setTimeout(runBackgroundBootstrap, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Real-time Firestore sync with zero-dummy data and offline cache persistence
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreProducts(
      (liveProducts) => {
        setProducts(liveProducts);
      },
      (err: any) => {
        if (err?.code !== 'unavailable') {
          console.warn('Firestore products subscription notice:', err);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time Firestore sync for Settings (profit margin percentage and platform configs)
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreSettings(
      (liveSettings) => {
        setSettings(liveSettings);
      },
      (err: any) => {
        if (err?.code !== 'unavailable') {
          console.warn('Firestore settings subscription notice:', err);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Global deep link listener: switch to store view when notification is clicked
  useEffect(() => {
    const handleDeepLink = () => {
      setActiveView('store');
    };
    window.addEventListener('ataq_open_product_details', handleDeepLink);
    return () => window.removeEventListener('ataq_open_product_details', handleDeepLink);
  }, []);

  // Continuous Auto Cleanup for Expired Offers (Deferred initial run to prevent blocking startup)
  useEffect(() => {
    const runCleanup = async () => {
      const expiredItems = products.filter((p) => isProductExpired(p));
      if (expiredItems.length > 0) {
        const expiredIds = expiredItems.map((p) => p.id);

        // 1. Immediately prune expired items from state and local cache
        const validProducts = products.filter((p) => !isProductExpired(p));
        setProducts(validProducts);
        setLocalCachedProducts(validProducts);

        // 2. Remove from cart if any expired item was in cart
        setCartItems((prev) => prev.filter((item) => !expiredIds.includes(item.product.id)));

        // 3. Delete or mark as deleted in Firestore collection
        try {
          await cleanupExpiredProductsInFirestore(expiredIds);
        } catch (err) {
          console.warn('Firestore auto-cleanup notice:', err);
        }
      }
    };

    // Defer initial run by 2 seconds so startup remains instantaneous (< 1s)
    const initialTimer = setTimeout(runCleanup, 2000);
    const interval = setInterval(runCleanup, 30000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [products, settings.autoCleanupExpired]);

  // ─── PRODUCT HANDLERS ──────────────────────────────────────────
  const handleAddProduct = useCallback((newProduct: Product) => {
    // 1. Instant local state update (0ms UI response)
    setProducts((prev) => {
      const updated = [newProduct, ...prev];
      setLocalCachedProducts(updated);
      return updated;
    });

    // 2. Non-blocking Firestore persistence in the background
    saveProductToFirestore(newProduct).catch((err) => {
      console.warn('Background Firestore save notice:', err);
    });

    // 3. 🚀 Non-blocking Background Event for Push Notifications:
    // Detached from the main execution thread so the supervisor/merchant doesn't wait
    setTimeout(() => {
      try {
        triggerAutomaticNewProductNotification(newProduct);
      } catch (err) {
        console.warn('Background push notification error:', err);
      }
    }, 120);
  }, []);

  const handleUpdateProduct = useCallback((updatedProduct: Product) => {
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      setLocalCachedProducts(updated);
      return updated;
    });

    // Background Firestore update
    saveProductToFirestore(updatedProduct).catch((err) => {
      console.warn('Background Firestore update notice:', err);
    });
  }, []);

  const handleDeleteProduct = useCallback((productId: string) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      setLocalCachedProducts(updated);
      return updated;
    });

    // Also remove from cart if present
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));

    // Also delete from Firestore if connected
    deleteExpiredProductFromFirestore(productId).catch(() => {});
  }, []);

  const handleUpdateQuantity = useCallback((productId: string, newQty: number) => {
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              quantity: newQty,
              status: newQty > 0 ? ('active' as const) : ('out_of_stock' as const)
            }
          : p
      );
      setLocalCachedProducts(updated);
      return updated;
    });
  }, []);

  const handleToggleOffer = useCallback((productId: string, isOffer: boolean) => {
    setProducts((prev) => {
      const target = prev.find((p) => p.id === productId);
      if (target && isOffer) {
        // Trigger offer announcement push notification
        triggerAutomaticNewProductNotification({ ...target, isOffer: true });
      }
      const updated = prev.map((p) =>
        p.id === productId ? { ...p, isOffer } : p
      );
      setLocalCachedProducts(updated);
      return updated;
    });
  }, []);

  // ─── MERCHANT HANDLERS ─────────────────────────────────────────
  const handleAddMerchant = useCallback((newMerchant: Merchant) => {
    setMerchants((prev) => {
      const updated = [...prev, newMerchant];
      setLocalCachedMerchants(updated);
      return updated;
    });
  }, []);

  const handleUpdateMerchant = useCallback((updatedMerchant: Merchant) => {
    setMerchants((prev) => {
      const updated = prev.map((m) =>
        m.id === updatedMerchant.id ? updatedMerchant : m
      );
      setLocalCachedMerchants(updated);
      return updated;
    });
  }, []);

  const handleDeleteMerchant = useCallback((merchantId: string) => {
    setMerchants((prev) => {
      const updated = prev.filter((m) => m.id !== merchantId);
      setLocalCachedMerchants(updated);
      return updated;
    });
  }, []);

  // ─── SETTINGS HANDLERS ─────────────────────────────────────────
  const handleUpdateSettings = useCallback((newSettings: PlatformSettings) => {
    setSettings(newSettings);
    setLocalCachedSettings(newSettings);
    saveSettingsToFirestore(newSettings).catch((err) => {
      console.warn('Background Firestore settings save notice:', err);
    });
  }, []);

  const handleRestoreData = useCallback(
    (
      restoredProducts: Product[],
      restoredMerchants: Merchant[],
      restoredSettings: PlatformSettings
    ) => {
      setProducts(restoredProducts);
      setLocalCachedProducts(restoredProducts);

      setMerchants(restoredMerchants);
      setLocalCachedMerchants(restoredMerchants);

      setSettings(restoredSettings);
      setLocalCachedSettings(restoredSettings);
    },
    []
  );

  const handleResetToDefault = useCallback(() => {
    setProducts([]);
    setLocalCachedProducts([]);

    setMerchants(INITIAL_MERCHANTS);
    setLocalCachedMerchants(INITIAL_MERCHANTS);

    setSettings(INITIAL_SETTINGS);
    setLocalCachedSettings(INITIAL_SETTINGS);
  }, []);

  // ─── CART HANDLERS ─────────────────────────────────────────────
  const handleAddToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // ─── AUTH & NAVIGATION HANDLERS ────────────────────────────────
  const handleMerchantLoginSuccess = (merchant: Merchant) => {
    setCurrentMerchant(merchant);
    localStorage.setItem(ACTIVE_MERCHANT_SESSION_KEY, JSON.stringify(merchant));
    setIsMerchantLoginOpen(false);
    setActiveView('merchant_dashboard');
  };

  const handleMerchantLogout = () => {
    setCurrentMerchant(null);
    localStorage.removeItem(ACTIVE_MERCHANT_SESSION_KEY);
    setActiveView('store');
  };

  const handleOwnerLoginSuccess = () => {
    setIsOwnerAuthenticated(true);
    localStorage.setItem(OWNER_AUTH_SESSION_KEY, 'true');
    setIsOwnerLoginOpen(false);
    setActiveView('owner_dashboard');
  };

  const handleOwnerLogout = () => {
    setIsOwnerAuthenticated(false);
    localStorage.removeItem(OWNER_AUTH_SESSION_KEY);
    setActiveView('store');
  };

  // ─── RENDER VIEWS ──────────────────────────────────────────────
  return (
    <>
      {showSplash && (
        <SplashScreen
          maxDurationMs={800}
          onComplete={() => {
            setShowSplash(false);
            if (typeof window !== 'undefined' && typeof (window as any).__hideHtmlSplash === 'function') {
              try {
                (window as any).__hideHtmlSplash();
              } catch {}
            }
          }}
        />
      )}

      <AutoNotificationBanner />

      {activeView === 'admin_portal' && (
        <AdminPortal
          merchants={merchants}
          settings={settings}
          activeMerchant={currentMerchant}
          isOwnerAuthenticated={isOwnerAuthenticated}
          initialTab={adminPortalTab}
          onMerchantLoginSuccess={handleMerchantLoginSuccess}
          onOwnerLoginSuccess={handleOwnerLoginSuccess}
          onRegisterMerchant={handleAddMerchant}
          onBackToStore={() => setActiveView('store')}
        />
      )}

      {activeView === 'owner_dashboard' && isOwnerAuthenticated && (
        <OwnerDashboard
          products={products}
          merchants={merchants}
          settings={settings}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onUpdateQuantity={handleUpdateQuantity}
          onToggleOffer={handleToggleOffer}
          onAddMerchant={handleAddMerchant}
          onUpdateMerchant={handleUpdateMerchant}
          onDeleteMerchant={handleDeleteMerchant}
          onUpdateSettings={handleUpdateSettings}
          onRestoreData={handleRestoreData}
          onResetToDefault={handleResetToDefault}
          onBackToStore={() => setActiveView('store')}
          onLogout={handleOwnerLogout}
        />
      )}

      {activeView === 'merchant_dashboard' && currentMerchant && (
        <MerchantDashboard
          merchant={currentMerchant}
          allProducts={products}
          settings={settings}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onUpdateQuantity={handleUpdateQuantity}
          onToggleOffer={handleToggleOffer}
          onBackToStore={() => setActiveView('store')}
          onLogout={handleMerchantLogout}
        />
      )}

      {activeView === 'store' && (
        <CustomerStore
          products={products}
          merchants={merchants}
          settings={settings}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onOpenAdminPortal={handleOpenAdminPortal}
          onOpenMerchantLogin={() => {
            if (currentMerchant) {
              setActiveView('merchant_dashboard');
            } else {
              handleOpenAdminPortal('merchant');
            }
          }}
          onOpenOwnerLogin={() => {
            if (isOwnerAuthenticated) {
              setActiveView('owner_dashboard');
            } else {
              handleOpenAdminPortal('owner');
            }
          }}
        />
      )}

      {/* Merchant Login Modal */}
      {isMerchantLoginOpen && (
        <MerchantLoginModal
          merchants={merchants}
          onLoginSuccess={handleMerchantLoginSuccess}
          onRegisterMerchant={handleAddMerchant}
          onClose={() => setIsMerchantLoginOpen(false)}
          onOpenOwnerLogin={() => {
            setIsMerchantLoginOpen(false);
            setIsOwnerLoginOpen(true);
          }}
        />
      )}

      {/* Master Owner Login Modal */}
      {isOwnerLoginOpen && (
        <OwnerLoginModal
          settings={settings}
          onLoginSuccess={handleOwnerLoginSuccess}
          onClose={() => setIsOwnerLoginOpen(false)}
        />
      )}
    </>
  );
}

export default App;
