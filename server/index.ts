import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " + // Allow script evaluation for necessary functionality
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://identitytoolkit.googleapis.com https://*.firebaseauth.com https://*.googleapis.com; " +
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

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

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