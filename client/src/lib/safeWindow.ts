
/**
 * Utilitar pentru acces sigur la obiecte globale (window, document, localStorage)
 * Previne erorile "X is not defined" pe server
 */

import { isBrowser, getDocument, getWindow } from '@shared/browserUtils';

export { isBrowser };
export const safeWindow = getWindow();
export const safeDocument = getDocument();
export const safeLocalStorage = isBrowser ? window.localStorage : undefined;
export const safeSessionStorage = isBrowser ? window.sessionStorage : undefined;

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
