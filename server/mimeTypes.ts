
import { Express } from 'express';

export function setCustomMimeTypes(app: Express) {
  app.use((req, res, next) => {
    // Setarea tipului MIME pentru TypeScript
    if (req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    
    // Setarea tipului MIME pentru Service Worker
    if (req.url.endsWith('sw.js') || req.url.endsWith('sw-registration.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    
    next();
  });
}
