
import { Express } from 'express';
import path from 'path';

export function setCustomMimeTypes(app: Express) {
  // Middleware pentru gestionarea corectă a tipurilor MIME
  app.use((req, res, next) => {
    const url = req.url || '';
    const extension = path.extname(url).toLowerCase();
    
    // Debugging pentru a vedea ce fișiere sunt cerute
    if (url.includes('sw.js')) {
      console.log(`[MIME Type Debug] Requested: ${url}, extension: ${extension}`);
    }

    // Map pentru extensii și tipuri MIME
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.ts': 'application/javascript',
      '.tsx': 'application/javascript',
      '.map': 'application/json',
      '.txt': 'text/plain',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'font/otf',
    };

    // Adăugare specifică pentru Service Workers
    if (url.endsWith('sw.js') || url.endsWith('sw-registration.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      console.log(`[MIME Type] Set application/javascript for ${url}`);
    }
    // Setare MIME type bazat pe extensie
    else if (extension && mimeTypes[extension]) {
      res.setHeader('Content-Type', mimeTypes[extension]);
    }
    
    // Asigurăm că Service Worker-ul nu este cache-uit
    if (url.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  });
}
