import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cookieParser from 'cookie-parser';
import { setCustomMimeTypes } from "./mimeTypes";
import { securityHeaders, generalRateLimiter, securityLogger, sanitizeInput } from "./middleware/securityMiddleware";
import { sqlInjectionProtection, databaseOperationMonitoring } from "./middleware/databaseSecurity";
import { csrfTokenInjector, csrfProtection } from "./middleware/csrfProtection";
import { storage } from "./storage";

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
app.use(cookieParser()); // Add cookie parser middleware

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

// Funcție pentru verificarea cererilor expirate
async function checkExpiredRequests() {
  try {
    console.log('Rulare verificare automată pentru cereri expirate (fără oferte după 7 zile)');
    const result = await storage.checkAndExpireOldRequests();
    console.log(`Verificare completă: ${result.expired} cereri au expirat și au fost marcate ca anulate`);
    
    if (result.expired > 0) {
      // Dacă există cereri expirate, le notificăm prin WebSocket pentru actualizare în timp real
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'REQUESTS_EXPIRED',
            count: result.expired,
            message: `${result.expired} cereri au expirat automat deoarece nu au primit oferte în 7 zile.`,
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
  } catch (error) {
    console.error('Eroare la verificarea automată a cererilor expirate:', error);
  }
}

// Funcție pentru verificarea ofertelor expirate
async function checkExpiredOffers() {
  try {
    console.log('Rulare verificare automată pentru oferte expirate (după 30 zile + data preferată)');
    const result = await storage.checkAndExpireOldOffers();
    console.log(`Verificare completă: ${result.expired} oferte au expirat și au fost marcate ca respinse`);
    
    if (result.expired > 0) {
      // Dacă există oferte expirate, le notificăm prin WebSocket pentru actualizare în timp real
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'OFFERS_EXPIRED',
            count: result.expired,
            message: `${result.expired} oferte au expirat automat conform regulilor de business.`,
            timestamp: new Date().toISOString()
          }));
        }
      });
    }
  } catch (error) {
    console.error('Eroare la verificarea automată a ofertelor expirate:', error);
  }
}

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
    
    // Executăm verificarea cererilor expirate la pornirea serverului
    checkExpiredRequests().catch(err => {
      console.error('Eroare la verificarea inițială a cererilor expirate:', err);
    });
    
    // Executăm verificarea ofertelor expirate la pornirea serverului
    checkExpiredOffers().catch(err => {
      console.error('Eroare la verificarea inițială a ofertelor expirate:', err);
    });

    // Planificăm verificarea automată a cererilor și ofertelor expirate (o dată pe zi)
    // Definim interval de 24 ore (în milisecunde)
    const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 ore
    
    // Setăm intervalul pentru verificarea automată a cererilor
    setInterval(() => {
      console.log('Rulare verificare automată planificată pentru cererile expirate');
      checkExpiredRequests().catch(err => {
        console.error('Eroare la verificarea planificată a cererilor expirate:', err);
      });
    }, CHECK_INTERVAL_MS);
    
    // Setăm intervalul pentru verificarea automată a ofertelor
    setInterval(() => {
      console.log('Rulare verificare automată planificată pentru ofertele expirate');
      checkExpiredOffers().catch(err => {
        console.error('Eroare la verificarea planificată a ofertelor expirate:', err);
      });
    }, CHECK_INTERVAL_MS);
    
    console.log(`Verificarea automată a cererilor și ofertelor expirate configurată (interval: ${CHECK_INTERVAL_MS / (60 * 60 * 1000)} ore)`);
  });
})();

export { wss };