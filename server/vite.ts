import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

  // In vite.ts file, modify the setupVite function
export async function setupVite(app: Express, server: Server) {
    const serverOptions = {
      middlewareMode: true,
      // Explicitly disable HMR
      hmr: false, 
      // Set allowed hosts to true
      allowedHosts: true,
    };

    // Custom Vite logger with error handling
    const customLogger = {
      ...viteLogger,
      error: (msg: string, options: any) => {
        // Only log the error, don't crash the server
        viteLogger.error(msg, options);
      },
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger,
      server: serverOptions,
      appType: "custom",
    });

    // Configure CORS headers
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

      // Set proper MIME types for JavaScript modules
      if (req.url && req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (req.url && req.url.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (req.url && req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );

        // Add a cache-busting query parameter to prevent stale content
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        const timestamp = new Date().getTime();
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}&t=${timestamp}"`,
        );

        const page = await vite.transformIndexHtml(url, template);

        // Add cache control headers to prevent caching
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
          'Content-Type': 'text/html',
        });

        res.status(200).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

export function serveStatic(app: Express) {
    const distPath = path.resolve(__dirname, "public");

    if (!fs.existsSync(distPath)) {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }

    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
  });
}