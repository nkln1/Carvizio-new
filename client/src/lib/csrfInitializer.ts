/**
 * Module pentru inițializarea și verificarea periodică a tokenului CSRF
 * Asigură că avem mereu un token CSRF valid pentru cereri
 */

import { setCsrfToken, getCsrfToken } from "./csrfToken";

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
        await refreshCsrfToken();
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


// Initialize CSRF token when the module is loaded
export function initializeCsrf() {
  // Make a request to a health-check endpoint that returns a CSRF token
  fetch('/api/health-check', {
    method: 'GET',
    credentials: 'include'
  })
    .then(response => {
      const csrfToken = response.headers.get('X-CSRF-Token');
      if (csrfToken) {
        setCsrfToken(csrfToken);
        console.log('CSRF token initialized successfully');
      } else {
        console.warn('No CSRF token found in health-check response');
      }
    })
    .catch(error => {
      console.error('Failed to initialize CSRF token:', error);
    });
}

// Function to refresh the CSRF token
export async function refreshCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/health-check', {
      method: 'GET',
      credentials: 'include'
    });

    const csrfToken = response.headers.get('X-CSRF-Token');
    if (csrfToken) {
      setCsrfToken(csrfToken);
      console.log('CSRF token refreshed successfully');
      return csrfToken;
    } else {
      console.warn('No CSRF token found in refresh response');
      return null;
    }
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error);
    return null;
  }
}

// Function to ensure we have a valid CSRF token
export async function ensureCsrfToken(): Promise<string | null> {
  const currentToken = getCsrfToken();
  if (currentToken) {
    return currentToken;
  }

  // If no token exists, fetch a new one
  return await refreshCsrfToken();
}

// Auto-initialize when this module is imported
initializeCsrf();

// Set up periodic refresh (every 20 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    refreshCsrfToken();
  }, 20 * 60 * 1000);
}