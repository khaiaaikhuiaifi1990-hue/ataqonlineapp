/**
 * Automatic Push & In-App Notification Service for Ataq Online
 * Automatically requests permission on launch & broadcasts notifications
 * whenever a merchant publishes a new product.
 */

export interface ProductNotificationPayload {
  id: string;
  title: string;
  body: string;
  productName: string;
  productImage?: string;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = 'ataq_auto_notifications_channel_v1';
const NOTIFICATION_HISTORY_KEY = 'ataq_auto_notifications_history_v1';
const PERMISSION_ASKED_KEY = 'ataq_notif_permission_asked_v1';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this context', e);
}

// 1. Play Soft Notification Chime (Web Audio API)
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (pleasant high chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (warm chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

// 2. Request Notification Permission
export async function requestAutoNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function getAutoNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// 3. Automatically Trigger Notification when a new product is added
export function triggerAutomaticNewProductNotification(productName: string, productImage?: string): void {
  const payload: ProductNotificationPayload = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'عرض جديد في عتق أونلاين 🛍️',
    body: `تمت إضافة منتج جديد: "${productName}" - تصفح العرض واطلبه الآن!`,
    productName,
    productImage,
    timestamp: Date.now()
  };

  // 1. Play chime locally
  playNotificationSound();

  // 2. Browser native push notification (FCM / Web Notification)
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: productImage || '/icon.png',
        badge: '/icon.png',
        tag: 'ataq_new_product_' + Date.now(),
        dir: 'rtl',
        lang: 'ar'
      });
    } catch (e) {
      console.warn('Native notification dispatch failed:', e);
    }
  }

  // 3. Save to local notification history
  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history: ProductNotificationPayload[] = raw ? JSON.parse(raw) : [];
    const updated = [payload, ...history].slice(0, 30);
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(updated));
    localStorage.setItem('ataq_latest_auto_notif_v1', JSON.stringify(payload));
  } catch {
    // Ignore storage issues
  }

  // 4. Broadcast across open tabs/devices
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
  } catch (e) {
    console.warn('BroadcastChannel send error:', e);
  }

  // 5. Fire window CustomEvent for active in-app listener
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ataq_new_product_notif', { detail: payload }));
  }
}

// 4. Subscribe to new product notifications (for in-app banner)
export function subscribeToAutoNotifications(
  callback: (notif: ProductNotificationPayload) => void
): () => void {
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<ProductNotificationPayload>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data && event.data.title && event.data.productName) {
      playNotificationSound();
      callback(event.data as ProductNotificationPayload);
    }
  };

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'ataq_latest_auto_notif_v1' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        playNotificationSound();
        callback(payload);
      } catch {
        // Ignore parse error
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('ataq_new_product_notif', handleCustomEvent);
    window.addEventListener('storage', handleStorageChange);
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcastMessage);
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('ataq_new_product_notif', handleCustomEvent);
      window.removeEventListener('storage', handleStorageChange);
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      }
    }
  };
}
