import { Express } from 'express';

export function setCustomMimeTypes(app: Express) {
  app.use((req, res, next) => {
    // Setăm tipul MIME corect pentru fișierele TypeScript și JavaScript
    if (req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.url.endsWith('.js') || req.url.endsWith('.jsx') || req.url.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.url.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (req.url.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (req.url.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    next();
  });
}