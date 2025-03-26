
/**
 * Utilitar pentru acces sigur la obiecte globale (window, document, localStorage)
 * Previne erorile "X is not defined" pe server
 */

export const isBrowser = typeof window !== 'undefined';

export const safeWindow: Window | undefined = isBrowser ? window : undefined;
export const safeDocument: Document | undefined = isBrowser ? document : undefined;
export const safeLocalStorage: Storage | undefined = isBrowser ? localStorage : undefined;
export const safeSessionStorage: Storage | undefined = isBrowser ? sessionStorage : undefined;

/**
 * Execută o funcție doar în browser
 * @param fn Funcția de executat
 */
export const onlyInBrowser = (fn: () => void): void => {
  if (isBrowser) {
    fn();
  }
};

/**
 * Obtine valoarea unui obiect doar in browser, sau valoarea default pe server
 */
export function browserOnly<T>(browserValue: T, serverDefault: T): T {
  return isBrowser ? browserValue : serverDefault;
}
