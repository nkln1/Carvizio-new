/**
 * Module pentru inițializarea și verificarea periodică a tokenului CSRF
 * Asigură că avem mereu un token CSRF valid pentru cereri
 */

import { initializeCsrf, getCsrfToken } from "./csrfToken";

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
    console.log('Inițializare protecție CSRF...');
    
    // Obține token CSRF inițial
    await initializeCsrf();
    
    // Verifică dacă am obținut un token
    const token = getCsrfToken();
    if (token) {
      console.log('Protecție CSRF inițializată cu succes');
    } else {
      console.warn('Nu s-a putut obține un token CSRF inițial');
    }
    
    // Configurează reîmprospătarea periodică
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }
    
    refreshIntervalId = window.setInterval(async () => {
      try {
        await initializeCsrf();
        console.log('Token CSRF reîmprospătat');
      } catch (error) {
        console.error('Eroare la reîmprospătarea tokenului CSRF:', error);
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
    console.error('Eroare la inițializarea protecției CSRF:', error);
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
    console.log('Curățare protecție CSRF realizată');
  }
}