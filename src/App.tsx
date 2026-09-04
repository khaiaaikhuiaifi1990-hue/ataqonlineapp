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
  INITIAL_PRODUCTS,
  INITIAL_MERCHANTS,
  INITIAL_SETTINGS,
  isProductExpired,
  deleteExpiredProductFromFirestore,
  cleanupExpiredProductsInFirestore
} from './firebase';
import { Product, Merchant, Review, PlatformSettings, CartItem, ActiveView } from './types';
import { CustomerStore } from './components/CustomerStore';
import { OwnerDashboard } from './components/OwnerDashboard';
import { MerchantDashboard } from './components/MerchantDashboard';
import { MerchantLoginModal } from './components/MerchantLoginModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { AdminPortal } from './components/AdminPortal';
import { AutoNotificationBanner } from './components/AutoNotificationBanner';
import { 
  triggerAutomaticNewProductNotification,
  registerPushServiceWorker
} from './utils/autoNotificationService';
import { trackDeviceOnStartup } from './utils/userTrackingService';

const CART_STORAGE_KEY = 'ataq_online_cart_v2';
const ACTIVE_MERCHANT_SESSION_KEY = 'ataq_active_merchant_v2';
const OWNER_AUTH_SESSION_KEY = 'ataq_owner_auth_v2';

export function App() {
  // 1. Core State loaded instantly (0ms) from local cache
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

  // Silently register device & push notifications service worker on startup
  useEffect(() => {
    trackDeviceOnStartup();
    registerPushServiceWorker();
  }, []);

  // Global deep link listener: switch to store view when notification is clicked
  useEffect(() => {
    const handleDeepLink = () => {
      setActiveView('store');
    };
    window.addEventListener('ataq_open_product_details', handleDeepLink);
    return () => window.removeEventListener('ataq_open_product_details', handleDeepLink);
  }, []);

  // Fast Startup Verification & Continuous Auto Cleanup for Expired Offers
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

    // Run rapid verification immediately on launch and whenever products change
    runCleanup();

    // Check periodically every 30 seconds
    const interval = setInterval(runCleanup, 30000);
    return () => clearInterval(interval);
  }, [products, settings.autoCleanupExpired]);

  // ─── PRODUCT HANDLERS ──────────────────────────────────────────
  const handleAddProduct = useCallback((newProduct: Product) => {
    setProducts((prev) => {
      const updated = [newProduct, ...prev];
      setLocalCachedProducts(updated);
      return updated;
    });

    // 🚀 Automatic Push Notification to all users (SHEIN-style rich push with Big Picture & Deep Linking)
    triggerAutomaticNewProductNotification(newProduct);
  }, []);

  const handleUpdateProduct = useCallback((updatedProduct: Product) => {
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      setLocalCachedProducts(updated);
      return updated;
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
    setProducts(INITIAL_PRODUCTS);
    setLocalCachedProducts(INITIAL_PRODUCTS);

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
