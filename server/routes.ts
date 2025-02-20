import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { insertClientSchema, insertServiceProviderSchema, insertCarSchema, insertRequestSchema } from "@shared/schema";
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
    userType?: "client" | "service";
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
      const { role, ...userData } = req.body;
      console.log("Registration attempt with data:", { ...userData, password: '[REDACTED]', role });

      let user;
      if (role === "client") {
        // Validate client data
        const clientData = insertClientSchema.parse(userData);
        user = await storage.createClient({
          ...clientData,
          firebaseUid: req.firebaseUser!.uid
        });
      } else if (role === "service") {
        // Validate service provider data
        const providerData = insertServiceProviderSchema.parse(userData);
        user = await storage.createServiceProvider({
          ...providerData,
          firebaseUid: req.firebaseUser!.uid
        });
      } else {
        return res.status(400).json({ error: "Invalid role specified" });
      }

      // Set user in session
      req.session.userId = user.id;
      req.session.userType = role;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      console.log(`${role} created successfully:`, { id: user.id, email: user.email });
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Registration error details:", error);

      // Check for duplicate phone number error
      if (error.code === '23505' &&
        (error.constraint === 'clients_phone_key' ||
          error.constraint === 'service_providers_phone_key')) {
        return res.status(400).json({
          error: "Phone number already registered",
          field: "phone",
          message: "Acest număr de telefon este deja înregistrat. Te rugăm să folosești alt număr de telefon."
        });
      }

      res.status(400).json({
        error: "Invalid registration data",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", validateFirebaseToken, async (req, res) => {
    try {
      // Try to find user in both tables
      let user = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      let userType = "client";

      if (!user) {
        user = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
        userType = "service";
      }

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Set user in session
      req.session.userId = user.id;
      req.session.userType = userType as "client" | "service";
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, role: userType });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get current user endpoint with improved error handling
  app.get("/api/auth/me", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching user data for Firebase UID:', req.firebaseUser!.uid);

      // Try to find user in both tables
      let user = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      let userType = "client";

      if (!user) {
        user = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
        userType = "service";
      }

      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      console.log('Successfully retrieved user data:', { id: user.id, email: user.email, role: userType });
      res.json({ ...userWithoutPassword, role: userType });
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

  // Car management endpoints
  app.get("/api/cars", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const cars = await storage.getClientCars(client.id);
      res.json(cars);
    } catch (error) {
      console.error("Error getting client cars:", error);
      res.status(500).json({ error: "Failed to get cars" });
    }
  });

  app.post("/api/cars", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const carData = insertCarSchema.parse({
        ...req.body,
        clientId: client.id
      });

      const car = await storage.createCar(carData);
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
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const car = await storage.getCar(parseInt(req.params.id));
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      if (car.clientId !== client.id) {
        return res.status(403).json({ error: "Not authorized to update this car" });
      }

      const updatedCar = await storage.updateCar(parseInt(req.params.id), req.body);
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
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const car = await storage.getCar(parseInt(req.params.id));
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      if (car.clientId !== client.id) {
        return res.status(403).json({ error: "Not authorized to delete this car" });
      }

      await storage.deleteCar(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting car:", error);
      res.status(500).json({
        error: "Failed to delete car",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Request management endpoints
  app.post("/api/requests", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const requestData = insertRequestSchema.parse({
        ...req.body,
        clientId: client.id,
        preferredDate: new Date(req.body.preferredDate)
      });

      const request = await storage.createRequest(requestData);

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
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const requests = await storage.getClientRequests(client.id);
      res.json(requests);
    } catch (error) {
      console.error("Error getting client requests:", error);
      res.status(500).json({ error: "Failed to get requests" });
    }
  });

  app.patch("/api/requests/:id", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      // Validate status value
      if (!["Active", "Rezolvat", "Anulat"].includes(req.body.status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const request = await storage.getRequest(parseInt(req.params.id));
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      if (request.clientId !== client.id) {
        return res.status(403).json({ error: "Not authorized to update this request" });
      }

      const updatedRequest = await storage.updateRequest(parseInt(req.params.id), {
        status: req.body.status
      });

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
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view requests." });
      }

      // Fetch requests that match the service's location
      const matchingRequests = await storage.getRequestsByLocation(provider.county, [provider.city]);
      res.json(matchingRequests);
    } catch (error) {
      console.error("Error getting requests by location:", error);
      res.status(500).json({ error: "Failed to get requests" });
    }
  });

  // Add the GET endpoint for service offers after the service/requests endpoint
  app.get("/api/service/offers", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view their offers." });
      }

      // Fetch sent offers for this service provider
      const sentOffers = await storage.getSentOffersByServiceProvider(provider.id);
      res.json(sentOffers);
    } catch (error) {
      console.error("Error getting service offers:", error);
      res.status(500).json({ error: "Failed to get offers" });
    }
  });

  // Add service offers endpoints
  app.post("/api/service/offers", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can send offers." });
      }

      // Convert ISO date strings back to Date objects
      const availableDates = req.body.availableDates.map((dateStr: string) => new Date(dateStr));

      const offer = await storage.createSentOffer({
        serviceProviderId: provider.id,
        requestId: req.body.requestId,
        title: req.body.title,
        details: req.body.details,
        availableDates,
        price: req.body.price,
        notes: req.body.notes || null
      });

      // Send notification through WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'NEW_OFFER',
            payload: offer
          }));
        }
      });

      res.status(201).json(offer);
    } catch (error: any) {
      console.error("Error creating service offer:", error);
      res.status(500).json({
        error: "Failed to create offer",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Add profile update endpoints for both client and service provider
  app.patch("/api/auth/profile", validateFirebaseToken, async (req, res) => {
    try {
      const { userType } = req.session;

      if (!userType) {
        return res.status(401).json({ error: "Session not found" });
      }

      let user;
      if (userType === "client") {
        const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }

        // Only update if phone number changed
        if (req.body.phone && req.body.phone !== client.phone) {
          // Check if phone is already taken by another user
          const existingClientWithPhone = await storage.getClientByPhone(req.body.phone);
          if (existingClientWithPhone && existingClientWithPhone.id !== client.id) {
            return res.status(400).json({
              error: "Phone number already in use",
              field: "phone"
            });
          }
        }

        const updatedClient = await storage.updateClient(client.id, {
          name: req.body.name,
          phone: req.body.phone,
          county: req.body.county,
          city: req.body.city,
        });

        const { password, ...clientWithoutPassword } = updatedClient;
        user = { ...clientWithoutPassword, role: "client" };

      } else if (userType === "service") {
        const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
        if (!provider) {
          return res.status(404).json({ error: "Service provider not found" });
        }

        // Only update if phone number changed
        if (req.body.phone && req.body.phone !== provider.phone) {
          // Check if phone is already taken by another provider
          const existingProviderWithPhone = await storage.getServiceProviderByPhone(req.body.phone);
          if (existingProviderWithPhone && existingProviderWithPhone.id !== provider.id) {
            return res.status(400).json({
              error: "Phone number already in use",
              field: "phone"
            });
          }
        }

        const updatedProvider = await storage.updateServiceProvider(provider.id, {
          companyName: req.body.companyName,
          representativeName: req.body.representativeName,
          phone: req.body.phone,
          cui: req.body.cui,
          tradeRegNumber: req.body.tradeRegNumber,
          address: req.body.address,
          county: req.body.county,
          city: req.body.city,
        });

        const { password, ...providerWithoutPassword } = updatedProvider;
        user = { ...providerWithoutPassword, role: "service" };
      }

      res.json(user);
    } catch (error) {
      console.error("Profile update error:", error);
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        // Handle unique constraint violation
        return res.status(400).json({
          error: "Phone number already in use",
          field: "phone"
        });
      }
      res.status(500).json({ error: "Could not update profile" });
    }
  });

  // Add phone check endpoint
  app.post("/api/auth/check-phone", async (req, res) => {
    // Temporarily disabled phone number check
    res.status(200).json({ available: true });
  });

  // Add client offers endpoint
  app.get("/api/client/offers", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can view their offers." });
      }

      // Fetch offers for this client's requests
      const offers = await storage.getOffersForClient(client.id);
      res.json(offers);
    } catch (error) {
      console.error("Error getting client offers:", error);
      res.status(500).json({ error: "Failed to get offers" });
    }
  });

  // Add these endpoints after the existing /api/client/offers GET endpoint
  app.post("/api/client/offers/:id/accept", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can accept offers." });
      }

      const offerId = parseInt(req.params.id);
      const updatedOffer = await storage.updateSentOfferStatus(offerId, "Accepted");

      // Send notification through WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'OFFER_STATUS_CHANGED',
            payload: { ...updatedOffer, status: "Accepted" }
          }));
        }
      });

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error accepting offer:", error);
      res.status(500).json({ error: "Failed to accept offer" });
    }
  });

  app.post("/api/client/offers/:id/reject", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can reject offers." });
      }

      const offerId = parseInt(req.params.id);
      const updatedOffer = await storage.updateSentOfferStatus(offerId, "Rejected");

      // Send notification through WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'OFFER_STATUS_CHANGED',
            payload: { ...updatedOffer, status: "Rejected" }
          }));
        }
      });

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error rejecting offer:", error);
      res.status(500).json({ error: "Failed to reject offer" });
    }
  });

  app.post("/api/client/offers/:id/cancel", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can cancel offers." });
      }

      const offerId = parseInt(req.params.id);
      const updatedOffer = await storage.updateSentOfferStatus(offerId, "Pending");

      // Send notification through WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'OFFER_STATUS_CHANGED',
            payload: { ...updatedOffer, status: "Pending" }
          }));
        }
      });

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error canceling offer:", error);
      res.status(500).json({ error: "Failed to cancel offer" });
    }
  });


  const httpServer = createServer(app);

  // Initialize WebSocket server with the correct path to match client
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/api/ws'  // Update path to match client configuration
  });

  // WebSocket connection handler with improved error handling
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        // Handle different message types
        switch (data.type) {
          case 'OFFER_SENT':
            // Broadcast to all connected clients
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'NEW_OFFER',
                  payload: data.payload
                }));
              }
            });
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  return httpServer;
}