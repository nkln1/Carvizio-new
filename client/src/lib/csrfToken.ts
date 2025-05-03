/**
 * Module pentru gestionarea token-urilor CSRF pe partea de client
 * Permite stocarea și recuperarea token-ului CSRF pentru cereri.
 */

// Stocarea ultimului token CSRF primit
let csrfToken: string | null = null;

/**
 * Setează tokenul CSRF.  Adăugată pentru a permite setarea tokenului din fetchWithCsrf.
 * @param token Noul token CSRF.
 */
export function setCsrfToken(token: string): void {
  csrfToken = token;
  console.log('Token CSRF setat direct:', token.substring(0, 8) + '...');
}

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
  try {
    // First, ensure we have a CSRF token by making a GET request to the healthcheck endpoint
    if (!getCsrfToken()) {
      try {
        console.log('Nu există token CSRF, obținem unul de la health-check');
        const healthCheckResponse = await window.fetch('/api/health-check', {
          method: 'GET',
          credentials: 'include' // Esențial pentru cookie-uri
        });

        const newToken = healthCheckResponse.headers.get('X-CSRF-Token');
        if (newToken) {
          setCsrfToken(newToken);
          console.log('Retrieved new CSRF token from health-check:', newToken.substring(0, 8) + '...');
        } else {
          console.warn('Health-check request succeeded, but no CSRF token in response');
          // Inspectăm toate headerele din răspuns
          const headers = Array.from(healthCheckResponse.headers.entries());
          console.log('Health-check response headers:', headers);
        }
      } catch (healthCheckError) {
        console.error('Error fetching CSRF token:', healthCheckError);
      }
    }

    // Get the most recent CSRF token
    const csrfToken = getCsrfToken();
    console.log('Using CSRF token:', csrfToken ? csrfToken.substring(0, 8) + '...' : 'None');

    // Create new options with the CSRF token in the headers
    const newOptions: RequestInit = {
      ...options,
      credentials: 'include', // Always include credentials for cookie-based token
      headers: {
        ...options.headers,
        'X-CSRF-Token': csrfToken || '',
        'Content-Type': options.headers?.['Content-Type'] || 'application/json', // Asigură content type-ul corect
      },
    };

    console.log(`fetchWithCsrf: Request to ${url} with method ${newOptions.method || 'GET'}`);
    
    // Execute the fetch with the updated options
    const response = await window.fetch(url, newOptions);
    console.log(`fetchWithCsrf: Response status ${response.status} from ${url}`);

    // Check for a new CSRF token in the response headers
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
      setCsrfToken(newToken);
      console.log('New CSRF token received in response:', newToken.substring(0, 8) + '...');
    }

    return response;
  } catch (error) {
    console.error('Error in fetchWithCsrf:', error);
    throw error;
  }
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