/**
 * Module pentru gestionarea token-urilor CSRF pe partea de client
 * Permite stocarea și recuperarea token-ului CSRF pentru cereri.
 */

// Stocarea ultimului token CSRF primit
let csrfToken: string | null = null;

/**
 * Actualizează tokenul CSRF din header-ul răspunsului
 * @param response Răspunsul HTTP
 */
export function updateCsrfToken(response: Response): void {
  const token = response.headers.get('X-CSRF-Token');
  if (token) {
    csrfToken = token;
    console.log('Token CSRF actualizat');
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
    console.log('Token CSRF extras din headers');
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
    console.warn('Încercare de a trimite cerere fără token CSRF');
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
  // Pentru metode care pot modifica date, adăugăm CSRF
  const method = options.method?.toUpperCase() || 'GET';
  const optionsWithCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) 
    ? addCsrfHeader(options) 
    : options;
  
  const response = await fetch(url, optionsWithCsrf);
  
  // Actualizăm tokenul CSRF la fiecare răspuns
  updateCsrfToken(response);
  
  return response;
}

/**
 * Inițializează sistemul CSRF prin solicitarea unui token inițial
 */
export async function initializeCsrf(): Promise<void> {
  try {
    // Facem o cerere GET pentru a obține un token CSRF
    const response = await fetch('/api/health');
    updateCsrfToken(response);
    console.log('CSRF token inițializat cu succes');
  } catch (error) {
    console.error('Eroare la inițializarea tokenului CSRF:', error);
  }
}