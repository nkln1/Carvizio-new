import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { setCustomMimeTypes } from "./mimeTypes";

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server with proper configuration
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
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

// Configure CORS and security headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
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