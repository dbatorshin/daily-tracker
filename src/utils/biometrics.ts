const BIO_CRED_ID_KEY = 'daily_routines_bio_cred_id';
const BIO_ENABLED_KEY = 'daily_routines_bio_enabled';

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if the current browser/device supports WebAuthn platform biometrics (Face ID / Touch ID / Windows Hello).
 */
export async function isBiometricsSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return false;
    }
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if biometric credentials are saved in localStorage.
 */
export function isBiometricsConfigured(): boolean {
  try {
    return Boolean(localStorage.getItem(BIO_CRED_ID_KEY));
  } catch {
    return false;
  }
}

/**
 * Check if biometrics is enabled by user preference.
 */
export function isBiometricsEnabled(): boolean {
  try {
    const configured = isBiometricsConfigured();
    const enabledSetting = localStorage.getItem(BIO_ENABLED_KEY);
    return configured && enabledSetting !== 'false';
  } catch {
    return false;
  }
}

/**
 * Enable or disable biometrics preference.
 */
export function setBiometricsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BIO_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Remove biometrics credentials.
 */
export function removeBiometrics(): void {
  try {
    localStorage.removeItem(BIO_CRED_ID_KEY);
    localStorage.removeItem(BIO_ENABLED_KEY);
  } catch {}
}

/**
 * Register device platform biometrics (Face ID / Touch ID / Windows Hello).
 * Returns true if registration succeeded.
 */
export async function registerBiometrics(): Promise<{
  success: boolean;
  cancelled?: boolean;
  notAllowed?: boolean;
  error?: string;
}> {
  try {
    const supported = await isBiometricsSupported();
    if (!supported) {
      return { success: false, error: 'Биометрия не поддерживается на этом устройстве или в этом браузере.' };
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const hostname = window.location.hostname;
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Ежедневки',
        ...(isIp ? {} : { id: hostname }),
      },
      user: {
        id: Uint8Array.from('daily_routines_user_key', (c) => c.charCodeAt(0)),
        name: 'Ежедневки',
        displayName: 'Ежедневки',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Не удалось получить подтверждение биометрии.' };
    }

    const base64Id = bufferToBase64(credential.rawId);
    localStorage.setItem(BIO_CRED_ID_KEY, base64Id);
    localStorage.setItem(BIO_ENABLED_KEY, 'true');

    return { success: true };
  } catch (err: any) {
    const isNotAllowed = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
    return {
      success: false,
      cancelled: isNotAllowed,
      notAllowed: err?.name === 'NotAllowedError',
      error: isNotAllowed ? undefined : (err?.message || 'Ошибка настройки биометрии.'),
    };
  }
}

let isAuthOperationInProgress = false;

/**
 * Authenticate with biometrics (Face ID / Touch ID / Windows Hello).
 * Returns true if authenticated, false if cancelled/failed.
 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  cancelled?: boolean;
  notAllowed?: boolean;
  error?: string;
}> {
  if (isAuthOperationInProgress) {
    return { success: false, cancelled: true };
  }

  isAuthOperationInProgress = true;
  try {
    const savedId = localStorage.getItem(BIO_CRED_ID_KEY);
    if (!savedId) {
      return { success: false, error: 'Биометрия не настроена.' };
    }

    let credBuffer: ArrayBuffer;
    try {
      credBuffer = base64ToBuffer(savedId);
    } catch {
      localStorage.removeItem(BIO_CRED_ID_KEY);
      return { success: false, error: 'Данные биометрии повреждены. Введите PIN-код.' };
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const hostname = window.location.hostname;
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        ...(isIp ? {} : { rpId: hostname }),
        allowCredentials: [
          {
            id: credBuffer,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (assertion) {
      return { success: true };
    }
    return { success: false, error: 'Биометрия не распознана.' };
  } catch (err: any) {
    const isNotAllowed = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
    return {
      success: false,
      cancelled: isNotAllowed,
      notAllowed: err?.name === 'NotAllowedError',
      error: isNotAllowed ? undefined : (err?.message || 'Не удалось выполнить биометрический вход.'),
    };
  } finally {
    isAuthOperationInProgress = false;
  }
}

/**
 * Universal biometric unlock: authenticates if credentials exist,
 * or registers and verifies on first use in a single seamless flow.
 */
export async function universalBiometricUnlock(): Promise<{
  success: boolean;
  cancelled?: boolean;
  notAllowed?: boolean;
  error?: string;
}> {
  if (isBiometricsConfigured()) {
    return await authenticateWithBiometrics();
  } else {
    const reg = await registerBiometrics();
    if (reg.success) {
      return { success: true };
    }
    return {
      success: false,
      cancelled: reg.cancelled,
      notAllowed: reg.notAllowed,
      error: reg.error,
    };
  }
}
