import React, { useEffect } from 'react';
import { 
  autoInitializeBackgroundPush, 
  subscribeToAutoNotifications 
} from '../utils/autoNotificationService';

/**
 * Headless Background Notification Manager
 * - Fully silent background operation (zero in-app UI, zero buttons, zero popups)
 * - Auto-subscribes devices to topics/ataq_all_devices on startup
 * - Triggers native external system notifications directly on mobile / desktop lockscreen & status bar
 */
export const AutoNotificationBanner: React.FC = () => {
  useEffect(() => {
    // 1. Auto initialize background push, SW registration, and topics/ataq_all_devices
    autoInitializeBackgroundPush();

    // 2. Keep the background listener alive to trigger external system notifications
    const unsubscribe = subscribeToAutoNotifications(() => {
      // External system notification is automatically dispatched in the service layer
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Purely headless: strictly no in-app banners or buttons as requested
  return null;
};
