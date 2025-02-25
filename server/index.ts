import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server first
const wss = new WebSocketServer({ 
  server,
  path: '/api/ws',
  // Add WebSocket server options
  verifyClient: (info, cb) => {
    // Allow all origins in development
    const origin = info.origin;
    cb(true); // Accept the connection
  }
});

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error occurred: ${error.message}`);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure CORS for both HTTP and WebSocket
app.use((req, res, next) => {
  // Allow requests from any origin in development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Set CSP headers with WebSocket permissions
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' wss: ws: https://identitytoolkit.googleapis.com https://*.firebaseauth.com https://*.googleapis.com; " +
    "frame-src 'self' https://*.firebaseauth.com"
  );
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const startServer = async (initialPort: number) => {
    let port = initialPort;
    const maxRetries = 10;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise((resolve, reject) => {
          server.listen(port, '0.0.0.0')
            .once('listening', () => {
              console.log(`Server running on port ${port}`);
              resolve(true);
            })
            .once('error', (err: any) => {
              if (err.code === 'EADDRINUSE') {
                port++;
                server.close();
                resolve(false);
              } else {
                reject(err);
              }
            });
        });
        break;
      } catch (error) {
        console.error(`Failed to start server on port ${port}:`, error);
        if (i === maxRetries - 1) throw error;
      }
    }
  };

  const initialPort = parseInt(process.env.PORT || '5000');
  startServer(initialPort);
})();