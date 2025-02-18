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
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}

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

  const validateFirebaseToken = async (req: Request, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided in request headers');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      console.log('Attempting to verify Firebase token...');
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.firebaseUser = decodedToken;
      console.log('Firebase token verified successfully for UID:', decodedToken.uid);
      next();
    } catch (error) {
      console.error('Firebase token verification failed');
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  app.post("/api/auth/register", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Registration attempt - Input data:", {
        ...req.body,
        password: '[REDACTED]',
        firebaseUid: req.firebaseUser?.uid
      });

      const { role, ...registrationData } = req.body;

      if (!role || !["client", "service"].includes(role)) {
        console.error("Invalid role specified:", role);
        return res.status(400).json({ error: "Invalid role specified" });
      }

      const userInput = insertUserSchema.parse(registrationData);
      console.log("User data validation passed");

      let result;
      console.log("Creating user with role:", role);

      if (role === "client") {
        result = await storage.createClient(
          {
            ...userInput,
            firebaseUid: req.firebaseUser!.uid,
          },
          {
            name: registrationData.name,
            phone: registrationData.phone,
            county: registrationData.county,
            city: registrationData.city,
          }
        );
        console.log("Client created successfully:", { id: result.user.id, email: result.user.email });
      } else {
        result = await storage.createServiceProvider(
          {
            ...userInput,
            firebaseUid: req.firebaseUser!.uid,
          },
          {
            name: registrationData.name,
            phone: registrationData.phone,
            companyName: registrationData.companyName,
            representativeName: registrationData.representativeName,
            cui: registrationData.cui,
            tradeRegNumber: registrationData.tradeRegNumber,
            address: registrationData.address,
            county: registrationData.county,
            city: registrationData.city,
          }
        );
        console.log("Service provider created successfully:", { id: result.user.id, email: result.user.email });
      }

      req.session.userId = result.user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          }
          resolve();
        });
      });

      const { password, ...userWithoutPassword } = result.user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        res.status(400).json({
          error: "Registration failed",
          message: process.env.NODE_ENV === 'development' ? error.message : 'Invalid registration data'
        });
      } else {
        res.status(500).json({ error: "An unexpected error occurred during registration" });
      }
    }
  });

  app.post("/api/auth/login", validateFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching user data for Firebase UID:', req.firebaseUser!.uid);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { password, ...userWithoutPassword } = user;
      console.log('Successfully retrieved user data:', { id: user.id, email: user.email });
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user data" });
    }
  });

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

  app.patch("/api/auth/profile", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Profile update attempt with data:", req.body);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updatedUser = await storage.updateUser(user.id, req.body);
      console.log('Successfully updated user data:', { id: updatedUser.id, email: updatedUser.email });

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

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

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("Found user:", { id: user.id, email: user.email });

      const carData = insertCarSchema.parse({
        ...req.body,
        userId: user.id
      });

      console.log("Validated car data:", carData);

      const car = await storage.createCar(carData);
      console.log("Successfully created car:", car);

      res.status(201).json(car);
    } catch (error: any) {
      console.error("Error creating car:", error);

      if (error.errors) {
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

      const car = await storage.getCar(parseInt(req.params.id));
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      if (car.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to update this car" });
      }

      const updatedCar = await storage.updateCar(parseInt(req.params.id), {
        ...req.body,
        userId: user.id 
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

      const car = await storage.getCar(parseInt(req.params.id));
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      if (car.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to delete this car" });
      }

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

  app.post("/api/requests", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Request creation attempt with data:", req.body);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("Found user:", { id: user.id, email: user.email });

      const requestData = insertRequestSchema.parse({
        ...req.body,
        userId: user.id,
        preferredDate: new Date(req.body.preferredDate)
      });

      console.log("Validated request data:", requestData);

      const request = await storage.createRequest(requestData);
      console.log("Successfully created request:", request);

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

  app.patch("/api/requests/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Request status update attempt for ID:", req.params.id, "with data:", req.body);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log("User not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      if (!["Active", "Rezolvat", "Anulat"].includes(req.body.status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

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

  app.post("/api/auth/check-phone", async (req, res) => {
    try {
      const { phone } = req.body;
      console.log("Phone check bypassed for number:", phone);

      res.status(200).json({ available: true });
    } catch (error) {
      console.error("Phone check error details:", error);
      res.status(500).json({
        error: "Failed to check phone number",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  app.get("/api/client/profile", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching client profile for Firebase UID:', req.firebaseUser!.uid);

      const user = await storage.getUserByFirebaseUid(req.firebaseUser!.uid);
      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      if (user.role !== 'client') {
        return res.status(403).json({ error: "Access denied. Only clients can access this endpoint." });
      }

      const { password, ...userWithoutPassword } = user;
      console.log('Successfully retrieved client profile:', { id: user.id, email: user.email });
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting client profile:", error);
      res.status(500).json({ error: "Failed to get client profile" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    clientTracking: true
  });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('message', (message) => {
      try {
        console.log('Received WebSocket message:', message.toString());
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  return httpServer;
}