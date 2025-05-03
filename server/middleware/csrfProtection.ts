/**
 * Middleware pentru protecția împotriva atacurilor CSRF (Cross-Site Request Forgery)
 * Implementează verificarea token-urilor CSRF pentru rutele care modifică date
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logSecurityEvent } from './securityMiddleware';

// Stocare temporară pentru tokenuri CSRF (în producție ar trebui folosită o soluție de cache distribuită)
const csrfTokens: Record<string, { token: string, createdAt: number }> = {};

// Durată de viață pentru tokenurile CSRF (2 ore)
const TOKEN_LIFETIME = 2 * 60 * 60 * 1000;

/**
 * Generează un token CSRF și îl asociază cu sesiunea user-ului
 */
export const generateCsrfToken = (req: Request): string => {
  // Generează un token random de 32 bytes și convertește-l la hex
  const token = randomBytes(32).toString('hex');
  
  // Obține un identificator pentru sesiune
  const sessionId = req.sessionID || req.ip || 'unknown-session';
  
  // Stochează tokenul cu timestamp
  csrfTokens[sessionId] = {
    token,
    createdAt: Date.now()
  };
  
  return token;
};

/**
 * Middleware pentru a adăuga token CSRF în răspunsuri
 */
export const csrfTokenInjector = (req: Request, res: Response, next: NextFunction) => {
  // Generează un nou token CSRF pentru fiecare cerere
  const csrfToken = generateCsrfToken(req);
  
  // Adaugă tokenul în header-ul răspunsului
  res.setHeader('X-CSRF-Token', csrfToken);
  
  // Adaugă tokenul și în obiectul locals pentru a fi disponibil în răspunsurile HTML
  res.locals.csrfToken = csrfToken;
  
  next();
};

/**
 * Middleware pentru a verifica tokenul CSRF în cereri care modifică date
 * Se aplică doar pentru metode non-GET (POST, PUT, DELETE, etc.)
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Aplicăm doar pentru cereri care modifică date
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Obține tokenul din header sau din body
  const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
  
  if (!csrfToken) {
    // Lipsă token CSRF
    logSecurityEvent('CSRF_MISSING_TOKEN', `Missing CSRF token for ${req.method} ${req.path}`, req);
    return res.status(403).json({ error: 'CSRF token missing' });
  }
  
  // Obține identificatorul sesiunii
  const sessionId = req.sessionID || req.ip || 'unknown-session';
  
  // Verifică dacă tokenul există și este valid
  const storedToken = csrfTokens[sessionId];
  
  if (!storedToken) {
    // Niciun token stocat pentru această sesiune
    logSecurityEvent('CSRF_NO_SESSION', `No CSRF session for ${req.method} ${req.path}`, req);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Verifică dacă tokenul nu a expirat
  if (Date.now() - storedToken.createdAt > TOKEN_LIFETIME) {
    // Token expirat, îl ștergem
    delete csrfTokens[sessionId];
    logSecurityEvent('CSRF_EXPIRED_TOKEN', `Expired CSRF token for ${req.method} ${req.path}`, req);
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  // Verifică dacă tokenul coincide
  if (storedToken.token !== csrfToken) {
    logSecurityEvent('CSRF_INVALID_TOKEN', `Invalid CSRF token for ${req.method} ${req.path}`, req);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Token valid, continuă cu cererea
  next();
};

/**
 * Curățare periodică a tokenurilor expirate
 * Ar trebui rulată periodic prin cron sau la un interval
 */
export const cleanupExpiredTokens = () => {
  const now = Date.now();
  
  // Iterăm prin toate tokenurile și le ștergem pe cele expirate
  Object.keys(csrfTokens).forEach(sessionId => {
    if (now - csrfTokens[sessionId].createdAt > TOKEN_LIFETIME) {
      delete csrfTokens[sessionId];
    }
  });
  
  console.log(`[CSRF] Curățare terminată. ${Object.keys(csrfTokens).length} tokenuri active.`);
};

// Pornește curățarea periodică a tokenurilor (o dată la 30 de minute)
setInterval(cleanupExpiredTokens, 30 * 60 * 1000);