// client/src/hmr-disable.ts - versiune îmbunătățită

/**
 * Acest script dezactivează complet orice încercare de conexiune Vite HMR în browser
 * Este o soluție pentru mediile Replit unde HMR cauzează probleme de conexiune
 */

// Verificăm dacă suntem în browser înainte de a încerca să accesăm document/window
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Nu execută nimic dacă nu suntem în browser
if (!isBrowser) {
  console.log('[HMR Blocker] Nu rulează în browser, se sare peste dezactivarea HMR');
} else {
  // Suntem în browser, dezactivăm HMR
  console.log('%c[Mod Dezvoltare] HMR dezactivat - refresh manual necesar', 'background: #333; color: #ff9; padding: 6px 10px; border-radius: 4px; font-weight: bold; font-size: 14px;');
  console.log('%cToate conexiunile pentru Hot Module Replacement au fost blocate pentru stabilitate.', 'color: #999; font-style: italic;');

  // Salvăm originalul pentru a-l putea folosi când este nevoie
  const originalFetch = window.fetch;

  // Înlocuim fetch global pentru a bloca conexiunile HMR
  window.fetch = function customFetch(input: RequestInfo | URL, init?: RequestInit) {
    // Convertim input la string pentru verificare
    const url = input instanceof Request ? input.url : input.toString();

    // Blocăm orice cerere către serverul HMR (port 24678)
    if (url.includes(':24678') || url.includes('__vite_ping') || url.includes('/@vite/client')) {
      console.log('[HMR Disabled] Fetch blocat către:', url);
      // Returnam o promisiune respinsă pentru a împiedica continuarea solicitării
      return Promise.reject(new Error('HMR requests are blocked'));
    }

    // Pentru toate celelalte cereri, folosim fetch-ul original
    return originalFetch(input, init);
  };

  // Blocăm și conectarea WebSocket la serverul HMR
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    if (url.toString().includes(':24678') || url.toString().includes('__vite')) {
      console.log('[HMR Disabled] WebSocket blocat către:', url);
      throw new Error('HMR WebSocket connections are blocked');
    }
    return new originalWebSocket(url, protocols);
  } as any;

  // Blocăm și EventSource (folosit de unele implementări HMR)
  const originalEventSource = window.EventSource;
  if (originalEventSource) {
    window.EventSource = function(url: string | URL, eventSourceInitDict?: EventSourceInit) {
      if (url.toString().includes(':24678') || url.toString().includes('__vite')) {
        console.log('[HMR Disabled] EventSource blocat către:', url);
        throw new Error('HMR EventSource connections are blocked');
      }

      return new originalEventSource(url, eventSourceInitDict);
    } as any;

    // Copiem proprietățile statice
    for (const prop in originalEventSource) {
      if (Object.prototype.hasOwnProperty.call(originalEventSource, prop)) {
        (window.EventSource as any)[prop] = (originalEventSource as any)[prop];
      }
    }
  }
}

export {};