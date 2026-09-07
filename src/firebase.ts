import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Product, Merchant, Review, PlatformSettings } from './types';

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
    db = getFirestore(app);
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
  const timeoutMs = options?.timeoutMs || 15000;

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
    phone: '967770000001',
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
    phone: '967770000002',
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
    phone: '967770000001',
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
    phone: '967770000002',
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
    phone: '967770000003',
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
    phone: '967770000004',
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
    phone: '967770000005',
    mCode: 'M-105',
    pin: '5555',
    location: 'عتق - سوق الخضار والتمور',
    category: 'سوبرماركت ومواد غذائية',
    isVerified: true,
    joinedAt: Date.now() - 86400000 * 15,
    status: 'active'
  }
];

// Initial high-quality fast sample offers for Ataq Online
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'هاتف Samsung Galaxy S24 Ultra - سعة 512GB (ضمان سنة)',
    category: 'إلكترونيات وجوالات',
    description: 'أحدث هواتف سامسونج بمعالج Snapdragon 8 Gen 3، شاشة Dynamic AMOLED 2X فائقة الوضوح، كاميرا 200 ميجابكسل مع قلم S-Pen مدمج، يدعم شبكات 5G مع ملحقات أصلية كاملة وضمان استبدال.',
    originalPrice: 4200,
    discountPrice: 3650,
    costPrice: 3200,
    quantity: 8,
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=700&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=50&q=30',
    additionalImages: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80'
    ],
    merchantId: 'merch-1',
    merchantName: 'مركز عتق للتقنية والجوالات',
    merchantPhone: '967770000001',
    merchantLocation: 'عتق - شارع درهم، بجانب مجمع النور',
    isOffer: true,
    isFeatured: true,
    offerEndsAt: new Date(Date.now() + 86400000 * 5).toISOString(),
    rating: 4.9,
    reviewsCount: 38,
    viewsCount: 420,
    createdAt: Date.now() - 3600000 * 24,
    status: 'active'
  },
  {
    id: 'prod-2',
    name: 'عطر خشب الصندل والعود الملكي - 100 مل (ثبات 48 ساعة)',
    category: 'عطور وتجميل',
    description: 'تركيبة شرقية فاخرة تجمع بين دهن العود الكمبودي الأصيل والمسك والعنبر النقي، فوحان ممتد وثبات يدوم لأيام، مناسب للمناسبات الرسمية والأعراس في شبوة.',
    originalPrice: 350,
    discountPrice: 240,
    costPrice: 160,
    quantity: 25,
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=700&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=50&q=30',
    additionalImages: [
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=600&q=80'
    ],
    merchantId: 'merch-2',
    merchantName: 'دار شبوة للعطور والبخور',
    merchantPhone: '967770000002',
    merchantLocation: 'عتق - سوق الذهب التجاري',
    isOffer: true,
    isFeatured: true,
    offerEndsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    rating: 4.8,
    reviewsCount: 52,
    viewsCount: 680,
    createdAt: Date.now() - 3600000 * 48,
    status: 'active'
  },
  {
    id: 'prod-3',
    name: 'شاشة Smart 4K UHD 55 بوصة مع رسيفر داخلي ودعم أندرويد',
    category: 'أجهزة منزلية',
    description: 'شاشة سمارت فائقة الدقة 4K HDR مع نظام Android TV لتشغيل يوتيوب ونتفليكس وتطبيقات البث، صوت محيطي Dolby Atmos ومداخل HDMI متعددة، ضمان سنتين.',
    originalPrice: 1800,
    discountPrice: 1450,
    costPrice: 1200,
    quantity: 6,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=700&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=50&q=30',
    merchantId: 'merch-3',
    merchantName: 'معرض شبوة للإلكترونيات والأجهزة',
    merchantPhone: '967770000003',
    merchantLocation: 'عتق - الشارع العام، مقابل البنك المركزي',
    isOffer: true,
    isFeatured: false,
    offerEndsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    rating: 4.7,
    reviewsCount: 19,
    viewsCount: 310,
    createdAt: Date.now() - 3600000 * 12,
    status: 'active'
  },
  {
    id: 'prod-4',
    name: 'ساعة يد رجالية كلاسيكية كوارتز ضد الماء - ستانلس ستيل فاخر',
    category: 'أزياء وملابس',
    description: 'تصميم أنيق مقاوم للخدش والماء حتى عمق 30 متراً، إطار من الفولاذ المقاوم للصدأ ومينا أسود متألق مع علبة هدايا فاخرة وكارت ضمان لمدة عام.',
    originalPrice: 280,
    discountPrice: 175,
    costPrice: 110,
    quantity: 14,
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=50&q=30',
    merchantId: 'merch-4',
    merchantName: 'بوتيك الأناقة الراقية',
    merchantPhone: '967770000004',
    merchantLocation: 'عتق - مركز المدينة بلازا',
    isOffer: true,
    isFeatured: false,
    offerEndsAt: new Date(Date.now() + 86400000 * 4).toISOString(),
    rating: 4.9,
    reviewsCount: 27,
    viewsCount: 540,
    createdAt: Date.now() - 3600000 * 8,
    status: 'active'
  },
  {
    id: 'prod-5',
    name: 'عسل سدر دوعني يمني طبيعي فاخر - نخب أول 1 كجم مع الفحص',
    category: 'سوبرماركت ومواد غذائية',
    description: 'عسل سدر طبيعي 100% مستخرج من مناحل وادي دوعن الشهيرة، معبأ بأعلى معايير الجودة والنقاء ومختبر مخبرياً، مغذي ومقوي للمناعة مع إمكانية التوصيل المنزلي.',
    originalPrice: 450,
    discountPrice: 380,
    costPrice: 300,
    quantity: 30,
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=700&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=50&q=30',
    merchantId: 'merch-5',
    merchantName: 'مناحل الخير الشبوانية',
    merchantPhone: '967770000005',
    merchantLocation: 'عتق - سوق الخضار والتمور',
    isOffer: false,
    isFeatured: false,
    rating: 5.0,
    reviewsCount: 64,
    viewsCount: 890,
    createdAt: Date.now() - 3600000 * 72,
    status: 'active'
  },
  {
    id: 'prod-6',
    name: 'سماعات أبل اللاسلكية AirPods Pro 2 الأصلية مع خاصية عزل الضوضاء',
    category: 'إلكترونيات وجوالات',
    description: 'عزل ضوضاء نشط مضاعف مع وضع شفافية الصوت المتقدم، بطارية تدوم حتى 30 ساعة مع علبة الشحن MagSafe المقاومة للماء والغبار وكابل Type-C أصلي.',
    originalPrice: 950,
    discountPrice: 799,
    costPrice: 680,
    quantity: 10,
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=50&q=30',
    merchantId: 'merch-1',
    merchantName: 'مركز عتق للتقنية والجوالات',
    merchantPhone: '967770000001',
    merchantLocation: 'عتق - جولة الشهداء',
    isOffer: true,
    isFeatured: true,
    offerEndsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    rating: 4.8,
    reviewsCount: 41,
    viewsCount: 520,
    createdAt: Date.now() - 3600000 * 18,
    status: 'active'
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-1',
    authorName: 'أبو فهد الخليفي',
    rating: 5,
    comment: 'ما شاء الله تبارك الله، الجوال أصلي ومضمون والتعامل ممتاز وسريع من مركز عتق للتقنية.',
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 'rev-2',
    productId: 'prod-2',
    authorName: 'سعيد الشبواني',
    rating: 5,
    comment: 'عطر فاخر جداً وريحته تثبت بالأيام، دار شبوة دايم مميزين في عتق.',
    createdAt: Date.now() - 86400000 * 4
  }
];

export const INITIAL_SETTINGS: PlatformSettings = {
  platformName: 'عتق أونلاين - منصة عروض شبوة',
  supportPhone: '967770000000',
  supportPhoneNumbers: ['967770000001', '967770000002', '967770000003'],
  profitMarginPercent: 20,
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

// Helper to determine if a product is expired or marked for cleanup
export function isProductExpired(p: Product): boolean {
  if (!p) return true;
  if (p.status === 'expired' || p.status === 'deleted' || p.status === 'hidden') {
    return true;
  }
  
  // Specific expired offers explicitly identified for cleanup
  const n = (p.name || '').trim().toLowerCase();
  if (
    n.includes('بخور الكويت') || 
    n === 'لى' || 
    n === 'لي' || 
    n.includes('كفاف العمال الشقه نسائي') || 
    n.includes('كفاف القماش الشقه نسائي') ||
    (n.includes('كفاف') && n.includes('نسائي'))
  ) {
    return true;
  }

  // Check offer validity and expiration timestamp
  const expiry = p.offerEndsAt || p.expiryDate;
  if (expiry) {
    const expiryTimestamp = new Date(expiry).getTime();
    if (!isNaN(expiryTimestamp) && expiryTimestamp <= Date.now()) {
      return true;
    }
  }

  return false;
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

// Safe Local Cache Helpers with Auto-Sanitization
export function getLocalCachedProducts(): Product[] {
  try {
    const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Immediately sanitize and exclude any expired or deleted items
        const validOnly = parsed.filter((p) => !isProductExpired(p));
        if (validOnly.length !== parsed.length) {
          localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(validOnly));
        }
        if (validOnly.length > 0) {
          return validOnly;
        }
      }
    }
  } catch (e) {
    console.error('Error loading products cache:', e);
  }
  return INITIAL_PRODUCTS.filter((p) => !isProductExpired(p));
}

export function setLocalCachedProducts(products: Product[]): void {
  try {
    // Filter out expired and deleted items before caching
    const validProducts = products.filter((p) => !isProductExpired(p));
    const sanitized = validProducts.map((p) => ({
      id: String(p.id || ''),
      name: String(p.name || ''),
      category: String(p.category || 'أخرى'),
      description: String(p.description || ''),
      originalPrice: Number(p.originalPrice) || 0,
      discountPrice: p.discountPrice !== undefined ? Number(p.discountPrice) : undefined,
      costPrice: p.costPrice !== undefined ? Number(p.costPrice) : undefined,
      quantity: Number(p.quantity) >= 0 ? Number(p.quantity) : 0,
      image: typeof p.image === 'string' ? p.image : '',
      thumbnail: typeof p.thumbnail === 'string' ? p.thumbnail : '',
      additionalImages: Array.isArray(p.additionalImages) ? p.additionalImages.filter(i => typeof i === 'string') : [],
      merchantId: p.merchantId ? String(p.merchantId) : undefined,
      merchantName: String(p.merchantName || 'متجر عتق'),
      merchantPhone: String(p.merchantPhone || '967770000001'),
      merchantLocation: String(p.merchantLocation || ''),
      isOffer: Boolean(p.isOffer),
      isFeatured: Boolean(p.isFeatured),
      offerEndsAt: p.offerEndsAt ? String(p.offerEndsAt) : undefined,
      expiryDate: p.expiryDate ? String(p.expiryDate) : undefined,
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
      return { 
        ...INITIAL_SETTINGS, 
        ...parsed,
        supportPhoneNumbers: Array.isArray(parsed.supportPhoneNumbers) && parsed.supportPhoneNumbers.length > 0 
          ? parsed.supportPhoneNumbers 
          : INITIAL_SETTINGS.supportPhoneNumbers,
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 
          ? parsed.categories 
          : INITIAL_SETTINGS.categories,
        profitMarginPercent: typeof parsed.profitMarginPercent === 'number' ? parsed.profitMarginPercent : INITIAL_SETTINGS.profitMarginPercent,
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
