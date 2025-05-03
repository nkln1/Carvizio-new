import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { setCustomMimeTypes } from "./mimeTypes";
import { securityHeaders, generalRateLimiter, securityLogger, sanitizeInput } from "./middleware/securityMiddleware";
import { sqlInjectionProtection, databaseOperationMonitoring } from "./middleware/databaseSecurity";
import { csrfTokenInjector, csrfProtection } from "./middleware/csrfProtection";

const app = express();
// Configurare pentru a avea încredere în proxy-uri (necesar pentru express-rate-limit într-un mediu cu proxy)
app.set('trust proxy', 1);
const server = http.createServer(app);

// Export server for use in routes.ts
export { server };

// Initialize WebSocket server with proper configuration
// Use a different path that won't conflict with Vite in development
const wss = new WebSocketServer({ 
  server,
  path: '/socket',  // Use a different path to avoid conflicts with Vite
  clientTracking: true
});

// Improved WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established:', req.url);

  // Send a welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'WebSocket connection established successfully'
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received WebSocket message:', data);

      // Broadcast message to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Heartbeat to keep connections alive
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply security middleware
app.use(securityHeaders);
app.use(securityLogger);
app.use(sanitizeInput);

// Middleware pentru protecția bazei de date
app.use(sqlInjectionProtection);
app.use(databaseOperationMonitoring);

// Middleware suplimentar care suprascrie CSP pentru a elimina restricțiile
app.use((req, res, next) => {
  // Eliminăm complet CSP
  res.removeHeader('Content-Security-Policy');
  next();
});

// Apply rate limiter for all routes (except static files)
app.use('/api/', generalRateLimiter);

// Aplicăm protecția CSRF pentru rutele API (generează token pentru cereri GET și verifică pentru cereri care modifică date)
app.use('/api/', csrfTokenInjector);
app.use('/api/', csrfProtection);

// Configure CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Setăm Content-Type doar pentru API-uri, nu pentru fișiere statice
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});

// Initialize routes
(async () => {
  // Aplicăm configurarea MIME types ÎNAINTE de a înregistra rutele
  setCustomMimeTypes(app); // Add MIME type configuration
  
  // registerRoutes no longer returns a server instance
  registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000');
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
})();

export { wss };