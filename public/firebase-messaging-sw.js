// Ataq Online - Firebase Cloud Messaging (FCM) Background Service Worker
// Handles background push notifications when the app is closed or terminated
// Compatible with Firebase v10, Android Web Push, PWA & modern browsers

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 1. Firebase Configuration for Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForFallbackAtaqOnline2026",
  authDomain: "ataq-online-shabwah.firebaseapp.com",
  projectId: "ataq-online-shabwah",
  storageBucket: "ataq-online-shabwah.appspot.com",
  messagingSenderId: "102938475610",
  appId: "1:102938475610:web:8a9b0c1d2e3f4g5h6i7j8k"
};

// Initialize Firebase in Service Worker
try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  }
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Firebase init notice:', e);
}

// 2. Safe notification helper
function safeShowNotification(title, options) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return Promise.resolve();
    }
    if (self.registration && typeof self.registration.showNotification === 'function') {
      return self.registration.showNotification(title, options).catch((err) => {
        console.warn('[firebase-messaging-sw.js] showNotification error:', err);
      });
    }
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] safeShowNotification notice:', err);
  }
  return Promise.resolve();
}

// 3. Handle Firebase Cloud Messaging Background Messages (when app is completely closed)
try {
  if (typeof firebase !== 'undefined' && firebase.messaging) {
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received onBackgroundMessage:', payload);

      const notif = payload.notification || {};
      const data = payload.data || {};

      const title = notif.title || data.title || payload.title || '🔥 عرض جديد في عتق أونلاين!';
      const body = notif.body || data.body || payload.body || 'تصفح أحدث العروض والمنتجات الحصرية الآن 🛍️';
      const icon = notif.icon || data.icon || payload.icon || '/favicon.svg';
      const image = notif.image || data.image || data.productImage || payload.image;
      const productId = data.productId || payload.productId || '';
      const deepLinkUrl = data.url || data.deepLinkUrl || payload.deepLinkUrl || (productId ? `/?productId=${productId}#product-${productId}` : '/');

      const notificationOptions = {
        body: body,
        icon: icon,
        badge: '/favicon.svg',
        image: image || undefined, // Big Picture for expanded notification on Android/Desktop
        data: {
          url: deepLinkUrl,
          productId: productId,
          timestamp: Date.now()
        },
        tag: productId ? `ataq_product_${productId}` : 'ataq_bg_fcm',
        renotify: true,
        vibrate: [200, 100, 200, 100, 300],
        dir: 'rtl',
        lang: 'ar',
        actions: [
          { action: 'open_product', title: '🛒 تصفح واطلب الآن' },
          { action: 'dismiss', title: 'إغلاق' }
        ]
      };

      return safeShowNotification(title, notificationOptions);
    });
  }
} catch (err) {
  console.warn('[firebase-messaging-sw.js] onBackgroundMessage setup notice:', err);
}

// 4. Native Push Event Listener (Direct Web Push / FCM Topic Push Fallback)
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        notification: {
          title: '🔥 وصل منتج جديد الآن!',
          body: event.data.text() || 'تصفح أحدث العروض والمنتجات الحصرية في عتق أونلاين 🛍️'
        }
      };
    }
  }

  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || payload.title || '🔥 وصل منتج جديد الآن!';
  const body = notif.body || data.body || payload.body || 'تصفح أحدث العروض الحصرية في عتق أونلاين 🛍️';
  const icon = notif.icon || data.icon || payload.icon || '/favicon.svg';
  const image = notif.image || data.image || payload.image || data.productImage || payload.productImage;
  const productId = data.productId || payload.productId || '';
  const deepLinkUrl = data.url || data.deepLinkUrl || payload.deepLinkUrl || (productId ? `/?productId=${productId}#product-${productId}` : '/');

  const options = {
    body: body,
    icon: icon,
    badge: '/favicon.svg',
    image: image || undefined,
    data: {
      url: deepLinkUrl,
      productId: productId,
      timestamp: Date.now()
    },
    tag: productId ? `ataq_product_${productId}` : 'ataq_native_push',
    renotify: true,
    vibrate: [200, 100, 200, 100, 300],
    dir: 'rtl',
    lang: 'ar',
    actions: [
      { action: 'open_product', title: '🛒 تصفح واطلب الآن' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    safeShowNotification(title, options)
  );
});

// 5. Handle In-App Broadcast message (SHOW_NOTIFICATION)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION' && event.data.payload) {
    const p = event.data.payload;
    const notif = p.notification || {};
    const data = p.data || {};

    const title = notif.title || data.title || p.title || '🔥 وصل منتج جديد الآن!';
    const body = notif.body || data.body || p.body || 'تصفح أحدث العروض والمنتجات الحصرية 🛍️';
    const image = notif.image || data.image || p.productImage || p.image;
    const productId = data.productId || p.productId || '';
    const deepLinkUrl = data.url || data.deepLinkUrl || p.deepLinkUrl || (productId ? `/?productId=${productId}#product-${productId}` : '/');

    const options = {
      body: body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      image: image || undefined,
      data: {
        url: deepLinkUrl,
        productId: productId,
        timestamp: Date.now()
      },
      tag: productId ? `ataq_product_${productId}` : 'ataq_local_push',
      renotify: true,
      vibrate: [200, 100, 200, 100, 300],
      dir: 'rtl',
      lang: 'ar',
      actions: [
        { action: 'open_product', title: '🛒 تصفح واطلب الآن' },
        { action: 'dismiss', title: 'إغلاق' }
      ]
    };

    event.waitUntil(
      safeShowNotification(title, options)
    );
  }
});

// 6. Handle Notification Click (Deep Linking when App is Closed or Running in Background)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';
  const targetProductId = notificationData.productId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If app window is already open, focus it and trigger product deep link
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (targetProductId) {
            client.postMessage({
              type: 'OPEN_PRODUCT_DEEP_LINK',
              productId: targetProductId,
              url: targetUrl
            });
          }
          return;
        }
      }

      // 2. If app is completely closed (terminated), open the app at the target deep link URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 7. Install & Activate Lifecycle
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
