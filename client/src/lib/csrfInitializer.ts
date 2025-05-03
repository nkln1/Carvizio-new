/**
 * Module pentru inițializarea și verificarea periodică a tokenului CSRF
 * Asigură că avem mereu un token CSRF valid pentru cereri
 */

import { initializeCsrf as initCsrf } from "./csrfToken";

// Frecvența la care se actualizează tokenul CSRF (la fiecare 20 minute)
const CSRF_REFRESH_INTERVAL = 20 * 60 * 1000;

// ID-ul intervalului pentru a permite curățarea
let refreshIntervalId: number | null = null;

/**
 * Inițializează sistemul CSRF
 * - Obține un token inițial
 * - Configurează reîmprospătarea periodică a tokenului
 */
export async function initializeCsrfProtection(): Promise<void> {
  try {
    console.log('[CSRF] Inițializare protecție CSRF...');

    // Folosește funcția din csrfToken.ts pentru a inițializa token-ul
    await initCsrf();
    console.log('[CSRF] Token CSRF inițializat cu succes');

    // Configurează reîmprospătarea periodică
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }

    refreshIntervalId = window.setInterval(async () => {
      try {
        await initCsrf();
        console.log('[CSRF] Token CSRF reîmprospătat automat');
      } catch (error) {
        console.error('[CSRF] Eroare la reîmprospătarea tokenului CSRF:', error);
      }
    }, CSRF_REFRESH_INTERVAL);

    // Curățare la închiderea paginii
    window.addEventListener('beforeunload', () => {
      if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    });

  } catch (error) {
    console.error('[CSRF] Eroare la inițializarea protecției CSRF:', error);
  }
}

/**
 * Curăță sistemul CSRF
 * - Oprește reîmprospătarea periodică
 */
export function cleanupCsrfProtection(): void {
  if (refreshIntervalId !== null) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
    console.log('[CSRF] Curățare protecție CSRF realizată');
  }
}

// Auto-initialize when this module is imported
initializeCsrfProtection().catch(err => {
  console.error('[CSRF] Eroare la inițializarea automată a protecției CSRF:', err);
});