import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { insertClientSchema, insertServiceProviderSchema, insertCarSchema, insertRequestSchema, clients } from "@shared/schema";
import { json } from "express";
import session from "express-session";
import { db } from "./db";
import { auth as firebaseAdmin } from "firebase-admin";
import admin from "firebase-admin";
import { eq } from 'drizzle-orm';
import { isClientUser, isServiceProviderUser } from "@shared/schema";


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

// Update the user type helper functions
const getUserWithRole = (user: any, role: "client" | "service") => {
  const { password, ...userWithoutPassword } = user;
  return { ...userWithoutPassword, role };
};

interface IStorage {
    createClient: any;
    createServiceProvider: any;
    getClientByFirebaseUid: any;
    getServiceProviderByFirebaseUid: any;
    getClient: any;
    getServiceProvider: any;
    getClientCars: any;
    createCar: any;
    getCar: any;
    updateCar: any;
    deleteCar: any;
    createRequest: any;
    getClientRequests: any;
    getRequest: any;
    updateRequest: any;
    getRequestsByLocation: any;
    getSentOffersByServiceProvider: any;
    createSentOffer: any;
    updateSentOfferStatus: any;
    getOffersForClient: any;
    getClientByPhone: any;
    getServiceProviderByPhone: any;
    updateClient: any;
    updateServiceProvider: any;
    createMessage: any;
    getUserMessages: any;
    getMessage: any;
    markMessageAsRead: any;
    getUnreadMessagesCount: any;
    getMessagesByRequest: any;
    markRequestAsViewed: any;
    getViewedRequestsByServiceProvider: any;
    isRequestViewedByProvider: any;
    markOfferAsViewed: any;
    getViewedOffersByClient: any;
    getViewedAcceptedOffersByServiceProvider: any;
    markAcceptedOfferAsViewed: any;
}

const getUserDisplayName = async (userId: number, userRole: "client" | "service", storage: IStorage) => {
  try {
    if (userRole === "client") {
      const client = await storage.getClient(userId);
      return client?.name || "Unknown Client";
    } else {
      const provider = await storage.getServiceProvider(userId);
      return provider?.companyName || "Unknown Service Provider";
    }
  } catch (error) {
    console.error("Error getting user display name:", error);
    return userRole === "client" ? "Unknown Client" : "Unknown Service Provider";
  }
};

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

  // Update the login route to handle user types correctly
  app.post("/api/auth/login", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Login attempt with Firebase UID:", req.firebaseUser!.uid);

      // Try to find user in both tables
      let user = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      let userType = "client";

      if (!user) {
        user = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
        if (user) {
          userType = "service";
        }
      }

      if (!user) {
        console.log("No user found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("User found:", { id: user.id, email: user.email, type: userType });

      // Set user in session
      req.session.userId = user.id;
      req.session.userType = userType as "client" | "service";
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          resolve(true);
        });
      });

      const userWithRole = getUserWithRole(user, userType as "client" | "service");
      console.log("Sending user response:", userWithRole);
      res.json(userWithRole);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Update the get current user endpoint with improved type handling
  app.get("/api/auth/me", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching user data for Firebase UID:', req.firebaseUser!.uid);

      // Try to find user in both tables
      let user = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      let userType = "client";

      if (!user) {
        user = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
        if (user) {
          userType = "service";
        }
      }

      if (!user) {
        console.log('No user found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(401).json({ error: "Not authenticated" });
      }

      console.log('Successfully retrieved user data:', { id: user.id, email: user.email, role: userType });
      res.json(getUserWithRole(user, userType));
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

  // Fix error handling in car deletion endpoint
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
    } catch (error: unknown) {
      console.error("Error deleting car:", error);
      if (error instanceof Error) {
        res.status(500).json({
          error: "Failed to delete car",
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } else {
        res.status(500).json({ error: "Failed to delete car" });
      }
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

  // Update the GET /api/service/offers endpoint
  app.get("/api/service/offers", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view their offers." });
      }

      // Fetch sent offers for this service provider
      const sentOffers = await storage.getSentOffersByServiceProvider(provider.id);

      // For accepted offers, fetch client information
      const offersWithClientInfo = await Promise.all(
        sentOffers.map(async (offer) => {
          if (offer.status === "Accepted") {
            const request = await storage.getRequest(offer.requestId);
            if (request) {
              // Use query to get client directly from the database
              const client = await db.query.clients.findFirst({
                where: eq(clients.id, request.clientId)
              });
              if (client) {
                return {
                  ...offer,
                  clientName: client.name,
                  clientPhone: client.phone
                };
              }
            }
          }
          return offer;
        })
      );

      res.json(offersWithClientInfo);
    } catch (error) {
      console.error("Error getting service offers:", error);
      res.status(500).json({ error: "Failed to get offers" });
    }
  });

  // Add endpoint to get specific offer by request ID
  app.get("/api/service/offers/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view their offers." });
      }

      const requestId = parseInt(req.params.requestId);
      const sentOffers = await storage.getSentOffersByServiceProvider(provider.id);

      // Find the offer for this specific request
      const offer = sentOffers.find(o => o.requestId === requestId);

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Get client information if the offer is accepted
      if (offer.status === "Accepted") {
        const request = await storage.getRequest(offer.requestId);
        if (request) {
          const client = await db.query.clients.findFirst({
            where: eq(clients.id, request.clientId)
          });
          if (client) {
            return res.json({
              ...offer,
              clientName: client.name,
              clientPhone: client.phone
            });
          }
        }
      }

      res.json(offer);
    } catch (error) {
      console.error("Error getting service offer:", error);
      res.status(500).json({ error: "Failed to get offer" });
    }
  });

  // Fix create offer endpoint to include required fields
  app.post("/api/service/offers", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can send offers." });
      }

      // Get request details to include user information
      const request = await storage.getRequest(req.body.requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      const requestUser = await storage.getClient(request.clientId);
      if (!requestUser) {
        return res.status(404).json({ error: "Request user not found" });
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
        notes: req.body.notes || null,
        requestUserId: requestUser.id,
        requestUserName: requestUser.name
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

  // Update the client offers endpoint
  app.get("/api/client/offers", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Fetching offers for Firebase UID:", req.firebaseUser!.uid);

      // Try both client and service provider
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);

      // If user is a service provider, return 403
      if (serviceProvider) {
        console.log("Service provider attempted to access client offers:", req.firebaseUser!.uid);
        return res.status(403).json({
          error: "Access denied. This endpoint is only for clients."
        });
      }

      // If no user found at all, return 401
      if (!client) {
        console.log("No user found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("Found client:", { id: client.id, email: client.email });

      // Fetch offers for this client's requests
      const offers = await storage.getOffersForClient(client.id);
      console.log("Retrieved offers count:", offers.length);

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

      // Check if there's already an accepted offer for this request
      const offerId = parseInt(req.params.id);
      const allOffers = await storage.getOffersForClient(client.id);
      const offer = allOffers.find(o => o.id === offerId);

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Check for existing accepted offers
      const existingAcceptedOffers = allOffers.filter(o =>
        o.requestId === offer.requestId && o.status === "Accepted"
      );

      if (existingAcceptedOffers.length > 0) {
        return res.status(400).json({
          error: "Cannot accept offer",
          message: "There is already an accepted offer for this request"
        });
      }

      const updatedOffer = await storage.updateSentOfferStatus(offerId, "Accepted");
      await storage.updateRequest(offer.requestId, { status: "Rezolvat" });

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

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error rejecting offer:", error);
      res.status(500).json({ error: "Failed to reject offer" });
    }
  });

  // Add this after the reject offer endpoint (around line 857)
  app.post("/api/client/offers/:id/cancel", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can cancel offers." });
      }

      const offerId = parseInt(req.params.id);
      const updatedOffer = await storage.updateSentOfferStatus(offerId, "Pending");

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error canceling offer:", error);
      res.status(500).json({ error: "Failed to cancel offer" });
    }
  });

  // Add endpoint to mark offer as viewed
  app.post("/api/client/mark-offer-viewed/:offerId", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Marking offer as viewed - Request params:', req.params);

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        console.log('Client not found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(403).json({ error: "Access denied. Only clients can mark offers as viewed." });
      }
      console.log('Client found:', { id: client.id, email: client.email });

      const offerId = parseInt(req.params.offerId);
      console.log('Attempting to mark offer as viewed:', { clientId: client.id, offerId });

      // Verify the offer exists
      const offers = await storage.getOffersForClient(client.id);
      const offerExists = offers.some(offer => offer.id === offerId);

      if (!offerExists) {
        console.log('Offer not found or not accessible to client:', offerId);
        return res.status(404).json({ error: "Offer not found or not accessible" });
      }

      const viewedOffer = await storage.markOfferAsViewed(client.id, offerId);
      console.log('Successfully marked offer as viewed:', viewedOffer);

      res.json(viewedOffer);
    } catch (error) {
      console.error("Error marking offer as viewed:", error);
      res.status(500).json({ error: "Failed to mark offer as viewed" });
    }
  });

  // Add endpoint to get viewed offers
app.get("/api/client/viewed-offers", validateFirebaseToken, async (req, res) => {
    try {      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can view their viewed offers." });
      }

      const viewedOffers = await storage.getViewedOffersByClient(client.id);
      console.log('Retrieved viewed offers for client:', client.id, viewedOffers);
      res.json(viewedOffers);
    } catch (error) {
      console.error("Error getting viewed offers:", error);
      res.status(500).json({ error: "Failed to get viewed offers" });
    }
  });

  // Updated message routes
  app.post("/api/messages", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Message request body:", req.body);
      const { content, receiverId, receiverRole, requestId } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: "requestId is required" });
      }

      // Get sender information
      const sender = receiverRole === "client"
        ? await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid)
        : await storage.getClientByFirebaseUid(req.firebaseUser!.uid);

      if (!sender) {
        console.log("Sender not found for Firebase UID:", req.firebaseUser!.uid);
        return res.status(401).json({ error: "Sender not found" });
      }

      // Validate receiver exists
      const receiver = receiverRole=== "client"
        ? await storage.getClient(receiverId)
        : await storage.getServiceProvider(receiverId);

      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }

      // Validate request exists
      const request = await storage.getRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      const message = await storage.createMessage({
        requestId,
        senderId: sender.id,
        senderRole: receiverRole === "client" ? "service" : "client",
        receiverId,
        receiverRole,
        content
      });

      // Add display names to the response
      const enrichedMessage = {
        ...message,
        senderName: await getUserDisplayName(message.senderId, message.senderRole, storage),
        receiverName: await getUserDisplayName(message.receiverId, message.receiverRole, storage)
      };

      res.status(201).json(enrichedMessage);
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Ensure we're always sending JSON response
      res.status(500).json({
        error: "Failed to send message",
        details: error.message || "Unknown error occurred"
      });
    }
  });

  app.get("/api/messages/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);

      if (!client && !serviceProvider) {
        return res.status(401).json({ error: "User not found" });
      }

      const userId = client ? client.id : serviceProvider!.id;
      const userRole = client ? "client" : "service";
      const requestId = parseInt(req.params.requestId);

      const messages = await storage.getUserMessages(userId, userRole, requestId);

      // Enrich messages with display names
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => ({
          ...message,
          senderName: await getUserDisplayName(message.senderId, message.senderRole, storage),
          receiverName: await getUserDisplayName(message.receiverId, message.receiverRole, storage)
        }))
      );

      console.log('Sending enriched messages:', enrichedMessages.length);
      res.json(enrichedMessages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Add endpoint to get unread messages count
  app.get("/api/messages/unread", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);

      if (!client && !serviceProvider) {
        return res.status(401).json({ error: "User not found" });
      }

      const userId = client ? client.id : serviceProvider!.id;
      const userRole = client ? "client" : "service";

      const count = await storage.getUnreadMessagesCount(userId, userRole);
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread messages count:", error);
      res.status(500).json({ error: "Failed to fetch unread messages count" });
    }
  });

  // Add this endpoint after the existing /api/messages GET endpoint
  app.post("/api/service/messages/send", validateFirebaseToken, async (req, res) => {
    try {
      const { content, receiverId, requestId } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: "requestId is required" });
      }

      // Get sender information
      const sender = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!sender) {
        return res.status(401).json({ error: "Sender not found" });
      }

      // Get request to verify the connection
      const request = await storage.getRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Get receiver (client) information
      const receiver = await storage.getClient(request.clientId);
      if (!receiver) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Create the message
      const message = await storage.createMessage({
        requestId,
        senderId: sender.id,
        senderRole: "service",
        receiverId: receiver.id,
        receiverRole: "client",
        content
      });

      // Add names to the response
      const enrichedMessage = {
        ...message,
        senderName: sender.companyName,
        receiverName: receiver.name
      };

      res.json(enrichedMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Update the GET messages endpoint
  app.get("/api/service/messages/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Service provider not found" });
      }

      const requestId = parseInt(req.params.requestId);
      const request = await storage.getRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Get the client information
      const client = await storage.getClient(request.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get messages for this specific request
      const messages = await storage.getUserMessages(serviceProvider.id, "service", requestId);

      // Enrich messages with sender and receiver names
      const enrichedMessages = messages.map(message => ({
        ...message,
        senderName: message.senderRole === "service" ? serviceProvider.companyName : client.name,
        receiverName: message.receiverRole === "service" ? serviceProvider.companyName : client.name
      }));

      console.log('Sending enriched messages:', enrichedMessages);
      res.json(enrichedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Add this endpoint to get service conversations
  app.get("/api/service/conversations", validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Service provider not found" });
      }

      // Get all messages for this service provider
      const messages = await storage.getUserMessages(serviceProvider.id, "service", null);

      // Group messages by requestId
      const conversationsByRequest = messages.reduce((acc: any, message: any) => {
        if (!acc[message.requestId]) {
          acc[message.requestId] = message;
        }
        return acc;
      }, {});

      // Get client information for each conversation
      const conversations = await Promise.all(
        Object.values(conversationsByRequest).map(async (message: any) => {
          const request = await storage.getRequest(message.requestId);
          if (!request) return null;

          const client = await storage.getClient(request.clientId);
          if (!client) return null;

          return {
            userId: client.id,
            userName: client.name,
            requestId: message.requestId,
            lastMessage: message.content
          };
        })
      );

      // Filter out null values and sort by requestId
      const validConversations = conversations
        .filter(conv => conv !== null)
        .sort((a: any, b: any) => b.requestId - a.requestId);

      res.json(validConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Add service viewed request endpoint
  app.post("/api/service/mark-request-viewed/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can mark requests as viewed." });
      }

      const requestId = parseInt(req.params.requestId);
      const viewedRequest = await storage.markRequestAsViewed(provider.id, requestId);

      res.json(viewedRequest);
    } catch (error) {
      console.error("Error marking request as viewed:", error);
      res.status(500).json({ error: "Failed to mark request as viewed" });
    }
  });

  // Add endpoint to get viewed requests for a service provider
  app.get("/api/service/viewed-requests", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view their viewed requests." });
      }

      const viewedRequests = await storage.getViewedRequestsByServiceProvider(provider.id);
      res.json(viewedRequests);
    } catch (error) {
      console.error("Error getting viewed requests:", error);
      res.status(500).json({ error: "Failed to get viewed requests" });
    }
  });

  // Add endpoint to check if a request has been viewed
  app.get("/api/service/is-request-viewed/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can check viewed requests." });
      }

      const requestId = parseInt(req.params.requestId);
      const isViewed = await storage.isRequestViewedByProvider(provider.id, requestId);

      res.json({ isViewed });
    } catch (error) {
      console.error("Error checking if request is viewed:", error);
      res.status(500).json({ error: "Failed to check if request is viewed" });
    }
  });

  // Add endpoint to get viewed accepted offers
  app.get("/api/service/viewed-accepted-offers", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view their viewed offers." });
      }

      const viewedOffers = await storage.getViewedAcceptedOffersByServiceProvider(provider.id);
      res.json(viewedOffers);
    } catch (error) {
      console.error("Error getting viewed accepted offers:", error);
      res.status(500).json({ error: "Failed to get viewed accepted offers" });
    }
  });

  // Add endpoint to mark accepted offer as viewed
  app.post("/api/service/mark-accepted-offer-viewed/:offerId", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Marking accepted offer as viewed - Request params:', req.params);

      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        console.log('Service provider not found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(403).json({ error: "Access denied. Only service providers can mark offers as viewed." });
      }
      console.log('Service provider found:', { id: provider.id, email: provider.email });

      const offerId = parseInt(req.params.offerId);
      console.log('Attempting to mark accepted offer as viewed:', { providerId: provider.id, offerId });

      // Verify the offer exists and belongs to this provider
      const offers = await storage.getSentOffersByServiceProvider(provider.id);
      const offerExists = offers.some(offer => offer.id === offerId && offer.status === "Accepted");

      if (!offerExists) {
        console.log('Accepted offer not found or not accessible to provider:', offerId);
        return res.status(404).json({ error: "Accepted offer not found or not accessible" });
      }

      const viewedOffer = await storage.markAcceptedOfferAsViewed(provider.id, offerId);
      console.log('Successfully marked accepted offer as viewed:', viewedOffer);

      res.json(viewedOffer);
    } catch (error) {
      console.error("Error marking accepted offer as viewed:", error);
      res.status(500).json({ error: "Failed to mark accepted offer as viewed" });
    }
  });

  const server = createServer(app);

  // Initialize WebSocket server with minimal configuration
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'  // Keep this path consistent with client
  });

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');

    // Send immediate connection acknowledgment
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);

        // Broadcast to all clients except sender
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: 'Failed to process message',
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  return server;
}