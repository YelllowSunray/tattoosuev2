/**
 * Safari-safe localStorage utilities
 * Safari blocks localStorage in private browsing mode, so we need try-catch
 */

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Safari private browsing mode or storage disabled
    console.warn('localStorage not available (Safari private browsing?):', error);
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Safari private browsing mode or storage disabled
    console.warn('localStorage not available (Safari private browsing?):', error);
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('localStorage not available:', error);
    return false;
  }
}

export function safeSessionStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.warn('sessionStorage not available:', error);
    return null;
  }
}

export function safeSessionStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('sessionStorage not available:', error);
    return false;
  }
}
