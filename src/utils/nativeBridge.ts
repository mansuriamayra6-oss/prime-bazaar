import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { api } from '../services/api';

const BIOMETRIC_PREF_KEY = 'pb_biometric_lock_enabled';
const PUSH_TOKEN_PREF_KEY = 'pb_push_token';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getDevicePlatform(): 'android' | 'ios' | 'web' {
  try {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  } catch {
    return 'web';
  }
}

export async function saveMobilePreference(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value });
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
}

export async function getMobilePreference(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key });
    if (value !== null) return value;
  } catch {
    // fallback below
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

export async function setBiometricLockPreference(enabled: boolean): Promise<void> {
  await saveMobilePreference(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
}

export async function getBiometricLockPreference(): Promise<boolean> {
  const val = await getMobilePreference(BIOMETRIC_PREF_KEY);
  return val === 'true';
}

function selectWebFilePhoto(): Promise<{ dataUrl: string; mimeType: string } | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: String(reader.result || ''),
          mimeType: file.type || 'image/jpeg',
        });
      };
      reader.onerror = () => reject(new Error('Failed to read selected photo.'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function captureOrSelectPhoto(): Promise<{ dataUrl: string; mimeType: string } | null> {
  if (isNativeApp()) {
    const perm = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    if (perm.camera === 'denied' && perm.photos === 'denied') {
      throw new Error('Camera and photo permissions denied. Enable access in device settings or upload a file.');
    }
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
    });
    if (!photo.dataUrl) {
      throw new Error('Camera did not return an image.');
    }
    return {
      dataUrl: photo.dataUrl,
      mimeType: `image/${photo.format || 'jpeg'}`,
    };
  }

  return selectWebFilePhoto();
}

export async function registerPushNotifications(
  onNotify?: (msg: string) => void
): Promise<{ registered: boolean; platform: 'android' | 'ios' | 'web'; pushToken?: string; message: string }> {
  const platform = getDevicePlatform();

  if (!isNativeApp()) {
    const webToken = `web_push_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
    await api.mobile.registerDevice({
      pushToken: webToken,
      platform: 'web',
      appVersion: '7.0.0',
      deviceModel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web Browser',
    });
    await saveMobilePreference(PUSH_TOKEN_PREF_KEY, webToken);
    const message = 'Web push notification device token registered with backend.';
    onNotify?.(message);
    return { registered: true, platform: 'web', pushToken: webToken, message };
  }

  const permStatus = await PushNotifications.checkPermissions();
  let finalStatus = permStatus.receive;
  if (finalStatus === 'prompt') {
    const req = await PushNotifications.requestPermissions();
    finalStatus = req.receive;
  }
  if (finalStatus !== 'granted') {
    const message = 'Push notification permission was denied on this device.';
    onNotify?.(message);
    return { registered: false, platform, message };
  }

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          registered: false,
          platform,
          message: 'Timed out waiting for APNs/FCM registration token.',
        });
      }
    }, 6000);

    PushNotifications.addListener('registration', async (token) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        await api.mobile.registerDevice({
          pushToken: token.value,
          platform,
          appVersion: '7.0.0',
        });
        await saveMobilePreference(PUSH_TOKEN_PREF_KEY, token.value);
        const message = `Registered ${platform.toUpperCase()} push token.`;
        onNotify?.(message);
        resolve({ registered: true, platform, pushToken: token.value, message });
      } catch (err: any) {
        resolve({
          registered: false,
          platform,
          message: err?.message || 'Failed to persist push token on server.',
        });
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const message = err?.error || 'Native push registration failed.';
      onNotify?.(message);
      resolve({ registered: false, platform, message });
    });

    PushNotifications.register().catch(() => {
      // handled via listener/timeout
    });
  });
}

export function initDeepLinks(handlers: {
  onProductLink?: (productId: string) => void;
  onCategoryLink?: (slug: string) => void;
  onOrdersLink?: () => void;
  onBackDismiss?: () => boolean;
}): () => void {
  const cleanups: Array<() => void> = [];

  const handleIncomingUrl = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      const path = parsed.pathname.replace(/\/+$/, '');
      if (path.startsWith('/product/')) {
        const productId = path.replace('/product/', '').trim();
        if (productId) handlers.onProductLink?.(productId);
      } else if (path.startsWith('/category/')) {
        const slug = path.replace('/category/', '').trim();
        if (slug) handlers.onCategoryLink?.(slug);
      } else if (path === '/orders') {
        handlers.onOrdersLink?.();
      }
    } catch {
      // Ignore malformed URLs
    }
  };

  if (isNativeApp()) {
    const urlListenerPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
      if (event?.url) handleIncomingUrl(event.url);
    });
    const backListenerPromise = CapacitorApp.addListener('backButton', () => {
      const handled = handlers.onBackDismiss?.();
      if (!handled) {
        CapacitorApp.minimizeApp().catch(() => undefined);
      }
    });
    cleanups.push(() => {
      urlListenerPromise.then((h) => h.remove()).catch(() => undefined);
      backListenerPromise.then((h) => h.remove()).catch(() => undefined);
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
