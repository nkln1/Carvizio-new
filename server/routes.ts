import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { json } from "express";

export function registerRoutes(app: Express): Server {
  app.use(json());

  // User registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body
      const userInput = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userInput.email);
      if (existingUser) {
        return res.status(400).json({ 
          error: "Email already registered" 
        });
      }

      // Create user
      const user = await storage.createUser(userInput);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        error: "Invalid registration data" 
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
  app.get("/api/auth/user", async (req, res) => {
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