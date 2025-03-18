
import { Express } from 'express';

export function setCustomMimeTypes(app: Express) {
  app.use((req, res, next) => {
    if (req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    next();
  });
}
