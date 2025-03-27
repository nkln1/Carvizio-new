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

    // Adăugare specifică pentru Service Workers și fișiere JavaScript
    if (url.includes('sw.js') || url.includes('sw-registration.js') || extension === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
      if (url.includes('sw.js')) {
        console.log(`[MIME Type] Set application/javascript for ${url}`);
      }
    }
    // Setare MIME type bazat pe extensie pentru alte tipuri de fișiere
    else if (extension && mimeTypes[extension]) {
      res.setHeader('Content-Type', mimeTypes[extension]);
    }

    // Asigurăm că Service Worker-ul nu este cache-uit
    if (url.includes('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    next();
  });
    // Asigurăm că sw.js este tratat corect ca JavaScript indiferent de extensie
  app.get('/sw.js', (req, res, next) => {
    res.setHeader('Content-Type', 'application/javascript');
    next();
  });
}