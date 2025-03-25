import Cookies from 'js-cookie';

// Cookie names constants
export const COOKIE_CONSENT_NAME = 'essential-cookie-consent';
export const COOKIE_MAX_AGE = 365; // days (1 year)

/**
 * Set a cookie with the given name and value
 * @param name Cookie name
 * @param value Cookie value
 * @param days Cookie expiration in days (default: 365)
 */
export const setCookie = (name: string, value: string, days = COOKIE_MAX_AGE) => {
  Cookies.set(name, value, {
    expires: days,
    sameSite: 'strict',
    secure: window.location.protocol === 'https:',
    path: '/'
  });
};

/**
 * Get a cookie by name
 * @param name Cookie name
 * @returns Cookie value or undefined if not found
 */
export const getCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};

/**
 * Remove a cookie by name
 * @param name Cookie name
 */
export const removeCookie = (name: string) => {
  Cookies.remove(name);
};

/**
 * Check if the user has given consent to essential cookies
 * @returns true if the user has given consent, false otherwise
 */
export const hasConsentedToCookies = (): boolean => {
  return getCookie(COOKIE_CONSENT_NAME) === 'true';
};

/**
 * Set the cookie consent to true
 */
export const acceptCookieConsent = () => {
  setCookie(COOKIE_CONSENT_NAME, 'true');
};

/**
 * Set a value in localStorage if available
 * @param key Storage key
 * @param value Storage value
 */
export const setLocalStorage = (key: string, value: any) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (typeof value === 'object') {
        window.localStorage.setItem(key, JSON.stringify(value));
      } else {
        window.localStorage.setItem(key, String(value));
      }
    }
  } catch (error) {
    console.error('Error setting localStorage', error);
  }
};

/**
 * Get a value from localStorage if available
 * @param key Storage key
 * @returns Storage value or null if not found
 */
export const getLocalStorage = (key: string, defaultValue: any = null) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    }
    return defaultValue;
  } catch (error) {
    console.error('Error getting localStorage', error);
    return defaultValue;
  }
};

/**
 * Remove a value from localStorage if available
 * @param key Storage key
 */
export const removeLocalStorage = (key: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error removing localStorage', error);
  }
};

/**
 * Set a value in sessionStorage if available
 * @param key Storage key
 * @param value Storage value
 */
export const setSessionStorage = (key: string, value: any) => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (typeof value === 'object') {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      } else {
        window.sessionStorage.setItem(key, String(value));
      }
    }
  } catch (error) {
    console.error('Error setting sessionStorage', error);
  }
};

/**
 * Get a value from sessionStorage if available
 * @param key Storage key
 * @returns Storage value or null if not found
 */
export const getSessionStorage = (key: string, defaultValue: any = null) => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const item = window.sessionStorage.getItem(key);
      if (item === null) return defaultValue;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    }
    return defaultValue;
  } catch (error) {
    console.error('Error getting sessionStorage', error);
    return defaultValue;
  }
};

/**
 * Remove a value from sessionStorage if available
 * @param key Storage key
 */
export const removeSessionStorage = (key: string) => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error removing sessionStorage', error);
  }
};