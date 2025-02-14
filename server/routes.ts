import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCarSchema } from "@shared/schema";
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

  // Add profile update endpoint
  app.patch("/api/auth/profile", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Profile update attempt with data:", req.body);

      // Find user by Firebase UID
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Update user data
      const updatedUser = await storage.updateUser(user.id, req.body);
      console.log('Successfully updated user data:', { id: updatedUser.id, email: updatedUser.email });

      // Remove sensitive data from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Car management endpoints
  app.get("/api/cars", validateFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const cars = await storage.getUserCars(user.id);
      res.json(cars);
    } catch (error) {
      console.error("Error getting user cars:", error);
      res.status(500).json({ error: "Failed to get cars" });
    }
  });

  app.post("/api/cars", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Car creation attempt with data:", req.body);

      // Get the current user
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("Found user:", { id: user.id, email: user.email });

      // Validate and parse request body
      const carData = insertCarSchema.parse({
        ...req.body,
        userId: user.id
      });

      console.log("Validated car data:", carData);

      // Create the car
      const car = await storage.createCar(carData);
      console.log("Successfully created car:", car);

      res.status(201).json(car);
    } catch (error: any) {
      console.error("Error creating car:", error);

      if (error.errors) {
        // Zod validation error
        return res.status(400).json({
          error: "Invalid car data",
          details: error.errors
        });
      }

      res.status(500).json({
        error: "Failed to save car",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Add these new endpoints after the POST /api/cars endpoint
  app.patch("/api/cars/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Car update attempt for ID:", req.params.id, "with data:", req.body);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      // Fetch the car to verify ownership
      const car = await storage.getCar(parseInt(req.params.id));
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      if (car.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to update this car" });
      }

      // Validate and parse request body
      const carData = insertCarSchema.partial().parse(req.body);

      // Update the car
      const updatedCar = await storage.updateCar(parseInt(req.params.id), carData);
      console.log("Successfully updated car:", updatedCar);

      res.json(updatedCar);
    } catch (error: any) {
      console.error("Error updating car:", error);

      if (error.errors) {
        return res.status(400).json({
          error: "Invalid car data",
          details: error.errors
        });
      }

      res.status(500).json({
        error: "Failed to update car",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.delete("/api/cars/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Car deletion attempt for ID:", req.params.id);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      // Fetch the car to verify ownership
      const car = await storage.getCar(parseInt(req.params.id));
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      if (car.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to delete this car" });
      }

      // Delete the car
      await storage.deleteCar(parseInt(req.params.id));
      console.log("Successfully deleted car:", req.params.id);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting car:", error);
      res.status(500).json({
        error: "Failed to delete car",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}