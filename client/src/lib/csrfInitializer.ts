// client/src/lib/csrfInitializer.ts

import { getCsrfToken, refreshCsrfToken } from './csrfToken';

// Funcție pentru a inițializa protecția CSRF la încărcarea aplicației
export async function initializeCsrfProtection(): Promise<void> {
  try {
    console.log('[CSRF] Inițializare protecție CSRF...');

    // Obține un token CSRF de la server
    const token = await getCsrfToken();
    console.log('[CSRF] Protecție CSRF inițializată cu succes');
    console.log('[CSRF] Token CSRF inițializat cu succes');

    // Adăugăm listener pentru când pagina devine vizibilă din nou (după ce a fost în background)
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('[CSRF] Pagina devine vizibilă, reîmprospătăm tokenul CSRF...');
        try {
          await refreshCsrfToken();
          console.log('[CSRF] Token CSRF reîmprospătat la revenirea la pagină');
        } catch (error) {
          console.error('[CSRF] Eroare la reîmprospătarea tokenului CSRF:', error);
        }
      }
    });

    console.log('Protecție CSRF inițializată');
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
  }
}

// Funcție pentru a reînițializa protecția CSRF când este necesar
export async function reinitializeCsrfProtection(): Promise<void> {
  try {
    console.log('[CSRF] Reinițializare protecție CSRF...');
    await refreshCsrfToken();
    console.log('[CSRF] Protecție CSRF reinițializată cu succes');
  } catch (error) {
    console.error('[CSRF] Eroare la reinițializarea protecției CSRF:', error);
  }
}