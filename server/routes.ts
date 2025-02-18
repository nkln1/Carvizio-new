import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { insertUserSchema, insertCarSchema, insertRequestSchema, users, clients, serviceProviders } from "@shared/schema";
import { json } from "express";
import session from "express-session";
import { db } from "./db";
import { auth as firebaseAdmin } from "firebase-admin";
import admin from "firebase-admin";
import { eq } from 'drizzle-orm';

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

// Add this helper function at the top of the file
async function getUserRole(userId: number): Promise<"client" | "service" | undefined> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId));

  if (client) return "client";

  const [serviceProvider] = await db
    .select()
    .from(serviceProviders)
    .where(eq(serviceProviders.userId, userId));

  if (serviceProvider) return "service";

  return undefined;
}

async function getUserLocation(userId: number): Promise<{ county?: string; city?: string }> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId));

  if (client) {
    return { county: client.county, city: client.city };
  }

  const [serviceProvider] = await db
    .select()
    .from(serviceProviders)
    .where(eq(serviceProviders.userId, userId));

  if (serviceProvider) {
    return { county: serviceProvider.county, city: serviceProvider.city };
  }

  return {};
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

      // Update the car
      const updatedCar = await storage.updateCar(parseInt(req.params.id), {
        ...req.body,
        userId: user.id // Ensure userId remains unchanged
      });
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

  // Add request endpoints
  app.post("/api/requests", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Request creation attempt with data:", req.body);

      // Get the current user
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("Found user:", { id: user.id, email: user.email });

      // Validate and parse request body
      const requestData = insertRequestSchema.parse({
        ...req.body,
        userId: user.id,
        preferredDate: new Date(req.body.preferredDate)
      });

      console.log("Validated request data:", requestData);

      // Create the request
      const request = await storage.createRequest(requestData);
      console.log("Successfully created request:", request);

      // Broadcast the new request to all connected services
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'NEW_REQUEST',
            payload: request
          }));
        }
      });

      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating request:", error);

      if (error.errors) {
        // Zod validation error
        return res.status(400).json({
          error: "Invalid request data",
          details: error.errors
        });
      }

      res.status(500).json({
        error: "Failed to save request",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Add GET requests endpoint
  app.get("/api/requests", validateFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const requests = await storage.getUserRequests(user.id);
      res.json(requests);
    } catch (error) {
      console.error("Error getting user requests:", error);
      res.status(500).json({ error: "Failed to get requests" });
    }
  });

  // Add PATCH endpoint for request status update
  app.patch("/api/requests/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Request status update attempt for ID:", req.params.id, "with data:", req.body);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      // Validate status value
      if (!["Active", "Rezolvat", "Anulat"].includes(req.body.status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Update the request status
      const updatedRequest = await storage.updateRequest(parseInt(req.params.id), {
        status: req.body.status
      });

      console.log("Successfully updated request:", updatedRequest);
      res.json(updatedRequest);
    } catch (error: any) {
      console.error("Error updating request status:", error);
      res.status(500).json({
        error: "Failed to update request status",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Add service requests endpoint
  app.get("/api/service/requests", validateFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const role = await getUserRole(user.id);
      if (role !== "service") {
        return res.status(403).json({ error: "Access denied. Only service providers can view requests." });
      }

      const location = await getUserLocation(user.id);
      if (!location.county) {
        return res.status(400).json({ error: "Service provider must set their county" });
      }

      const serviceCities = location.city ? [location.city] : [];
      const matchingRequests = await storage.getRequestsByLocation(location.county, serviceCities);
      res.json(matchingRequests);
    } catch (error) {
      console.error("Error getting requests by location:", error);
      res.status(500).json({ error: "Failed to get requests" });
    }
  });

  // Update the phone check endpoint with proper error handling
  app.post("/api/auth/check-phone", async (req, res) => {
    try {
      const { phone, type } = req.body;
      console.log("Checking phone number:", phone, "for type:", type);

      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      if (!type || !["client", "service"].includes(type)) {
        return res.status(400).json({ error: "Invalid account type" });
      }

      // Check in the appropriate table based on the account type
      if (type === "client") {
        const [clientWithPhone] = await db
          .select()
          .from(clients)
          .where(eq(clients.phone, phone));

        if (clientWithPhone) {
          return res.status(400).json({
            error: "Phone number already registered",
            code: "PHONE_EXISTS"
          });
        }
      } else {
        const [serviceProviderWithPhone] = await db
          .select()
          .from(serviceProviders)
          .where(eq(serviceProviders.phone, phone));

        if (serviceProviderWithPhone) {
          return res.status(400).json({
            error: "Phone number already registered",
            code: "PHONE_EXISTS"
          });
        }
      }

      res.status(200).json({ available: true });
    } catch (error) {
      console.error("Phone check error details:", error);
      res.status(500).json({
        error: "Failed to check phone number",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });


  // Add client profile endpoint
  app.get("/api/client/profile", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching client profile for Firebase UID:', req.firebaseUser!.uid);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      // Verify that this is a client user
      if (user.role !== 'client') {
        return res.status(403).json({ error: "Access denied. Only clients can access this endpoint." });
      }

      // Remove sensitive data from response
      const { password, ...userWithoutPassword } = user;
      console.log('Successfully retrieved client profile:', { id: user.id, email: user.email });
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting client profile:", error);
      res.status(500).json({ error: "Failed to get client profile" });
    }
  });

  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Handle WebSocket connections
  wss.on('connection', ws => {
    console.log('Client connected');
    ws.on('message', message => {
      console.log('Received:', message);
      // handle message
    });
    ws.on('close', () => console.log('Client disconnected'));
  });

  return httpServer;
}