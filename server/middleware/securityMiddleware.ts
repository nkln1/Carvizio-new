/**
 * Middleware de securitate pentru aplicația Auto Service
 * Acesta include:
 * - Anteturi de securitate pentru prevenirea diverselor atacuri web
 * - Rate limiting pentru prevenirea atacurilor de forță brută
 * - Funcționalitate pentru sanitizarea datelor
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Middleware pentru a adăuga anteturi de securitate la fiecare răspuns
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Previne atacurile de tip clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Previne atacurile de tip MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Activează XSS Protection în browsere
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy temporar dezactivat pentru a evita probleme cu interfața
  // Vom implementa o versiune mai bine configurată după ce toate problemele sunt rezolvate
  // res.setHeader(
  //   'Content-Security-Policy',
  //   "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline'; font-src * data: 'unsafe-inline';"
  // );
  
  // Strict Transport Security (doar în producție)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Middleware pentru limitarea ratei de încercări la autentificare
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 20, // 20 încercări per IP în fereastra de timp (mărit de la 5)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Prea multe încercări de autentificare. Vă rugăm încercați din nou peste 15 minute.' },
});

// Middleware pentru limitarea ratei de cereri generale
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minut
  max: 300, // 300 cereri per IP per minut (mărit de la 100)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Prea multe cereri. Vă rugăm încercați din nou mai târziu.' },
});

// Middleware pentru auditarea acțiunilor de securitate
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const { method, path, ip } = req;
  const userInfo = req.firebaseUser ? `User ID: ${req.firebaseUser.uid}` : 'Unauthenticated';
  
  // Log pentru acțiuni sensibile
  if (path.includes('/auth/') || path.includes('/admin/') || method !== 'GET') {
    console.log(`[SECURITY] ${new Date().toISOString()} | ${method} ${path} | ${ip} | ${userInfo}`);
  }
  
  next();
};

// Funcție utilă pentru a înregistra încercările de acces neautorizat
export function logSecurityEvent(type: string, details: string, req: Request, userId: string | null = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    details,
    userId,
    ipAddress: req.ip
  };
  
  console.log(`[SECURITY EVENT] ${JSON.stringify(logEntry)}`);
}

// Middleware pentru sanitizarea datelor (implementare de bază)
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // O implementare de bază pentru sanitizarea datelor
    // Pentru un proiect în producție, se recomandă folosirea unei biblioteci 
    // dedicate cum ar fi DOMPurify sau sanitize-html
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      }
    });
  }
  next();
};