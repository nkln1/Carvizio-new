import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAdminRoutes } from "./routes/admin";
import * as admin from 'firebase-admin';
import { db } from "./db";
import { eq } from "drizzle-orm";
import { clients, serviceProviders, requests, reviews } from "@shared/schema";
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

  // Admin Dashboard routes - start
  // Lista de e-mailuri cu roluri de admin
  const ADMIN_EMAILS = ['nikelino6@yahoo.com'];
  
  // Middleware pentru verificarea dacă utilizatorul este admin
  const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ message: 'Autentificare necesară' });
      }
      
      const adminEmail = req.firebaseUser.email;
      
      if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
        return res.status(403).json({ message: 'Nu aveți drepturi de administrator' });
      }
      
      next();
    } catch (error) {
      console.error('Eroare la verificarea drepturilor de admin:', error);
      return res.status(500).json({ message: 'Eroare internă a serverului' });
    }
  };

  // Firebase Auth Middleware
  const validateFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.firebaseUser = decodedToken;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Admin routes
  app.get('/api/admin/clients', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const clients = await db.select().from(clients);
      res.json(clients);
    } catch (error) {
      console.error('Eroare la obținerea listei de clienți:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de clienți' });
    }
  });
  
  app.get('/api/admin/service-providers', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const serviceProviders = await db.select().from(serviceProviders);
      res.json(serviceProviders);
    } catch (error) {
      console.error('Eroare la obținerea listei de furnizori de servicii:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de furnizori de servicii' });
    }
  });
  
  app.get('/api/admin/requests', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const allRequests = await db.select().from(requests);
      res.json(allRequests);
    } catch (error) {
      console.error('Eroare la obținerea listei de cereri:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de cereri' });
    }
  });
  
  app.get('/api/admin/reviews', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const allReviews = await db.select().from(reviews);
      res.json(allReviews);
    } catch (error) {
      console.error('Eroare la obținerea listei de review-uri:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de review-uri' });
    }
  });
  
  app.post('/api/admin/client/:id/verify', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { verified } = req.body;
      
      const updatedClient = await db
        .update(clients)
        .set({ verified: verified === true })
        .where(eq(clients.id, clientId))
        .returning();
      
      res.json(updatedClient[0]);
    } catch (error) {
      console.error('Eroare la actualizarea statusului de verificare pentru client:', error);
      res.status(500).json({ message: 'Eroare la actualizarea statusului de verificare' });
    }
  });
  
  app.post('/api/admin/service-provider/:id/verify', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const { verified } = req.body;
      
      const updatedProvider = await db
        .update(serviceProviders)
        .set({ verified: verified === true })
        .where(eq(serviceProviders.id, providerId))
        .returning();
      
      res.json(updatedProvider[0]);
    } catch (error) {
      console.error('Eroare la actualizarea statusului de verificare pentru furnizor:', error);
      res.status(500).json({ message: 'Eroare la actualizarea statusului de verificare' });
    }
  });
  
  app.post('/api/admin/review/:id/dismiss-report', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      
      const updatedReview = await db
        .update(reviews)
        .set({ reportStatus: 'dismissed' })
        .where(eq(reviews.id, reviewId))
        .returning();
      
      res.json(updatedReview[0]);
    } catch (error) {
      console.error('Eroare la actualizarea statusului de raportare pentru recenzie:', error);
      res.status(500).json({ message: 'Eroare la actualizarea statusului de raportare' });
    }
  });
  // Admin Dashboard routes - end

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