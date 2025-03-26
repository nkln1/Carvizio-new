
/**
 * Utilitar pentru verificarea dacă codul rulează în browser sau server
 */

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const isServer = !isBrowser;

/**
 * Wrapper sigur pentru acces la document
 * @returns obiectul document sau null dacă rulează în mediu server
 */
export const getDocument = (): Document | null => {
  return isBrowser ? document : null;
};

/**
 * Wrapper sigur pentru acces la window
 * @returns obiectul window sau null dacă rulează în mediu server
 */
export const getWindow = (): Window | null => {
  return isBrowser ? window : null;
};

/**
 * Execută o funcție doar dacă rulează în browser
 * @param callback funcția de executat
 */
export const runInBrowser = (callback: () => void): void => {
  if (isBrowser) {
    callback();
  }
};

/**
 * Wrapper sigur pentru localStorage
 * @returns obiectul localStorage sau null dacă rulează în mediu server
 */
export const getLocalStorage = (): Storage | null => {
  return isBrowser ? window.localStorage : null;
};

/**
 * Wrapper sigur pentru sessionStorage
 * @returns obiectul sessionStorage sau null dacă rulează în mediu server
 */
export const getSessionStorage = (): Storage | null => {
  return isBrowser ? window.sessionStorage : null;
};
