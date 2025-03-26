
/**
 * Acest fișier creează obiecte fictive pentru window și document 
 * pentru a preveni erorile în mediul server
 */

// Exportăm o funcție care verifică și inițializează obiectele globale
export function initializeBrowserMocks() {
  // Rulează doar pe server, nu în browser
  if (typeof window === 'undefined') {
    // @ts-ignore - Ignorăm erorile TypeScript pentru acest hack
    global.window = {};
    // @ts-ignore
    global.document = {
      createElement: () => ({}),
      getElementsByTagName: () => [],
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      documentElement: {
        style: {}
      }
    };
    // @ts-ignore
    global.navigator = {
      userAgent: 'node',
      language: 'ro'
    };
  }
}

// Rulăm inițializarea imediat
initializeBrowserMocks();
