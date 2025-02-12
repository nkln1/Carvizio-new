import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { json } from "express";
import session from "express-session";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
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

  // User registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("Registration attempt with data:", { ...req.body, password: '[REDACTED]' });

      // Validate request body
      const userInput = insertUserSchema.parse(req.body);
      console.log("Validation passed, parsed user input:", { ...userInput, password: '[REDACTED]' });

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userInput.email);
      if (existingUser) {
        console.log("User already exists:", userInput.email);
        return res.status(400).json({ 
          error: "Email already registered" 
        });
      }

      // Create user
      console.log("Attempting to create user...");
      const user = await storage.createUser(userInput);
      console.log("User created successfully:", { id: user.id, email: user.email });

      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            resolve(true);
          });
        });
      }

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
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ 
          error: "Invalid credentials" 
        });
      }

      // Set user in session
      if (req.session) {
        req.session.userId = user.id;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            resolve(true);
          });
        });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        error: "Login failed" 
      });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ 
          error: "Not authenticated" 
        });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ 
          error: "User not found" 
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        error: "Failed to get user data" 
      });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ 
            error: "Failed to logout" 
          });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ 
          message: "Logged out successfully" 
        });
      });
    } else {
      res.status(200).json({ 
        message: "Already logged out" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}