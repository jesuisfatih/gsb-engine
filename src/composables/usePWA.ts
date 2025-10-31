/**
 * PWA Install Prompt Composable
 * Manages PWA installation and updates
 */

import { ref, onMounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  const isStandalone = ref(false);
  const updateAvailable = ref(false);

  /**
   * Check if app is running in standalone mode
   */
  function checkStandaloneMode() {
    if (typeof window === 'undefined') return false;
    
    const isStandaloneProp = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    isStandalone.value = isStandaloneProp || isIOSStandalone;
    isInstalled.value = isStandalone.value;
    
    return isStandalone.value;
  }

  /**
   * Show install prompt
   */
  async function showInstallPrompt() {
    if (!deferredPrompt.value) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await deferredPrompt.value.prompt();
      const { outcome } = await deferredPrompt.value.userChoice;
      
      console.log('[PWA] User choice:', outcome);
      
      if (outcome === 'accepted') {
        isInstalled.value = true;
        deferredPrompt.value = null;
        isInstallable.value = false;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  }

  /**
   * Request push notification permission
   */
  async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Subscribe to push notifications
   */
  async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('[PWA] Push subscription created');
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Check for service worker updates
   */
  async function checkForUpdates() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateAvailable.value = true;
              console.log('[PWA] Update available');
            }
          });
        }
      });
    } catch (error) {
      console.error('[PWA] Update check failed:', error);
    }
  }

  /**
   * Apply update
   */
  function applyUpdate() {
    if (!updateAvailable.value) return;
    
    window.location.reload();
  }

  // Setup
  onMounted(() => {
    checkStandaloneMode();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      deferredPrompt.value = e as BeforeInstallPromptEvent;
      isInstallable.value = true;
      console.log('[PWA] Install prompt ready');
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      deferredPrompt.value = null;
      console.log('[PWA] App installed');
    });

    // Check for updates periodically
    checkForUpdates();
    setInterval(checkForUpdates, 60000); // Every minute
  });

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    updateAvailable,
    showInstallPrompt,
    requestNotificationPermission,
    subscribeToPush,
    applyUpdate,
  };
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

