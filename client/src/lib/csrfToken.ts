/**
 * Module pentru gestionarea token-urilor CSRF pe partea de client
 * Permite stocarea și recuperarea token-ului CSRF pentru cereri.
 */

// Stocarea ultimului token CSRF primit
let csrfToken: string | null = null;

// Marcator pentru inițializarea în curs - previne cereri multiple simultane
let isInitializingToken = false;

// Coadă de promisiuni pentru așteptarea tokenului
const tokenPromises: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Setează tokenul CSRF.  Adăugată pentru a permite setarea tokenului din fetchWithCsrf.
 * @param token Noul token CSRF.
 */
export function setCsrfToken(token: string): void {
  csrfToken = token;
  console.log('[CSRF] Token CSRF setat direct:', token.substring(0, 8) + '...');
  
  // Rezolvă toate promisiunile în așteptare
  while (tokenPromises.length > 0) {
    const promise = tokenPromises.shift();
    if (promise) {
      promise.resolve(token);
    }
  }
}

/**
 * Actualizează tokenul CSRF din header-ul răspunsului
 * @param response Răspunsul HTTP
 */
export function updateCsrfToken(response: Response): void {
  const token = response.headers.get('X-CSRF-Token');
  if (token) {
    csrfToken = token;
    console.log('[CSRF] Token CSRF actualizat:', token.substring(0, 8) + '...');
    
    // Rezolvă toate promisiunile în așteptare
    while (tokenPromises.length > 0) {
      const promise = tokenPromises.shift();
      if (promise) {
        promise.resolve(token);
      }
    }
  }
}

/**
 * Extrage tokenul CSRF dintr-un obiect Headers
 * @param headers Obiectul Headers
 */
export function extractCsrfToken(headers: Headers): void {
  const token = headers.get('X-CSRF-Token');
  if (token) {
    csrfToken = token;
    console.log('[CSRF] Token CSRF extras din headers:', token.substring(0, 8) + '...');
    
    // Rezolvă toate promisiunile în așteptare
    while (tokenPromises.length > 0) {
      const promise = tokenPromises.shift();
      if (promise) {
        promise.resolve(token);
      }
    }
  }
}

/**
 * Obține tokenul CSRF curent
 * @returns Tokenul CSRF sau null dacă nu există
 */
export function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Obține un token CSRF valid, așteptând inițializarea dacă e necesar
 * @returns Promisiune cu tokenul CSRF
 */
export async function getOrFetchCsrfToken(): Promise<string> {
  // Dacă avem deja un token, îl returnăm
  if (csrfToken) {
    return csrfToken;
  }
  
  // Dacă inițializarea e în curs, așteptăm rezultatul
  if (isInitializingToken) {
    return new Promise<string>((resolve, reject) => {
      tokenPromises.push({ resolve, reject });
    });
  }
  
  // Altfel inițiem o cerere pentru token
  isInitializingToken = true;
  
  try {
    console.log('[CSRF] Inițiem cerere pentru token CSRF');
    const response = await window.fetch('/api/health-check', {
      method: 'GET',
      credentials: 'include'
    });
    
    const token = response.headers.get('X-CSRF-Token');
    if (!token) {
      throw new Error('Nu s-a putut obține token CSRF de la server');
    }
    
    setCsrfToken(token);
    console.log('[CSRF] Token CSRF obținut cu succes:', token.substring(0, 8) + '...');
    return token;
  } catch (error) {
    console.error('[CSRF] Eroare la obținerea tokenului CSRF:', error);
    
    // Respingem toate promisiunile în așteptare
    while (tokenPromises.length > 0) {
      const promise = tokenPromises.shift();
      if (promise) {
        promise.reject(error instanceof Error ? error : new Error('Unknown error'));
      }
    }
    
    throw error;
  } finally {
    isInitializingToken = false;
  }
}

/**
 * Adaugă headerul CSRF la un obiect de configurare pentru fetch
 * @param config Configurația fetch existentă
 * @returns Configurația cu headerul CSRF adăugat
 */
export function addCsrfHeader(config: RequestInit = {}): RequestInit {
  // Nu adăugăm header CSRF pentru cereri GET sau HEAD
  const method = config.method?.toUpperCase() || 'GET';
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return config;
  }

  if (!csrfToken) {
    console.warn('[CSRF] Încercare de a trimite cerere fără token CSRF');
    return config;
  }

  return {
    ...config,
    headers: {
      ...config.headers,
      'X-CSRF-Token': csrfToken
    }
  };
}

/**
 * Funcție utilitară pentru a face cereri cu token CSRF
 * @param url URL-ul cererii
 * @param options Opțiuni pentru fetch
 * @returns Promisiune cu răspunsul
 */
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Asigură-te că avem un token CSRF valid (așteaptă dacă e necesar)
    const csrfToken = await getOrFetchCsrfToken();
    console.log('[CSRF] Folosim token pentru cerere:', csrfToken.substring(0, 8) + '...');
    
    // Setează Content-Type corect dacă lipsește
    let contentType = 'application/json';
    if (options.headers) {
      // Încearcă să extragă Content-Type din headers dacă există
      const headers = options.headers as Record<string, string>;
      if (headers['Content-Type']) {
        contentType = headers['Content-Type'];
      }
    }

    // Create new options with the CSRF token in the headers
    const newOptions: RequestInit = {
      ...options,
      credentials: 'include', // Always include credentials for cookie-based token
      headers: {
        ...options.headers,
        'X-CSRF-Token': csrfToken,
        'Content-Type': contentType,
      },
    };

    console.log(`[CSRF] Request to ${url} with method ${newOptions.method || 'GET'}`);
    
    // Execute the fetch with the updated options
    const response = await window.fetch(url, newOptions);
    console.log(`[CSRF] Response status ${response.status} from ${url}`);

    // Check for a new CSRF token in the response headers
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
      setCsrfToken(newToken);
      console.log('[CSRF] New token received in response:', newToken.substring(0, 8) + '...');
    }

    return response;
  } catch (error) {
    console.error('[CSRF] Error in fetchWithCsrf:', error);
    throw error;
  }
}

/**
 * Inițializează sistemul CSRF prin solicitarea unui token inițial
 */
export async function initializeCsrf(): Promise<void> {
  try {
    console.log('[CSRF] Inițializare protecție CSRF...');
    // Obține un token CSRF (va aștepta dacă o inițializare e în curs)
    await getOrFetchCsrfToken();
    console.log('[CSRF] Protecție CSRF inițializată cu succes');
  } catch (error) {
    console.error('[CSRF] Eroare la inițializarea protecției CSRF:', error);
    throw error;
  }
}