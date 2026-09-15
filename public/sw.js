// Ataq Online - World-Class Push Notifications & Background Service Worker (SHEIN-Style)
// Compatible with standard Web Push, PWA, and Firebase Cloud Messaging (FCM)

const CACHE_NAME = 'ataq-push-sw-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('Ataq Online Push Service Worker active and claimed clients');
    })
  );
});

// Safe notification dispatcher that checks permission and catches promise rejections
function safeShowNotification(title, options) {
  try {
    // 1. Verify notification permission in ServiceWorker scope
    if (typeof self.Notification !== 'undefined' && self.Notification.permission !== 'granted') {
      return Promise.resolve();
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return Promise.resolve();
    }

    if (self.registration && typeof self.registration.showNotification === 'function') {
      return self.registration.showNotification(title, options).catch((err) => {
        // Silently catch and suppress permission or browser restrictions (e.g. iframe sandbox)
        console.warn('SW showNotification suppressed or failed:', err);
      });
    }
  } catch (err) {
    console.warn('SW safeShowNotification synchronous check notice:', err);
  }
  return Promise.resolve();
}

// 1. Handle Web Push / FCM Background Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: '🔥 وصل منتج جديد الآن!',
        body: event.data.text() || 'تصفح أحدث العروض والمنتجات الحصرية في عتق أونلاين 🛍️'
      };
    }
  }

  // Handle nested FCM structures (data or notification)
  const notifObj = data.notification || {};
  const dataObj = data.data || {};

  const title = notifObj.title || dataObj.title || data.title || '🔥 وصل منتج جديد الآن!';
  const body = notifObj.body || dataObj.body || data.body || 'تصفح أحدث العروض والمنتجات الحصرية في عتق أونلاين 🛍️';
  const icon = notifObj.icon || dataObj.icon || data.icon || '/favicon.svg';
  const image = notifObj.image || dataObj.image || data.image || data.productImage; // Expanded Big Picture (SHEIN style)
  const productId = dataObj.productId || data.productId || '';
  const deepLinkUrl = dataObj.url || data.url || (productId ? `/?productId=${productId}#product-${productId}` : '/');

  const options = {
    body: body,
    icon: icon,
    badge: '/favicon.svg',
    image: image || undefined, // High resolution product image for expanded view
    data: {
      url: deepLinkUrl,
      productId: productId,
      timestamp: Date.now()
    },
    tag: productId ? `ataq_product_${productId}` : 'ataq_general_push',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 300], // Engaging tactile vibration
    dir: 'rtl',
    lang: 'ar',
    actions: [
      {
        action: 'open_product',
        title: '🛒 تصفح واطلب الآن'
      },
      {
        action: 'dismiss',
        title: 'إغلاق'
      }
    ]
  };

  event.waitUntil(
    safeShowNotification(title, options)
  );
});

// 2. Handle Messages from Active Web Tabs / App to trigger background native notifications
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION' && event.data.payload) {
    const p = event.data.payload;
    const title = p.title || '🔥 وصل منتج جديد الآن!';
    const body = p.body || 'تصفح أحدث العروض والمنتجات الحصرية 🛍️';
    const image = p.productImage || p.image;
    const productId = p.productId || '';
    const deepLinkUrl = p.deepLinkUrl || (productId ? `/?productId=${productId}#product-${productId}` : '/');

    const options = {
      body: body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      image: image || undefined, // Big Picture
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
        {
          action: 'open_product',
          title: '🛒 تصفح واطلب الآن'
        },
        {
          action: 'dismiss',
          title: 'إغلاق'
        }
      ]
    };

    event.waitUntil(
      safeShowNotification(title, options)
    );
  }
});

// 3. Handle Notification Click (Deep Linking to Product Details)
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
      // If a window is already open, focus it and trigger the in-app deep link
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

      // If no window is currently open (background / terminated state), open at the deep link
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
