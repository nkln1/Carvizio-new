import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { json } from "express";
import session from "express-session";
import { pool } from "./db";
import { auth as firebaseAdmin } from "firebase-admin";
import admin from "firebase-admin";

// Extend the Express Request type to include firebaseUser
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: admin.auth.DecodedIdToken;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Initialize Firebase Admin with credentials
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export function registerRoutes(app: Express): Server {
  // Configure session middleware
  app.use(
    session({
      secret: process.env.REPL_ID || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      store: storage.sessionStore
    })
  );

  app.use(json());

  // Firebase Auth Middleware with improved error handling
  const validateFirebaseToken = async (req: Request, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.firebaseUser = decodedToken;
      console.log('Firebase token verified successfully for user:', decodedToken.uid);
      next();
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // User registration endpoint
  app.post("/api/auth/register", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Registration attempt with data:", { ...req.body, password: '[REDACTED]' });

      // Validate request body
      const userInput = insertUserSchema.parse(req.body);
      console.log("Validation passed, parsed user input:", { ...userInput, password: '[REDACTED]' });

      // Create user
      console.log("Attempting to create user...");
      const user = await storage.createUser({
        ...userInput,
        firebaseUid: req.firebaseUser!.uid
      });
      console.log("User created successfully:", { id: user.id, email: user.email });

      // Set user in session
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Registration error details:", error);
      res.status(400).json({
        error: "Invalid registration data",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", validateFirebaseToken, async (req, res) => {
    try {
      // Find user by Firebase UID
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Set user in session
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get current user endpoint with improved error handling
  app.get("/api/auth/me", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching user data for Firebase UID:', req.firebaseUser!.uid);

      // Find user by Firebase UID
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      console.log('Successfully retrieved user data:', { id: user.id, email: user.email });
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      res.status(200).json({ message: "Already logged out" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}