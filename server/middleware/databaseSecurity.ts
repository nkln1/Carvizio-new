/**
 * Middleware pentru protecția bazei de date
 * Implementează validări și verificări de securitate pentru operațiunile cu baza de date
 */

import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './securityMiddleware';

// Liste de termeni SQL periculoși care ar putea indica o injecție SQL
const DANGEROUS_SQL_TERMS = [
  'DROP TABLE',
  'DROP DATABASE',
  'TRUNCATE TABLE',
  'DELETE FROM',
  'UPDATE.*SET',
  ';.*SELECT',
  'CREATE USER',
  'ALTER USER',
  'GRANT',
  'EXECUTE',
  'UNION.*SELECT',
  'INTO OUTFILE',
  'INTO DUMPFILE',
  'LOAD DATA INFILE',
];

// Regex pentru a detecta potențiale atacuri de injecție SQL
const SQL_INJECTION_REGEX = new RegExp(DANGEROUS_SQL_TERMS.join('|'), 'i');

/**
 * Middleware care verifică requesturile pentru potențiale atacuri SQL Injection
 * Analizează body-ul și query params pentru a detecta modele suspecte
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  // Verificăm body-ul pentru potențiale atacuri
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    if (SQL_INJECTION_REGEX.test(bodyStr)) {
      // Logăm evenimentul de securitate
      logSecurityEvent(
        'SQL_INJECTION_ATTEMPT',
        `Potențial atac SQL injection detectat în body: ${bodyStr.slice(0, 100)}...`,
        req,
        req.firebaseUser?.uid || null
      );
      return res.status(403).json({ 
        error: 'Cerere invalidă',
        details: 'Au fost detectate modele periculoase în cererea trimisă.'
      });
    }
  }

  // Verificăm query params pentru potențiale atacuri
  if (req.query && Object.keys(req.query).length > 0) {
    const queryStr = JSON.stringify(req.query);
    if (SQL_INJECTION_REGEX.test(queryStr)) {
      // Logăm evenimentul de securitate
      logSecurityEvent(
        'SQL_INJECTION_ATTEMPT',
        `Potențial atac SQL injection detectat în query params: ${queryStr.slice(0, 100)}...`,
        req,
        req.firebaseUser?.uid || null
      );
      return res.status(403).json({ 
        error: 'Cerere invalidă',
        details: 'Au fost detectate modele periculoase în parametrii URL.'
      });
    }
  }

  next();
};

/**
 * Middleware de monitorizare pentru operațiunile sensibile pe baza de date
 * Verifică și înregistrează operațiunile de scriere (INSERT, UPDATE, DELETE)
 */
export const databaseOperationMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Detectarea operațiunilor de modificare a datelor în rute API
  if (
    req.path.includes('/api/admin') || 
    req.method === 'POST' || 
    req.method === 'PUT' || 
    req.method === 'DELETE' || 
    req.method === 'PATCH'
  ) {
    // Logăm operațiunile sensibile pentru audit
    const sensitiveOperation = `${req.method} ${req.path}`;
    const userInfo = req.firebaseUser ? `User: ${req.firebaseUser.uid}` : 'Necunoscut';
    
    console.log(`[DATABASE AUDIT] ${new Date().toISOString()} | ${sensitiveOperation} | ${userInfo} | IP: ${req.ip}`);
  }

  next();
};