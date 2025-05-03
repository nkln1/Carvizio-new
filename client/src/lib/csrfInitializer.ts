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

    // Încercăm de 3 ori să obținem un token CSRF valid
    let retries = 0;
    let success = false;
    
    while (retries < 3 && !success) {
      try {
        // Folosește funcția din csrfToken.ts pentru a inițializa token-ul
        await initCsrf();
        console.log('[CSRF] Token CSRF inițializat cu succes');
        success = true;
      } catch (error) {
        retries++;
        console.error(`[CSRF] Eroare la inițializarea tokenului CSRF (încercarea ${retries}/3):`, error);
        if (retries < 3) {
          // Așteaptă puțin înainte de a reîncerca
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!success) {
      console.error('[CSRF] Nu s-a putut inițializa token-ul CSRF după 3 încercări');
    }

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
        
        // Încercăm din nou după o perioadă scurtă
        setTimeout(async () => {
          try {
            await initCsrf();
            console.log('[CSRF] Token CSRF reîmprospătat cu succes în a doua încercare');
          } catch (retryError) {
            console.error('[CSRF] A doua încercare de reîmprospătare a eșuat:', retryError);
          }
        }, 5000); // 5 secunde mai târziu
      }
    }, CSRF_REFRESH_INTERVAL);

    // Adăugăm un listener pentru tab visibility pentru a reîmprospăta tokenul când utilizatorul revine la pagină
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('[CSRF] Pagina devine vizibilă, reîmprospătăm tokenul CSRF...');
        try {
          await initCsrf();
          console.log('[CSRF] Token CSRF reîmprospătat la revenirea la pagină');
        } catch (error) {
          console.error('[CSRF] Eroare la reîmprospătarea tokenului la revenirea la pagină:', error);
        }
      }
    });

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