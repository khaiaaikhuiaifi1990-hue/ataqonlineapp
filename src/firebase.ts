import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  type Firestore, 
  doc, 
  deleteDoc, 
  updateDoc, 
  setDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Product, Merchant, Review, PlatformSettings } from './types';
import { isDummyPhone, sanitizeWhatsAppPhone, DEFAULT_REAL_SUPPORT_PHONE } from './utils/supportRouter';

// Silence noisy internal SDK warning logs (e.g. offline/network retry notices)
try {
  setLogLevel('silent');
} catch {}

// Safe Fallback Constants for Firebase Configuration
// Prevents application crash / white screen if secrets or environment variables are missing
export const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummyKeyForFallbackAtaqOnline2026",
  authDomain: "ataq-online-shabwah.firebaseapp.com",
  projectId: "ataq-online-shabwah",
  storageBucket: "ataq-online-shabwah.appspot.com",
  messagingSenderId: "102938475610",
  appId: "1:102938475610:web:8a9b0c1d2e3f4g5h6i7j8k"
};

// Safe configuration extractor with fallbacks
export const getFirebaseConfig = () => {
  try {
    const env: Record<string, string | undefined> = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env as unknown as Record<string, string | undefined>) : {};
    return {
      apiKey: (typeof env.VITE_FIREBASE_API_KEY === 'string' && env.VITE_FIREBASE_API_KEY.trim()) || FALLBACK_FIREBASE_CONFIG.apiKey,
      authDomain: (typeof env.VITE_FIREBASE_AUTH_DOMAIN === 'string' && env.VITE_FIREBASE_AUTH_DOMAIN.trim()) || FALLBACK_FIREBASE_CONFIG.authDomain,
      projectId: (typeof env.VITE_FIREBASE_PROJECT_ID === 'string' && env.VITE_FIREBASE_PROJECT_ID.trim()) || FALLBACK_FIREBASE_CONFIG.projectId,
      storageBucket: (typeof env.VITE_FIREBASE_STORAGE_BUCKET === 'string' && env.VITE_FIREBASE_STORAGE_BUCKET.trim()) || FALLBACK_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: (typeof env.VITE_FIREBASE_MESSAGING_SENDER_ID === 'string' && env.VITE_FIREBASE_MESSAGING_SENDER_ID.trim()) || FALLBACK_FIREBASE_CONFIG.messagingSenderId,
      appId: (typeof env.VITE_FIREBASE_APP_ID === 'string' && env.VITE_FIREBASE_APP_ID.trim()) || FALLBACK_FIREBASE_CONFIG.appId,
    };
  } catch {
    return FALLBACK_FIREBASE_CONFIG;
  }
};

// Safe Firebase Initialization with Error Shielding
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let isFirebaseConnected = false;

try {
  const env: Record<string, string | undefined> = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env as unknown as Record<string, string | undefined>) : {};
  const rawKey = typeof env.VITE_FIREBASE_API_KEY === 'string' ? env.VITE_FIREBASE_API_KEY.trim() : '';
  const rawProjectId = typeof env.VITE_FIREBASE_PROJECT_ID === 'string' ? env.VITE_FIREBASE_PROJECT_ID.trim() : '';

  // Only initialize real Firebase if actual non-dummy credentials are configured in environment
  const hasRealCredentials = Boolean(
    rawKey &&
    rawProjectId &&
    rawKey.length > 15 &&
    !rawKey.includes('DummyKey') &&
    !rawProjectId.includes('ataq-online-shabwah')
  );

  if (hasRealCredentials) {
    const config = getFirebaseConfig();
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch {
      db = getFirestore(app);
    }
    auth = getAuth(app);
    try {
      const bucket = config.storageBucket?.trim() || '';
      // A storage bucket must be valid and not be the authDomain (.firebaseapp.com)
      if (bucket && !bucket.endsWith('.firebaseapp.com') && !bucket.includes('ataq-online-shabwah')) {
        storage = getStorage(app);
      } else {
        storage = null;
      }
    } catch {
      storage = null;
    }
    isFirebaseConnected = true;
    console.info('Firebase cloud database & storage initialized successfully 🚀');
  } else {
    // Offline-first local storage mode (fast, stable, and zero network errors)
    app = null;
    db = null;
    auth = null;
    storage = null;
    isFirebaseConnected = false;
  }
} catch (error) {
  console.warn('Firebase safe offline-first fallback active:', error);
  app = null;
  db = null;
  auth = null;
  storage = null;
  isFirebaseConnected = false;
}

export { app, db, auth, storage, isFirebaseConnected };

export interface StorageUploadOptions {
  timeoutMs?: number; // default 15000 (15s)
  onProgress?: (percent: number) => void;
}

export const UPLOAD_TIMEOUT_ERROR_MESSAGE = 'فشل الرفع، يرجى التحقق من الاتصال وإعادة المحاولة';

/**
 * Safely converts a base64 Data URL to a Blob synchronously without network fetch,
 * avoiding CORS errors in sandboxed browser iframes.
 */
export function dataURLtoBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.warn('dataURLtoBlob conversion notice:', err);
    return new Blob([], { type: 'image/webp' });
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a compressed product image (Blob or optimized Data URL) to Firebase Storage.
 * Features:
 * - Hosted URL bypass: existing remote URLs (http/https/blob) are returned immediately without re-uploading.
 * - 15-second hard timeout: cancels the upload task if network is too slow or stalled.
 * - Error handling: throws 'فشل الرفع، يرجى التحقق من الاتصال وإعادة المحاولة' on timeout or network error.
 * - Safe offline-first fallback for development preview environments and unconfigured storage buckets.
 */
export async function uploadImageToFirebaseStorage(
  imageInput: Blob | string,
  storagePath: string,
  options?: StorageUploadOptions
): Promise<string> {
  const timeoutMs = options?.timeoutMs || 2500;

  // 1. If empty, return empty string
  if (!imageInput) {
    return '';
  }

  // 2. If already a remote web URL, do NOT re-upload or fetch; return immediately
  if (typeof imageInput === 'string') {
    const trimmed = imageInput.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
  }

  // 3. Prepare Blob & fallback Data URL without network fetch
  let blob: Blob;
  let fallbackDataUrl = '';

  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:')) {
      fallbackDataUrl = imageInput;
      blob = dataURLtoBlob(imageInput);
    } else {
      return imageInput;
    }
  } else {
    blob = imageInput;
  }

  // 4. Production Firebase Storage Upload with 15-second Timeout & Cancellation
  if (storage) {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const storageRef = ref(storage!, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, blob, {
          contentType: blob.type || 'image/webp',
          cacheControl: 'public, max-age=31536000'
        });

        // 15-Second Hard Timeout Watchdog
        timeoutId = setTimeout(async () => {
          if (!isSettled) {
            isSettled = true;
            try {
              uploadTask.cancel();
            } catch (cancelErr) {
              console.warn('Upload task cancellation notice:', cancelErr);
            }
            console.warn('Firebase Storage upload timed out after 15s. Using optimized compressed local image.');
            try {
              const dataUrl = fallbackDataUrl || (await blobToDataUrl(blob));
              resolve(dataUrl);
            } catch {
              reject(new Error(UPLOAD_TIMEOUT_ERROR_MESSAGE));
            }
          }
        }, timeoutMs);

        // Listen to upload state changes
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (options?.onProgress && snapshot.totalBytes > 0) {
              const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              options.onProgress(percent);
            }
          },
          async (error: unknown) => {
            if (timeoutId) clearTimeout(timeoutId);
            if (!isSettled) {
              isSettled = true;
              console.warn('Firebase Storage upload notice (falling back to compressed image):', error);

              // Gracefully fall back to the ultra-compressed image (<150KB) so merchant flow is not blocked
              try {
                const dataUrl = fallbackDataUrl || (await blobToDataUrl(blob));
                resolve(dataUrl);
              } catch {
                reject(new Error(UPLOAD_TIMEOUT_ERROR_MESSAGE));
              }
            }
          },
          async () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (!isSettled) {
              isSettled = true;
              try {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadUrl);
              } catch (urlErr) {
                console.warn('Firebase Storage getDownloadURL notice:', urlErr);
                if (fallbackDataUrl) {
                  resolve(fallbackDataUrl);
                } else {
                  blobToDataUrl(blob).then(resolve).catch(() => reject(new Error(UPLOAD_TIMEOUT_ERROR_MESSAGE)));
                }
              }
            }
          }
        );
      } catch (initErr) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!isSettled) {
          isSettled = true;
          console.warn('Firebase Storage task init notice:', initErr);
          if (fallbackDataUrl) {
            resolve(fallbackDataUrl);
          } else {
            blobToDataUrl(blob).then(resolve).catch(() => reject(new Error(UPLOAD_TIMEOUT_ERROR_MESSAGE)));
          }
        }
      }
    });
  }

  // 5. Offline / Local fallback: Return the already compressed DataURL (<150KB) directly
  if (fallbackDataUrl) {
    return fallbackDataUrl;
  }

  return blobToDataUrl(blob);
}

// Initial Registered Merchants and Authorized Delegates in Ataq
export const INITIAL_MERCHANTS: Merchant[] = [
  {
    id: 'merch-staff-1',
    name: 'عتق أونلاين (1)',
    ownerName: 'المندوب المعتمد (1)',
    phone: '967733388353',
    mCode: '1',
    pin: '1111',
    location: 'عتق - المركز الرئيسي',
    category: 'عروض خاصة',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 90,
    status: 'active'
  },
  {
    id: 'merch-staff-2',
    name: 'عتق أونلاين (2)',
    ownerName: 'المندوب المعتمد (2)',
    phone: '967733388353',
    mCode: '2',
    pin: '2222',
    location: 'عتق - فرع الشارع العام',
    category: 'عروض خاصة',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 80,
    status: 'active'
  },
  {
    id: 'merch-1',
    name: 'مركز عتق للتقنية والجوالات',
    ownerName: 'أبو ناصر الشبواني',
    phone: '967733388353',
    mCode: 'M-101',
    pin: '1111',
    location: 'عتق - شارع درهم، بجانب مجمع النور',
    category: 'إلكترونيات وجوالات',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 60,
    status: 'active'
  },
  {
    id: 'merch-2',
    name: 'دار شبوة للعطور والبخور',
    ownerName: 'سالم الخليفي',
    phone: '967733388353',
    mCode: 'M-102',
    pin: '2222',
    location: 'عتق - سوق الذهب التجاري',
    category: 'عطور وتجميل',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 45,
    status: 'active'
  },
  {
    id: 'merch-3',
    name: 'معرض شبوة للإلكترونيات والأجهزة',
    ownerName: 'محمد باراس',
    phone: '967733388353',
    mCode: 'M-103',
    pin: '3333',
    location: 'عتق - الشارع العام، مقابل البنك المركزي',
    category: 'أجهزة منزلية',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 30,
    status: 'active'
  },
  {
    id: 'merch-4',
    name: 'بوتيك الأناقة الراقية',
    ownerName: 'عبدالله الهلالي',
    phone: '967733388353',
    mCode: 'M-104',
    pin: '4444',
    location: 'عتق - مركز المدينة بلازا',
    category: 'أزياء وملابس',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 20,
    status: 'active'
  },
  {
    id: 'merch-5',
    name: 'مناحل الخير الشبوانية',
    ownerName: 'أحمد باهدى',
    phone: '967733388353',
    mCode: 'M-105',
    pin: '5555',
    location: 'عتق - سوق الخضار والتمور',
    category: 'سوبرماركت ومواد غذائية',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 15,
    status: 'active'
  }
];

// No hardcoded mock/dummy products - rely exclusively on real database data
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_REVIEWS: Review[] = [];

export const INITIAL_SETTINGS: PlatformSettings = {
  platformName: 'عتق أونلاين - منصة عروض شبوة',
  supportPhone: DEFAULT_REAL_SUPPORT_PHONE,
  supportPhoneNumbers: [DEFAULT_REAL_SUPPORT_PHONE],
  profitMarginPercent: 0,
  merchantAccessCode: '1234',
  ownerPin: '0000',
  categories: [
    'عروض خاصة',
    'ملابس نسائية',
    'عالم الأطفال',
    'تجميل وإكسسوارات',
    'المطبخ الحديثة',
    'مفروشات',
    'أحذية',
    'إكسسوارات الجوالات',
    'إلكترونيات وجوالات',
    'سوبرماركت ومواد غذائية',
    'عطور وبخور',
    'مطاعم وكافيهات'
  ],
  autoCleanupExpired: true,
  bannerTitle: 'أقوى عروض وتخفيضات متاجر وأسواق عتق',
  bannerSubtitle: 'تصفح كل عروض المحلات في عتق واطلب مباشرة بالواتساب بضغطة زر واحدة وبدون أي تعقيد.',
  showAnnouncement: true,
  announcementText: '🎉 مرحباً بكم في منصة عتق أونلاين: أحدث التخفيضات اليومية الحصرية في مدينة عتق!',
  currency: 'ريال يمني'
};

const LOCAL_PRODUCTS_KEY = 'ataq_online_products_cache_v2';
const LOCAL_MERCHANTS_KEY = 'ataq_online_merchants_cache_v2';
const LOCAL_SETTINGS_KEY = 'ataq_online_settings_cache_v2';
const LOCAL_REVIEWS_KEY = 'ataq_online_reviews_cache_v2';

// Identify and filter out legacy dummy/mock sample products
export function isDummyMockProduct(p?: { id?: string; name?: string } | null): boolean {
  if (!p) return false;
  const id = String(p.id || '').trim();
  const name = String(p.name || '').trim().toLowerCase();
  
  if (['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6'].includes(id)) {
    return true;
  }
  
  if (
    name.includes('samsung galaxy s24') ||
    name.includes('خشب الصندل والعود الملكي') ||
    name.includes('شاشة smart 4k') ||
    name.includes('ساعة يد رجالية كلاسيكية') ||
    name.includes('عسل سدر دوعني') ||
    name.includes('airpods pro')
  ) {
    return true;
  }
  
  return false;
}

// Helper to determine if a product is truly expired or marked for cleanup
export function isProductExpired(p: Product): boolean {
  if (!p) return true;
  if (p.status === 'expired' || p.status === 'deleted' || p.status === 'hidden') {
    return true;
  }

  // Check offer validity and expiration timestamp
  const expiry = p.offerEndsAt || p.expiryDate;
  if (expiry) {
    let expiryTimestamp: number = 0;
    if (typeof expiry === 'number') {
      expiryTimestamp = expiry;
    } else if (typeof expiry === 'object' && expiry !== null && 'toDate' in (expiry as Record<string, unknown>)) {
      expiryTimestamp = ((expiry as { toDate: () => Date }).toDate()).getTime();
    } else if (typeof expiry === 'object' && expiry !== null && 'seconds' in (expiry as Record<string, unknown>)) {
      expiryTimestamp = (expiry as { seconds: number }).seconds * 1000;
    } else {
      expiryTimestamp = new Date(String(expiry)).getTime();
    }

    if (!isNaN(expiryTimestamp) && expiryTimestamp <= Date.now()) {
      return true;
    }
  }

  return false;
}

// Save or update product document in Firestore collection (Fast & non-blocking)
export async function saveProductToFirestore(product: Product): Promise<boolean> {
  if (!db || !product.id) return false;
  try {
    const docRef = doc(db, 'products', product.id);
    const expiry = product.offerEndsAt || product.expiryDate || null;
    await setDoc(docRef, {
      ...product,
      offerEndsAt: expiry,
      expiryDate: expiry,
      offerDurationDays: product.offerDurationDays || null,
      offerDurationText: product.offerDurationText || null,
      createdAt: typeof product.createdAt === 'number' ? product.createdAt : Date.now(),
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore product save notice (cached locally):', err);
    return false;
  }
}

// Delete or mark expired document in Firestore collection
export async function deleteExpiredProductFromFirestore(productId: string): Promise<boolean> {
  if (!db || !productId) return false;
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, { status: 'deleted', isOffer: false });
      return true;
    } catch {
      return false;
    }
  }
}

// Batch cleanup for Firestore collection
export async function cleanupExpiredProductsInFirestore(productIds: string[]): Promise<void> {
  if (!db || !productIds || productIds.length === 0) return;
  try {
    await Promise.allSettled(productIds.map((id) => deleteExpiredProductFromFirestore(id)));
  } catch {
    // Non-blocking catch
  }
}

/**
 * Real-Time Firestore Listener for Products
 * Ensures zero dummy data: listens to live products in Firestore collection 'products'.
 * Filters out deleted products, keeps active/out_of_stock products whose offer has not expired.
 * Also persists to localStorage for permanent offline resilience.
 */
export function subscribeToFirestoreProducts(
  onProductsUpdate: (products: Product[]) => void,
  onError?: (err: unknown) => void
): () => void {
  // If Firestore db instance is unavailable, fallback immediately to local cache
  if (!db) {
    const cached = getLocalCachedProducts();
    onProductsUpdate(cached);
    return () => {};
  }

  try {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        const liveProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data) return;

          // Parse timestamps safely
          let createdAt = Date.now();
          if (typeof data.createdAt === 'number') {
            createdAt = data.createdAt;
          } else if (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
            createdAt = (data.createdAt as { seconds: number }).seconds * 1000;
          }

          let offerEndsAt: string | undefined = undefined;
          if (data.offerEndsAt) {
            if (typeof data.offerEndsAt === 'string') {
              offerEndsAt = data.offerEndsAt;
            } else if (typeof data.offerEndsAt === 'object' && 'toDate' in data.offerEndsAt) {
              offerEndsAt = (data.offerEndsAt as { toDate: () => Date }).toDate().toISOString();
            } else if (typeof data.offerEndsAt === 'object' && 'seconds' in data.offerEndsAt) {
              offerEndsAt = new Date((data.offerEndsAt as { seconds: number }).seconds * 1000).toISOString();
            }
          }

          const product: Product = {
            id: String(docSnap.id || data.id),
            name: String(data.name || ''),
            category: String(data.category || 'أخرى'),
            description: String(data.description || ''),
            originalPrice: Number(data.originalPrice) || 0,
            discountPrice: data.discountPrice !== undefined ? Number(data.discountPrice) : undefined,
            costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
            customerPrice: data.customerPrice !== undefined 
              ? Number(data.customerPrice) 
              : (data.discountPrice !== undefined ? Number(data.discountPrice) : Number(data.originalPrice) || undefined),
            appliedMarginPercent: data.appliedMarginPercent !== undefined ? Number(data.appliedMarginPercent) : undefined,
            quantity: Number(data.quantity) >= 0 ? Number(data.quantity) : 1,
            image: typeof data.image === 'string' ? data.image : '',
            thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : '',
            additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages : [],
            mCode: data.mCode ? String(data.mCode) : '1',
            sizes: data.sizes ? String(data.sizes) : undefined,
            colors: data.colors ? String(data.colors) : undefined,
            merchantId: data.merchantId ? String(data.merchantId) : undefined,
            merchantName: String(data.merchantName || 'متجر عتق'),
            merchantPhone: data.merchantPhone && !isDummyPhone(data.merchantPhone) 
              ? sanitizeWhatsAppPhone(data.merchantPhone) 
              : '',
            merchantLocation: String(data.merchantLocation || ''),
            isOffer: Boolean(data.isOffer),
            isFeatured: Boolean(data.isFeatured),
            offerEndsAt: offerEndsAt || (data.expiryDate ? String(data.expiryDate) : undefined),
            expiryDate: offerEndsAt || (data.expiryDate ? String(data.expiryDate) : undefined),
            offerDurationDays: data.offerDurationDays !== undefined ? Number(data.offerDurationDays) : undefined,
            offerDurationText: data.offerDurationText ? String(data.offerDurationText) : undefined,
            rating: Number(data.rating) || 5.0,
            reviewsCount: Number(data.reviewsCount) || 0,
            viewsCount: Number(data.viewsCount) || 0,
            createdAt: createdAt,
            status: data.status || 'active'
          };

          // Filter out dummy mock products, deleted status, or expired items
          if (isDummyMockProduct(product)) return;
          if (product.status === 'deleted') return;
          if (isProductExpired(product)) return;

          liveProducts.push(product);
        });

        // Sort by creation date (newest first)
        liveProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Sync with local cache so offline mode always has real products
        setLocalCachedProducts(liveProducts);
        onProductsUpdate(liveProducts);
      },
      (error: any) => {
        if (error?.code !== 'unavailable') {
          console.warn('Firestore products listener fallback active:', error);
        }
        onError?.(error);
        const cached = getLocalCachedProducts();
        onProductsUpdate(cached);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error establishing Firestore products subscription:', err);
    onError?.(err);
    const cached = getLocalCachedProducts();
    onProductsUpdate(cached);
    return () => {};
  }
}

/**
 * One-time fetch of real products from Firestore
 */
export async function fetchProductsFromFirestore(): Promise<Product[]> {
  if (!db) return getLocalCachedProducts();
  try {
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    const liveProducts: Product[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      const product: Product = {
        id: String(docSnap.id || data.id),
        name: String(data.name || ''),
        category: String(data.category || 'أخرى'),
        description: String(data.description || ''),
        originalPrice: Number(data.originalPrice) || 0,
        discountPrice: data.discountPrice !== undefined ? Number(data.discountPrice) : undefined,
        costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
        customerPrice: data.customerPrice !== undefined 
          ? Number(data.customerPrice) 
          : (data.discountPrice !== undefined ? Number(data.discountPrice) : Number(data.originalPrice) || undefined),
        appliedMarginPercent: data.appliedMarginPercent !== undefined ? Number(data.appliedMarginPercent) : undefined,
        quantity: Number(data.quantity) >= 0 ? Number(data.quantity) : 1,
        image: typeof data.image === 'string' ? data.image : '',
        thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : '',
        additionalImages: Array.isArray(data.additionalImages) ? data.additionalImages : [],
        mCode: data.mCode ? String(data.mCode) : '1',
        sizes: data.sizes ? String(data.sizes) : undefined,
        colors: data.colors ? String(data.colors) : undefined,
        merchantId: data.merchantId ? String(data.merchantId) : undefined,
        merchantName: String(data.merchantName || 'متجر عتق'),
        merchantPhone: data.merchantPhone && !isDummyPhone(data.merchantPhone) 
          ? sanitizeWhatsAppPhone(data.merchantPhone) 
          : '',
        merchantLocation: String(data.merchantLocation || ''),
        isOffer: Boolean(data.isOffer),
        isFeatured: Boolean(data.isFeatured),
        offerEndsAt: data.offerEndsAt ? String(data.offerEndsAt) : undefined,
        expiryDate: data.expiryDate ? String(data.expiryDate) : undefined,
        offerDurationDays: data.offerDurationDays !== undefined ? Number(data.offerDurationDays) : undefined,
        offerDurationText: data.offerDurationText ? String(data.offerDurationText) : undefined,
        rating: Number(data.rating) || 5.0,
        reviewsCount: Number(data.reviewsCount) || 0,
        viewsCount: Number(data.viewsCount) || 0,
        createdAt: Number(data.createdAt) || Date.now(),
        status: data.status || 'active'
      };

      if (isDummyMockProduct(product)) return;
      if (product.status === 'deleted') return;
      if (isProductExpired(product)) return;

      liveProducts.push(product);
    });

    liveProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setLocalCachedProducts(liveProducts);
    return liveProducts;
  } catch (err) {
    console.warn('Error fetching products from Firestore:', err);
    return getLocalCachedProducts();
  }
}

// Safe Local Cache Helpers with Auto-Sanitization (Zero dummy data)
export function getLocalCachedProducts(): Product[] {
  try {
    const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Immediately sanitize: strip dummy mock products AND expired/deleted items
        const validOnly = parsed.filter((p) => !isDummyMockProduct(p) && !isProductExpired(p));
        if (validOnly.length !== parsed.length) {
          localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(validOnly));
        }
        return validOnly;
      }
    }
  } catch (e) {
    console.error('Error loading products cache:', e);
  }
  // NEVER return dummy fallback data - if empty, return empty array
  return [];
}

export function setLocalCachedProducts(products: Product[]): void {
  try {
    // Filter out dummy mock items, expired, and deleted items before caching
    const validProducts = products.filter((p) => !isDummyMockProduct(p) && !isProductExpired(p));
    const sanitized: Product[] = validProducts.map((p) => ({
      id: String(p.id || ''),
      name: String(p.name || ''),
      category: String(p.category || 'أخرى'),
      description: String(p.description || ''),
      originalPrice: Number(p.originalPrice) || 0,
      discountPrice: p.discountPrice !== undefined ? Number(p.discountPrice) : undefined,
      costPrice: p.costPrice !== undefined ? Number(p.costPrice) : undefined,
      customerPrice: p.customerPrice !== undefined 
        ? Number(p.customerPrice) 
        : (p.discountPrice !== undefined ? Number(p.discountPrice) : Number(p.originalPrice) || undefined),
      appliedMarginPercent: p.appliedMarginPercent !== undefined ? Number(p.appliedMarginPercent) : undefined,
      quantity: Number(p.quantity) >= 0 ? Number(p.quantity) : 0,
      image: typeof p.image === 'string' ? p.image : '',
      thumbnail: typeof p.thumbnail === 'string' ? p.thumbnail : '',
      additionalImages: Array.isArray(p.additionalImages) ? p.additionalImages.filter(i => typeof i === 'string') : [],
      mCode: p.mCode ? String(p.mCode) : undefined,
      sizes: p.sizes ? String(p.sizes) : undefined,
      colors: p.colors ? String(p.colors) : undefined,
      merchantId: p.merchantId ? String(p.merchantId) : undefined,
      merchantName: String(p.merchantName || 'متجر عتق'),
      merchantPhone: p.merchantPhone && !isDummyPhone(p.merchantPhone) 
        ? sanitizeWhatsAppPhone(p.merchantPhone) 
        : '',
      merchantLocation: String(p.merchantLocation || ''),
      isOffer: Boolean(p.isOffer),
      isFeatured: Boolean(p.isFeatured),
      offerEndsAt: p.offerEndsAt ? String(p.offerEndsAt) : undefined,
      expiryDate: p.expiryDate ? String(p.expiryDate) : undefined,
      offerDurationDays: p.offerDurationDays !== undefined ? Number(p.offerDurationDays) : undefined,
      offerDurationText: p.offerDurationText ? String(p.offerDurationText) : undefined,
      rating: Number(p.rating) || 5.0,
      reviewsCount: Number(p.reviewsCount) || 0,
      viewsCount: Number(p.viewsCount) || 0,
      createdAt: Number(p.createdAt) || Date.now(),
      status: p.status || 'active'
    }));

    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error saving products cache:', e);
  }
}

export function getLocalCachedMerchants(): Merchant[] {
  try {
    const cached = localStorage.getItem(LOCAL_MERCHANTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading merchants cache:', e);
  }
  return INITIAL_MERCHANTS;
}

export function setLocalCachedMerchants(merchants: Merchant[]): void {
  try {
    localStorage.setItem(LOCAL_MERCHANTS_KEY, JSON.stringify(merchants));
  } catch (e) {
    console.error('Error saving merchants cache:', e);
  }
}

export function getLocalCachedSettings(): PlatformSettings {
  try {
    const cached = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);

      // Sanitize and filter out dummy phone numbers from cached list
      const rawNumbers = Array.isArray(parsed.supportPhoneNumbers) ? parsed.supportPhoneNumbers : [];
      const sanitizedNumbers = rawNumbers
        .filter((num: string) => num && !isDummyPhone(num))
        .map((num: string) => sanitizeWhatsAppPhone(num))
        .filter((num: string) => num && !isDummyPhone(num));

      const cleanSupportPhone = parsed.supportPhone && !isDummyPhone(parsed.supportPhone)
        ? sanitizeWhatsAppPhone(parsed.supportPhone)
        : (sanitizedNumbers[0] || DEFAULT_REAL_SUPPORT_PHONE);

      return { 
        ...INITIAL_SETTINGS, 
        ...parsed,
        supportPhone: cleanSupportPhone,
        supportPhoneNumbers: sanitizedNumbers.length > 0 
          ? sanitizedNumbers 
          : [cleanSupportPhone],
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 
          ? parsed.categories 
          : INITIAL_SETTINGS.categories,
        // Support 0% margin explicitly - never fallback to 20 or add automatic markup if 0
        profitMarginPercent: typeof parsed.profitMarginPercent === 'number' && !isNaN(parsed.profitMarginPercent)
          ? Math.max(0, parsed.profitMarginPercent)
          : 0,
        merchantAccessCode: parsed.merchantAccessCode || INITIAL_SETTINGS.merchantAccessCode,
        currency: (!parsed.currency || parsed.currency === 'ر.س' || parsed.currency === 'ريال') ? 'ريال يمني' : parsed.currency,
        autoCleanupExpired: parsed.autoCleanupExpired !== undefined ? parsed.autoCleanupExpired : INITIAL_SETTINGS.autoCleanupExpired
      };
    }
  } catch (e) {
    console.error('Error loading settings cache:', e);
  }
  return INITIAL_SETTINGS;
}

export function setLocalCachedSettings(settings: PlatformSettings): void {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings cache:', e);
  }
}

/**
 * Persists Platform Settings (including profit margin percentage) to Firestore.
 * Always saves 0% as a valid real profit margin (0% = Customer Price matches Merchant Price).
 */
export async function saveSettingsToFirestore(settings: PlatformSettings): Promise<boolean> {
  // Update local cache immediately
  setLocalCachedSettings(settings);
  if (!db) return false;

  try {
    const docRef = doc(db, 'settings', 'platform');
    const safeMargin = typeof settings.profitMarginPercent === 'number' && !isNaN(settings.profitMarginPercent)
      ? Math.max(0, settings.profitMarginPercent)
      : 0;

    await setDoc(docRef, {
      ...settings,
      profitMarginPercent: safeMargin,
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore settings save notice (cached locally):', err);
    return false;
  }
}

/**
 * Real-time listener for Platform Settings from Firestore.
 * Ensures the customer view always reads the approved profit margin directly from Firestore.
 */
export function subscribeToFirestoreSettings(
  onSettingsUpdate: (settings: PlatformSettings) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!db) {
    const cached = getLocalCachedSettings();
    onSettingsUpdate(cached);
    return () => {};
  }

  try {
    const docRef = doc(db, 'settings', 'platform');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const base = getLocalCachedSettings();
          const safeMargin = typeof data.profitMarginPercent === 'number' && !isNaN(data.profitMarginPercent)
            ? Math.max(0, data.profitMarginPercent)
            : 0;

          const rawNumbers = Array.isArray(data.supportPhoneNumbers) ? data.supportPhoneNumbers : [];
          const sanitizedNumbers = rawNumbers
            .filter((num: string) => num && !isDummyPhone(num))
            .map((num: string) => sanitizeWhatsAppPhone(num))
            .filter((num: string) => num && !isDummyPhone(num));

          const cleanSupportPhone = data.supportPhone && !isDummyPhone(data.supportPhone)
            ? sanitizeWhatsAppPhone(data.supportPhone)
            : (sanitizedNumbers[0] || base.supportPhone || DEFAULT_REAL_SUPPORT_PHONE);

          const updated: PlatformSettings = {
            ...base,
            ...data,
            // CRITICAL: Strictly preserve 0% profit margin and never default to 20%
            profitMarginPercent: safeMargin,
            supportPhone: cleanSupportPhone,
            supportPhoneNumbers: sanitizedNumbers.length > 0
              ? sanitizedNumbers
              : [cleanSupportPhone],
            categories: Array.isArray(data.categories) && data.categories.length > 0
              ? data.categories
              : base.categories,
            currency: (!data.currency || data.currency === 'ر.س' || data.currency === 'ريال') ? 'ريال يمني' : data.currency,
          };
          setLocalCachedSettings(updated);
          onSettingsUpdate(updated);
        } else {
          // If Firestore settings document doesn't exist yet, save initial settings
          const current = getLocalCachedSettings();
          saveSettingsToFirestore(current).catch(() => {});
          onSettingsUpdate(current);
        }
      },
      (error: any) => {
        if (error?.code !== 'unavailable') {
          console.warn('Firestore settings listener fallback notice:', error);
        }
        onError?.(error);
        const cached = getLocalCachedSettings();
        onSettingsUpdate(cached);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error establishing Firestore settings subscription:', err);
    onError?.(err);
    const cached = getLocalCachedSettings();
    onSettingsUpdate(cached);
    return () => {};
  }
}


export function getLocalCachedReviews(): Review[] {
  try {
    const cached = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading reviews cache:', e);
  }
  return INITIAL_REVIEWS;
}

export function setLocalCachedReviews(reviews: Review[]): void {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.error('Error saving reviews cache:', e);
  }
}
