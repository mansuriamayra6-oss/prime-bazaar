import { api } from '../services/api';

const BIOMETRIC_PREF_KEY = 'pb_biometric_lock_enabled';
const BIOMETRIC_CRED_KEY = 'pb_biometric_cred_id';
const PUSH_TOKEN_PREF_KEY = 'pb_push_token';

function getGlobalCapacitor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).Capacitor || null;
}

export function isNativeApp(): boolean {
  try {
    const cap = getGlobalCapacitor();
    return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch {
    return false;
  }
}

export function getDevicePlatform(): 'android' | 'ios' | 'web' {
  try {
    const cap = getGlobalCapacitor();
    const p = cap && typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  } catch {
    return 'web';
  }
}

export async function saveMobilePreference(key: string, value: string): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    } catch {
      // fallback below
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export async function getMobilePreference(key: string): Promise<string | null> {
  if (isNativeApp()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      if (value !== null) return value;
    } catch {
      // fallback below
    }
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

// =============================================================================
// CLIENT UPLOAD VALIDATION & CAMERA PHOTO CAPTURE
// =============================================================================

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);

export function validateUploadFile(
  file: { type?: string; size?: number; name?: string },
  options?: { allowVideo?: boolean; maxImageBytes?: number; maxVideoBytes?: number }
): { valid: boolean; kind?: 'image' | 'video'; error?: string } {
  const mime = (file.type || '').trim().toLowerCase();
  const maxImg = options?.maxImageBytes ?? 5 * 1024 * 1024;
  const maxVid = options?.maxVideoBytes ?? 12 * 1024 * 1024;
  const isImg = ALLOWED_IMAGE_MIMES.has(mime);
  const isVid = Boolean(options?.allowVideo) && ALLOWED_VIDEO_MIMES.has(mime);

  if (!isImg && !isVid) {
    return {
      valid: false,
      error: options?.allowVideo
        ? 'Only JPG, PNG, WebP images and MP4/WebM videos are allowed.'
        : 'Only JPG, PNG, or WebP images are supported.',
    };
  }
  if (typeof file.size === 'number') {
    if (isImg && file.size > maxImg) {
      return { valid: false, error: 'Image must be 5 MB or smaller.' };
    }
    if (isVid && file.size > maxVid) {
      return { valid: false, error: 'Video must be 12 MB or smaller.' };
    }
  }
  return { valid: true, kind: isImg ? 'image' : 'video' };
}

function selectWebFilePhoto(): Promise<{ dataUrl: string; mimeType: string; fileSize: number } | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.capture = 'environment';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const check = validateUploadFile(file);
      if (!check.valid) {
        reject(new Error(check.error || 'Unsupported image file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: String(reader.result || ''),
          mimeType: file.type || 'image/jpeg',
          fileSize: file.size,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read selected photo.'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function captureOrSelectPhoto(): Promise<{
  dataUrl: string;
  mimeType: string;
  fileSize?: number;
} | null> {
  if (isNativeApp()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const perm = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    if (perm.camera === 'denied' && perm.photos === 'denied') {
      throw new Error(
        'Camera and photo permissions denied. Enable access in device settings or upload a file.'
      );
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

// =============================================================================
// BIOMETRIC AUTHENTICATION (WebAuthn Platform Passkey + Capacitor + PIN Fallback)
// =============================================================================

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUint8(b64u: string): Uint8Array {
  const padded = b64u.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64u.length + 3) % 4);
  const raw = atob(padded);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function checkBiometricAvailability(): Promise<{
  supported: boolean;
  platformAuthenticator: boolean;
  label: string;
}> {
  if (isNativeApp()) {
    return {
      supported: true,
      platformAuthenticator: true,
      label: getDevicePlatform() === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint / Biometric Unlock',
    };
  }
  try {
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        supported: true,
        platformAuthenticator: avail,
        label: avail ? 'Face ID / Fingerprint Passkey' : 'Device Biometric / Security PIN',
      };
    }
  } catch {
    // ignore probe failure
  }
  return {
    supported: false,
    platformAuthenticator: false,
    label: 'Security PIN / OTP Fallback',
  };
}

export async function enrollBiometricCredential(params: {
  userId: string;
  userEmail: string;
  userName: string;
  fallbackPin?: string;
}): Promise<{ credentialId: string; authenticatorType: 'webauthn' | 'capacitor-biometric' }> {
  let credentialId = '';
  let authenticatorType: 'webauthn' | 'capacitor-biometric' = 'capacitor-biometric';
  let publicKeySpkiBase64: string | undefined;

  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.create === 'function'
  ) {
    try {
      const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (avail) {
        const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
        const userBytes = new TextEncoder().encode(params.userId.slice(0, 32));
        const created = (await navigator.credentials.create({
          publicKey: {
            rp: { name: 'Prime Bazaar' },
            user: {
              id: userBytes,
              name: params.userEmail || params.userName,
              displayName: params.userName,
            },
            challenge: challengeBytes,
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 }, // ES256
              { type: 'public-key', alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 45000,
          },
        })) as PublicKeyCredential | null;

        if (created) {
          credentialId = bufToBase64Url(created.rawId);
          authenticatorType = 'webauthn';
          const resp = created.response as AuthenticatorAttestationResponse;
          if (typeof resp.getPublicKey === 'function') {
            const spki = resp.getPublicKey();
            if (spki) {
              const bytes = new Uint8Array(spki);
              let bin = '';
              for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
              publicKeySpkiBase64 = btoa(bin);
            }
          }
        }
      }
    } catch {
      // Fallback gracefully if frame/permissions prevent direct WebAuthn prompt
    }
  }

  if (!credentialId) {
    const rand = crypto.getRandomValues(new Uint8Array(18));
    credentialId = `pb_bio_${bufToBase64Url(rand.buffer)}`;
    authenticatorType = 'capacitor-biometric';
  }

  await api.biometric.register({
    credentialId,
    authenticatorType,
    publicKeySpkiBase64,
    deviceName:
      typeof navigator !== 'undefined'
        ? `${getDevicePlatform().toUpperCase()} · ${navigator.platform || 'Device'}`
        : 'Trusted Device',
    fallbackPin: params.fallbackPin,
  });

  await saveMobilePreference(BIOMETRIC_CRED_KEY, credentialId);
  await setBiometricLockPreference(true);
  return { credentialId, authenticatorType };
}

export async function authenticateWithBiometric(identifier: string) {
  const chRes = await api.biometric.challenge(identifier);
  const storedCredId = await getMobilePreference(BIOMETRIC_CRED_KEY);
  const allowIds: string[] = Array.isArray(chRes.allowCredentialIds) ? chRes.allowCredentialIds : [];
  const chosenCredId =
    (storedCredId && allowIds.includes(storedCredId) ? storedCredId : allowIds[0]) || storedCredId || '';

  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.get === 'function' &&
    chRes.challenge &&
    allowIds.length > 0
  ) {
    try {
      const avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (avail) {
        const assertion = (await navigator.credentials.get({
          publicKey: {
            challenge: base64UrlToUint8(chRes.challenge) as BufferSource,
            allowCredentials: allowIds.map((id) => ({
              type: 'public-key' as const,
              id: base64UrlToUint8(id) as BufferSource,
            })),
            userVerification: 'required',
            timeout: 45000,
          },
        })) as PublicKeyCredential | null;

        if (assertion) {
          const resp = assertion.response as AuthenticatorAssertionResponse;
          return api.biometric.verify({
            identifier,
            challengeId: chRes.challengeId,
            credentialId: bufToBase64Url(assertion.rawId),
            clientDataJSON: bufToBase64Url(resp.clientDataJSON),
            authenticatorData: bufToBase64Url(resp.authenticatorData),
            signature: bufToBase64Url(resp.signature),
            fallbackMode: 'biometric',
          });
        }
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        throw new Error('Biometric prompt was cancelled. Use your PIN or OTP fallback.');
      }
      // Fall through only for non-WebAuthn environments where enrolled credential is capacitor-biometric
    }
  }

  return api.biometric.verify({
    identifier,
    challengeId: chRes.challengeId,
    credentialId: chosenCredId,
    fallbackMode: 'biometric',
  });
}

// =============================================================================
// PUSH NOTIFICATIONS & PREFERENCES
// =============================================================================

export async function registerPushNotifications(
  onNotify?: (msg: string) => void
): Promise<{ registered: boolean; platform: 'android' | 'ios' | 'web'; pushToken?: string; message: string }> {
  const platform = getDevicePlatform();

  if (!isNativeApp()) {
    const existingToken = await getMobilePreference(PUSH_TOKEN_PREF_KEY);
    const webToken =
      existingToken && existingToken.startsWith('web_push_')
        ? existingToken
        : `web_push_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
    await api.mobile.registerDevice({
      pushToken: webToken,
      platform: 'web',
      appVersion: '7.0.0',
      deviceModel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web Browser',
    });
    await saveMobilePreference(PUSH_TOKEN_PREF_KEY, webToken);
    const message = 'Push notification device token registered with backend.';
    onNotify?.(message);
    return { registered: true, platform: 'web', pushToken: webToken, message };
  }

  const { PushNotifications } = await import('@capacitor/push-notifications');
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

export async function unregisterPushNotifications(): Promise<void> {
  const token = await getMobilePreference(PUSH_TOKEN_PREF_KEY);
  if (token) {
    await api.mobile.unregisterDevice({ pushToken: token });
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PUSH_TOKEN_PREF_KEY);
    }
  }
}

// =============================================================================
// UNIVERSAL DEEP LINK PARSING & ROUTING (Android App Links + iOS + Web Direct URL)
// =============================================================================

export type DeepLinkRoute =
  | { type: 'product'; productId: string }
  | { type: 'category'; slug: string }
  | { type: 'seller'; sellerId: string }
  | { type: 'cart' }
  | { type: 'orders' }
  | { type: 'promotions' }
  | { type: 'account' }
  | { type: 'home' };

export function parseDeepLinkPath(rawUrlOrPath: string): DeepLinkRoute | null {
  if (!rawUrlOrPath || typeof rawUrlOrPath !== 'string') return null;
  let pathname = rawUrlOrPath.trim();
  if (pathname.includes('://')) {
    try {
      const parsed = new URL(pathname);
      pathname = parsed.pathname;
    } catch {
      return null;
    }
  }
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  if (clean.startsWith('/product/')) {
    const productId = decodeURIComponent(clean.slice('/product/'.length)).trim();
    return productId ? { type: 'product', productId } : null;
  }
  if (clean.startsWith('/category/')) {
    const slug = decodeURIComponent(clean.slice('/category/'.length)).trim();
    return slug ? { type: 'category', slug } : null;
  }
  if (clean.startsWith('/seller/')) {
    const sellerId = decodeURIComponent(clean.slice('/seller/'.length)).trim();
    return sellerId ? { type: 'seller', sellerId } : null;
  }
  if (clean === '/cart') return { type: 'cart' };
  if (clean === '/orders') return { type: 'orders' };
  if (clean === '/promotions' || clean === '/deals') return { type: 'promotions' };
  if (clean === '/account' || clean === '/profile') return { type: 'account' };
  if (clean === '/') return { type: 'home' };
  return null;
}

export interface DeepLinkHandlers {
  onProductLink?: (productId: string) => void;
  onCategoryLink?: (slug: string) => void;
  onSellerLink?: (sellerId: string) => void;
  onCartLink?: () => void;
  onOrdersLink?: () => void;
  onPromotionsLink?: () => void;
  onAccountLink?: () => void;
  onBackDismiss?: () => boolean;
}

export function dispatchDeepLinkRoute(rawUrlOrPath: string, handlers: DeepLinkHandlers): boolean {
  const route = parseDeepLinkPath(rawUrlOrPath);
  if (!route || route.type === 'home') return false;
  if (route.type === 'product') {
    handlers.onProductLink?.(route.productId);
    return true;
  }
  if (route.type === 'category') {
    handlers.onCategoryLink?.(route.slug);
    return true;
  }
  if (route.type === 'seller') {
    handlers.onSellerLink?.(route.sellerId);
    return true;
  }
  if (route.type === 'cart') {
    handlers.onCartLink?.();
    return true;
  }
  if (route.type === 'orders') {
    handlers.onOrdersLink?.();
    return true;
  }
  if (route.type === 'promotions') {
    handlers.onPromotionsLink?.();
    return true;
  }
  if (route.type === 'account') {
    handlers.onAccountLink?.();
    return true;
  }
  return false;
}

export function initDeepLinks(handlers: DeepLinkHandlers): () => void {
  const cleanups: Array<() => void> = [];

  // Handle direct browser URL path on initial mount & popstate navigation
  if (typeof window !== 'undefined') {
    const handleBrowserLocation = () => {
      if (window.location.pathname && window.location.pathname !== '/') {
        dispatchDeepLinkRoute(window.location.pathname, handlers);
      }
    };
    handleBrowserLocation();
    window.addEventListener('popstate', handleBrowserLocation);
    cleanups.push(() => window.removeEventListener('popstate', handleBrowserLocation));
  }

  // Only dynamically load Capacitor native listeners when running inside Android/iOS native shell
  if (isNativeApp()) {
    import('@capacitor/app')
      .then(({ App: CapacitorApp }) => {
        const urlListenerPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
          if (event?.url) dispatchDeepLinkRoute(event.url, handlers);
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
      })
      .catch(() => undefined);

    import('@capacitor/push-notifications')
      .then(({ PushNotifications }) => {
        const actionPromise = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const link = action?.notification?.data?.deepLinkPath || action?.notification?.data?.url;
          if (link) dispatchDeepLinkRoute(String(link), handlers);
        });
        cleanups.push(() => {
          actionPromise.then((h) => h.remove()).catch(() => undefined);
        });
      })
      .catch(() => undefined);
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
