// client/src/hmr-disable.ts - versiune îmbunătățită

/**
 * Acest script dezactivează complet orice încercare de conexiune Vite HMR în browser
 * Este o soluție pentru mediile Replit unde HMR cauzează probleme de conexiune
 */

if (typeof window !== 'undefined') {
  // Blocăm complet obiectul global __HMR__ folosit de Vite
  try {
    Object.defineProperty(window, '__HMR__', {
      value: { enabled: false },
      writable: false,
      configurable: false
    });

    Object.defineProperty(window, '__vite_plugin_react_preamble_installed__', {
      value: true,
      writable: false
    });
  } catch (e) {
    console.log('[HMR Blocker] Nu s-a putut suprascrie __HMR__', e);
  }

  // Suprascriem WebSocket pentru a bloca toate conexiunile HMR
  const originalWebSocket = window.WebSocket;

  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    const urlString = url.toString();

    // Verificăm dacă este o conexiune HMR (testat pentru a funcționa cu toate porturile)
    if (
      urlString.includes('vite-hmr') || 
      urlString.includes('__vite') ||
      // Blocăm orice conexiune la subdomeniul replit.dev cu un port
      (urlString.includes('replit.dev:') && /:\d+/.test(urlString)) ||
      // Blocăm orice conexiune către porturile cunoscute HMR
      /:([2-9]\d{3,5})/.test(urlString)
    ) {
      console.log('[HMR Disabled] Conexiune WebSocket blocată:', urlString);

      // Returnăm un obiect WebSocket fals care nu face nimic
      return {
        addEventListener: () => {},
        removeEventListener: () => {},
        send: () => {},
        close: () => {},
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        readyState: 3, // CLOSED
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
        url: urlString,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob' as BinaryType,
      } as WebSocket;
    }

    // Permitem conexiunile WebSocket legitime (non-HMR)
    console.log('[WebSocket] Permisă conexiunea către:', urlString);
    return new originalWebSocket(url, protocols as any);
  } as any;

  // Copiem proprietățile statice din WebSocket original
  Object.defineProperties(window.WebSocket, {
    CONNECTING: { value: 0 },
    OPEN: { value: 1 },
    CLOSING: { value: 2 },
    CLOSED: { value: 3 },
    prototype: { value: originalWebSocket.prototype },
  });

  // Blocăm și eventualele request-uri fetch către endpoint-urile HMR
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (
      url.includes('__vite') || 
      url.includes('vite-hmr') ||
      (url.includes('replit.dev:') && /:\d+/.test(url))
    ) {
      console.log('[HMR Disabled] Fetch blocat către:', url);
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Conexiune blocată de blockerul HMR')), 100);
      });
    }

    return originalFetch(input, init);
  };

  // Suprascriem și EventSource pentru a bloca conexiunile SSE folosite de Vite
  const originalEventSource = window.EventSource;
  if (originalEventSource) {
    window.EventSource = function(url: string | URL, eventSourceInitDict?: EventSourceInit) {
      const urlString = url.toString();

      if (
        urlString.includes('__vite') || 
        urlString.includes('vite-hmr') ||
        (urlString.includes('replit.dev:') && /:\d+/.test(urlString))
      ) {
        console.log('[HMR Disabled] EventSource blocat către:', urlString);

        // Returnăm un EventSource fals
        return {
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          onopen: null,
          onmessage: null,
          onerror: null,
          readyState: 2, // CLOSED
          url: urlString,
          withCredentials: false,
          CONNECTING: 0,
          OPEN: 1,
          CLOSED: 2,
          close: () => {},
        } as EventSource;
      }

      return new originalEventSource(url, eventSourceInitDict);
    } as any;

    // Copiem proprietățile statice
    Object.defineProperties(window.EventSource, {
      CONNECTING: { value: 0 },
      OPEN: { value: 1 },
      CLOSED: { value: 2 },
      prototype: { value: originalEventSource.prototype },
    });
  }

  // Detectăm și blocăm orice încercare de a instala HMR din Vite
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string, options?: ElementCreationOptions) {
    const element = originalCreateElement.call(document, tagName, options);

    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name: string, value: string) {
        if (name === 'src' && (value.includes('__vite') || value.includes('vite-hmr'))) {
          console.log('[HMR Disabled] Script blocat:', value);
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
    }

    return element;
  };

  // Afișăm un mesaj clar pentru dezvoltator
  console.log('%c[Mod Dezvoltare] HMR dezactivat - refresh manual necesar', 
    'background: #333; color: #ff9; padding: 6px 10px; border-radius: 4px; font-weight: bold; font-size: 14px;');
  console.log('%cToate conexiunile pentru Hot Module Replacement au fost blocate pentru stabilitate.', 
    'color: #999; font-style: italic;');
}

export {};