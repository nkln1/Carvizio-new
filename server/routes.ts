import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { insertClientSchema, insertServiceProviderSchema, insertCarSchema, insertRequestSchema, clients, reviews, insertReviewSchema } from "@shared/schema";
import { getEmailNotificationService } from './services';
import { json } from "express";
import session from "express-session";
import { db } from "./db";
import { auth as firebaseAdmin } from "firebase-admin";
import admin from "firebase-admin";
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { serviceProviders, workingHours } from '@shared/schema';
import { isClientUser, isServiceProviderUser } from "@shared/schema";
import { wss } from './index';
import * as fs from 'fs';
import * as path from 'path';
import { registerToken, unregisterToken, sendNotification } from './routes/notifications';

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
    getSentOffersByRequest: any;
    markConversationAsRead: any;
    getServiceProviderWorkingHours: any;
    createWorkingHour: any;
    updateWorkingHours: any;
    deleteWorkingHour: any;
    getWorkingHours: any;
    getServiceProviderByUsername: any;
    createReview: any;
    updateReview: any;
    deleteReview: any;
    getServiceProviderAverageRating: any;
    getNotificationPreferences: any;
    createNotificationPreferences: any;
    updateNotificationPreferences: any;
    getServiceProviderReviews: any;
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
  
  // Firebase Auth Middleware cu gestionare îmbunătățită a erorilor
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

  // Adăugăm rute specifice pentru Service Worker
  app.get('/sw.js', (req, res) => {
    console.log('!!!! RUTA SW.JS ACCESATĂ !!!!');
    try {
      const rootDir = process.cwd();
      const swPath = path.join(rootDir, 'public', 'sw.js');
      console.log('Calea către Service Worker:', swPath);
      
      if (fs.existsSync(swPath)) {
        console.log('Fișierul sw.js există, îl servim cu tipul application/javascript');
        // Setăm explicit tipul MIME și alte headere importante pentru Service Worker
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Citim fișierul și îl trimitem ca răspuns direct în loc de sendFile
        const swContent = fs.readFileSync(swPath, 'utf8');
        res.status(200).send(swContent);
        console.log('Service Worker servit din ' + swPath);
      } else {
        console.error('Fișierul sw.js nu a fost găsit la calea:', swPath);
        res.status(404).send('Service Worker file not found');
      }
    } catch (error) {
      console.error('Eroare la servirea Service Worker:', error);
      res.status(500).send('Internal server error serving Service Worker');
    }
  });

  // Rută pentru Firebase Messaging Service Worker
  app.get('/firebase-messaging-sw.js', (req, res) => {
    console.log('!!!! RUTA FIREBASE-MESSAGING-SW.JS ACCESATĂ !!!!');
    try {
      const rootDir = process.cwd();
      const swPath = path.join(rootDir, 'public', 'firebase-messaging-sw.js');
      console.log('Calea către Firebase Messaging Service Worker:', swPath);
      
      if (fs.existsSync(swPath)) {
        console.log('Fișierul firebase-messaging-sw.js există, îl servim cu tipul application/javascript');
        // Setăm explicit tipul MIME și alte headere importante pentru Service Worker
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Citim fișierul și îl trimitem ca răspuns direct în loc de sendFile
        const swContent = fs.readFileSync(swPath, 'utf8');
        res.status(200).send(swContent);
        console.log('Firebase Messaging Service Worker servit din ' + swPath);
      } else {
        console.error('Fișierul firebase-messaging-sw.js nu a fost găsit la calea:', swPath);
        res.status(404).send('Firebase Messaging Service Worker nu a fost găsit');
      }
    } catch (error) {
      console.error('Eroare la servirea Firebase Messaging Service Worker:', error);
      res.status(500).send('Eroare internă la încărcarea Firebase Messaging Service Worker');
    }
  });
  
  app.get('/sw-registration.js', (req, res) => {
    console.log('!!!! RUTA SW-REGISTRATION.JS ACCESATĂ !!!!');
    try {
      const rootDir = process.cwd();
      const regPath = path.join(rootDir, 'public', 'sw-registration.js');
      console.log('Calea către Service Worker Registration:', regPath);
      
      if (fs.existsSync(regPath)) {
        console.log('Fișierul sw-registration.js există, îl servim cu tipul application/javascript');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Citim fișierul și îl trimitem ca răspuns direct în loc de sendFile
        const swContent = fs.readFileSync(regPath, 'utf8');
        res.status(200).send(swContent);
        console.log('Service Worker Registration servit din ' + regPath);
      } else {
        console.error('Fișierul sw-registration.js nu a fost găsit la calea:', regPath);
        res.status(404).send('Service Worker Registration file not found');
      }
    } catch (error) {
      console.error('Eroare la servirea Service Worker Registration:', error);
      res.status(500).send('Internal server error serving Service Worker Registration');
    }
  });
  
  // Adăugăm o rută pentru pagina de test a Service Worker-ului
  app.get('/sw-test', (req, res) => {
    console.log('!!!! RUTA SW-TEST ACCESATĂ !!!!');
    try {
      const rootDir = process.cwd();
      const testPagePath = path.join(rootDir, 'public', 'sw-test.html');
      console.log('Calea către pagina de test SW:', testPagePath);
      
      if (fs.existsSync(testPagePath)) {
        console.log('Fișierul sw-test.html există, îl servim');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.status(200).sendFile(testPagePath);
        console.log('Pagina de test Service Worker servită din ' + testPagePath);
      } else {
        console.error('Fișierul sw-test.html nu a fost găsit la calea:', testPagePath);
        res.status(404).send('Service Worker test page not found');
      }
    } catch (error) {
      console.error('Eroare la servirea paginii de test Service Worker:', error);
      res.status(500).send('Internal server error serving Service Worker test page');
    }
  });
  
  // API pentru verificarea mesajelor necitite - folosit de Service Worker
  app.get('/api/service/unread-messages-count', validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Obține numărul de mesaje necitite
      const unreadCount = await storage.getUnreadMessagesCount(serviceProvider.id, "service");
      console.log(`Număr mesaje necitite pentru service provider ${serviceProvider.id}: ${unreadCount}`);
      
      // Răspunde cu numărul de mesaje necitite
      res.json({ count: unreadCount });
    } catch (error) {
      console.error("Error getting unread messages count:", error);
      res.status(500).json({ error: "Failed to get unread messages count" });
    }
  });
  
  app.get('/api/client/unread-messages-count', validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Obține numărul de mesaje necitite
      const unreadCount = await storage.getUnreadMessagesCount(client.id, "client");
      console.log(`Număr mesaje necitite pentru client ${client.id}: ${unreadCount}`);
      
      // Răspunde cu numărul de mesaje necitite
      res.json({ count: unreadCount });
    } catch (error) {
      console.error("Error getting unread messages count:", error);
      res.status(500).json({ error: "Failed to get unread messages count" });
    }
  });
  
  // API pentru obținerea preferințelor de notificări
  app.get('/api/service/notification-preferences', validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Obține preferințele de notificări ale furnizorului de servicii
      const preferences = await storage.getNotificationPreferences(serviceProvider.id);
      
      if (!preferences) {
        // Dacă nu există preferințe, returnează valori implicite
        return res.json({
          id: 0,
          serviceProviderId: serviceProvider.id,
          emailNotificationsEnabled: true,
          newRequestEmailEnabled: true,
          acceptedOfferEmailEnabled: true,
          newMessageEmailEnabled: true,
          newReviewEmailEnabled: true,
          browserNotificationsEnabled: true,
          newRequestBrowserEnabled: true,
          acceptedOfferBrowserEnabled: true,
          newMessageBrowserEnabled: true,
          newReviewBrowserEnabled: true,
          browserPermission: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      res.status(500).json({ error: "Failed to get notification preferences" });
    }
  });
  
  // API pentru actualizarea preferințelor de notificări
  app.post('/api/service/notification-preferences', validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Verifică dacă există deja preferințe
      let preferences = await storage.getNotificationPreferences(serviceProvider.id);
      
      // Extragem doar câmpurile necesare și eliminăm timestamp-urile care pot cauza probleme
      const { 
        emailNotificationsEnabled, 
        newRequestEmailEnabled, 
        acceptedOfferEmailEnabled, 
        newMessageEmailEnabled, 
        newReviewEmailEnabled,
        browserNotificationsEnabled,
        newRequestBrowserEnabled,
        acceptedOfferBrowserEnabled,
        newMessageBrowserEnabled,
        newReviewBrowserEnabled,
        browserPermission
      } = req.body;
      
      // Construim obiectul de preferințe fără createdAt/updatedAt
      const cleanPreferences = {
        emailNotificationsEnabled, 
        newRequestEmailEnabled, 
        acceptedOfferEmailEnabled, 
        newMessageEmailEnabled, 
        newReviewEmailEnabled,
        browserNotificationsEnabled,
        newRequestBrowserEnabled,
        acceptedOfferBrowserEnabled,
        newMessageBrowserEnabled,
        newReviewBrowserEnabled,
        browserPermission
      };
      
      if (!preferences) {
        // Dacă nu există, crează preferințe noi
        const newPreferences = {
          serviceProviderId: serviceProvider.id,
          ...cleanPreferences
        };
        
        preferences = await storage.createNotificationPreferences(newPreferences);
        console.log(`Created notification preferences for service provider ${serviceProvider.id}`);
      } else {
        // Dacă există, actualizează preferințele
        preferences = await storage.updateNotificationPreferences(preferences.id, cleanPreferences);
        console.log(`Updated notification preferences for service provider ${serviceProvider.id}`);
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });
  
  // Endpoint pentru înregistrarea token-ului FCM
  app.post('/api/notifications/register-token', validateFirebaseToken, async (req, res) => {
    try {
      const { token, userId, userRole } = req.body;
      
      if (!token || !userId || !userRole) {
        return res.status(400).json({ 
          error: "Date incomplete", 
          message: "Token FCM, ID utilizator și rol sunt obligatorii" 
        });
      }
      
      // Verificăm tipul de utilizator și preluăm documentul corespunzător
      let user;
      if (userRole === 'client') {
        user = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
        if (!user || user.id !== userId) {
          return res.status(403).json({ error: "Nu aveți permisiunea de a înregistra acest token" });
        }
      } else if (userRole === 'service') {
        user = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
        if (!user || user.id !== userId) {
          return res.status(403).json({ error: "Nu aveți permisiunea de a înregistra acest token" });
        }
      } else {
        return res.status(400).json({ error: "Rol utilizator invalid" });
      }
      
      // Inițializăm Firebase Admin dacă este necesar
      const admin = require('firebase-admin');
      const firestore = admin.firestore();
      
      // Determinăm colecția în funcție de rolul utilizatorului
      const collectionName = userRole === 'client' ? 'clients' : 'service_providers';
      
      // Referință la documentul Firestore pentru acest utilizator
      const userDocRef = firestore.collection(collectionName).doc(userId.toString());
      
      // Obținem documentul pentru a vedea dacă există deja
      const doc = await userDocRef.get();
      
      if (!doc.exists) {
        // Dacă documentul nu există, îl creăm cu token-ul curent
        await userDocRef.set({
          fcmTokens: [token],
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Dacă documentul există, actualizăm lista de token-uri
        // Verificăm mai întâi dacă token-ul există deja
        const userData = doc.data();
        const tokens = userData.fcmTokens || [];
        
        if (!tokens.includes(token)) {
          // Adăugăm token-ul doar dacă nu există deja
          tokens.push(token);
          
          // Actualizăm documentul
          await userDocRef.update({
            fcmTokens: tokens,
            lastUpdated: new Date().toISOString()
          });
        }
      }
      
      console.log(`Token FCM înregistrat cu succes pentru ${userRole} ID ${userId}`);
      res.status(200).json({ 
        success: true,
        message: "Token FCM înregistrat cu succes"
      });
    } catch (error) {
      console.error("Eroare la înregistrarea token-ului FCM:", error);
      res.status(500).json({ 
        error: "Eroare la înregistrarea token-ului",
        message: error instanceof Error ? error.message : "Eroare necunoscută"
      });
    }
  });

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

  // Am mutat middleware-ul validateFirebaseToken la începutul funcției

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

  app.get("/api/auth/service-profile/:username", async (req, res) => {
    console.log("Received request for service profile:", req.params.username);

    try {
      if (!req.params.username) {
        console.log('Username parameter is missing');
        return res.status(400).json({ error: "Username is required" });
      }

      const username = req.params.username;
      console.log('Fetching service profile for username:', username);

      // First get service provider data
      const serviceProvider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.username, username),
        columns: {
          id: true,
          email: true,
          companyName: true,
          representativeName: true,
          phone: true,
          address: true,
          county: true,
          city: true,
          username: true,
          verified: true,
        }
      });

      console.log('Service Provider raw data:', serviceProvider);

      if (!serviceProvider) {
        console.log('No service found with username:', username);
        return res.status(404).json({ error: "Service-ul nu a fost găsit" });
      }

      // Then get working hours
      const workingHoursList = await db.query.workingHours.findMany({
        where: eq(workingHours.serviceProviderId, serviceProvider.id)
      });

      console.log('Working hours raw data:', workingHoursList);

      // Fetch reviews directly from the database
      console.log('Fetching reviews for service provider ID:', serviceProvider.id);
      const serviceReviews = await db.select().from(reviews).where(eq(reviews.serviceProviderId, serviceProvider.id));
      console.log('Found reviews count:', serviceReviews.length);

      // Fetch client names for reviews
      const reviewsWithClientData = await Promise.all(
        serviceReviews.map(async (review) => {
          try {
            const client = await db.query.clients.findFirst({
              where: eq(clients.id, review.clientId),
              columns: { name: true }
            });

            return {
              ...review,
              clientName: client?.name || "Client"
            };
          } catch (err) {
            console.error('Error fetching client for review:', err);
            return {
              ...review,
              clientName: "Client"
            };
          }
        })
      );

      console.log('Processed reviews with client data:', reviewsWithClientData.length);

      // Construct the response
      const responseData = {
        id: serviceProvider.id,
        email: serviceProvider.email,
        companyName: serviceProvider.companyName,
        representativeName: serviceProvider.representativeName,
        phone: serviceProvider.phone,
        address: serviceProvider.address,
        county: serviceProvider.county,
        city: serviceProvider.city,
        username: serviceProvider.username,
        verified: serviceProvider.verified,
        workingHours: workingHoursList.map(wh => ({
          id: wh.id,
          serviceProviderId: wh.serviceProviderId,
          dayOfWeek: wh.dayOfWeek.toString(),
          openTime: wh.openTime,
          closeTime: wh.closeTime,
          isClosed: wh.isClosed
        })),
        reviews: reviewsWithClientData
      };

      console.log('Final response includes reviews:', responseData.reviews.length);
      res.json(responseData);

    } catch (error) {
      console.error("Error fetching service profile:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace available');
      res.status(500).json({
        error: "A apărut o eroare la încărcarea profilului.",
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
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

      // Broadcast the new request to all connected services
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'NEW_REQUEST',
            payload: request,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      // Odată ce cererea a fost creată, încercăm să trimitem notificări email
      // Nu le trimitem încă, vom implementa această funcționalitate complet după ce rezolvăm problemele de compilare
      // din interfața de storage și serviciile de notificare
      
      console.log("[Email] New request created, waiting for email notification service implementation");
      
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

  // Add endpoint to get a specific request by ID for client
  app.get("/api/requests/:id", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(401).json({ error: "Not authorized" });
      }

      const requestId = parseInt(req.params.id);
      const request = await storage.getRequest(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Verify the client owns this request
      if (request.clientId !== client.id) {
        return res.status(403).json({ error: "Not authorized to view this request" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error getting client request:", error);
      res.status(500).json({ error: "Failed to get request" });
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

  // Add endpoint to get specific offer by ID
  app.get("/api/service/offers/:id", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view offers." });
      }

      const offerId = parseInt(req.params.id);

      // Obținem toate ofertele pentru acest furnizor de servicii
      const sentOffers = await storage.getSentOffersByServiceProvider(provider.id);

      // Găsim oferta specifică
      const offer = sentOffers.find(o => o.id === offerId);

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Pentru ofertele acceptate, adăugăm detalii despre client
      if (offer.status === "Accepted") {
        const request = await storage.getRequest(offer.requestId);
        if (request) {
          const client = await storage.getClient(request.clientId);
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
      console.error("Error getting offer by ID:", error);
      res.status(500).json({ error: "Failed to get offer" });
    }
  });

  // Endpoint pentru a prelua o cerere specifică după ID
  app.get("/api/service/requests/:id", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view requests." });
      }

      const requestId = parseInt(req.params.id);
      const request = await storage.getRequest(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error getting request by ID:", error);
      res.status(500).json({ error: "Failed to get request" });
    }
  });

  // Add endpoint to get all offers for a specific request
  app.get("/api/service/offers/request/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can view offers." });
      }

      const requestId = parseInt(req.params.requestId);

      // Obținem toate ofertele pentru această cerere
      const offers = await storage.getSentOffersByRequest(requestId);

      // Filtrăm ofertele pentru a include doar cele ale furnizorului de servicii curent
      const providerOffers = offers.filter(offer => offer.serviceProviderId === provider.id);

      if (providerOffers.length === 0) {
        return res.status(404).json({ error: "No offers found for this request" });
      }

      res.json(providerOffers);
    } catch (error) {
      console.error("Error getting offers for request:", error);
      res.status(500).json({ error: "Failed to get offers for request" });
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

      // Check if this service provider has already sent an offer for this request
      const existingOffers = await storage.getSentOffersByServiceProvider(provider.id);
      const hasExistingOffer = existingOffers.some(offer => offer.requestId === req.body.requestId);

      if (hasExistingOffer) {
        return res.status(400).json({
          error: "Cannot create offer",
          message: "Ați trimis deja o ofertă pentru această cerere"
        });
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

      // Send notification through WebSocket with improved error handling
      wss.clients.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'NEW_OFFER',
              payload: offer,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
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
      if (userType === "client"){
        const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
        if (!client) {
          return res.status(404).json({ error: "Client not found" });        }

                //        // Only update if phone number changed
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
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Add phone check endpoint
  app.post("/api/auth/check-phone", async (req, res) => {
    // Temporarily disabled phone number check
    res.status(200).json({ available: true });
  });

  // Update the client offers endpoint
  app.get("/api/client/offers", validateFirebaseToken, async (req, res) =>{
    try {
      console.log("Fetching offers for Firebase UID:", req.firebaseUser!.uid);

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

  // Add new endpoint for getting specific offer details
  app.get("/api/client/offers/details/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log('Fetching offer details for ID:', req.params.id);

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can view offer details." });
      }

      const offerId = parseInt(req.params.id);
      if (isNaN(offerId)) {
        return res.status(400).json({ error: "Invalid offer ID" });
      }

      // Get all offers for this client
      const clientOffers = await storage.getOffersForClient(client.id);
      console.log('Found offers for client:', clientOffers.length);

      // Find the specific offer
      const offer = clientOffers.find(o => o.id === offerId);
      console.log('Found offer:', offer ? 'yes' : 'no');

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Format the available dates
      const formattedOffer = {
        ...offer,
        availableDates: offer.availableDates?.map(date =>
          date instanceof Date ? date.toISOString() : date
        )
      };

      console.log('Sending formatted offer:', formattedOffer);
      res.json(formattedOffer);
    } catch (error) {
      console.error("Error getting offer details:", error);
      res.status(500).json({ error: "Failed to get offer details" });
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
      
      // Obține detaliile cererii pentru notificarea email
      const request = await storage.getRequest(offer.requestId);
      
      // Trimite notificare prin email (considerat critic, se trimite instant)
      try {
        const emailNotificationService = getEmailNotificationService();
        if (request) {
          await emailNotificationService.notifyOfferAccepted(offer.serviceProviderId, updatedOffer, request);
          console.log(`[Email] Sent offer accepted notification to service provider ${offer.serviceProviderId}`);
        } else {
          console.error("[Email] Cannot send notification - request not found");
        }
      } catch (error) {
        console.error("[Email] Error sending email notification for accepted offer:", error);
        // Continuă cu răspunsul, chiar dacă notificarea a eșuat
      }

      // Send notifications through WebSocket with improved error handling
      wss.clients.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            // Notify about offer status change
            client.send(JSON.stringify({
              type: 'OFFER_STATUS_CHANGED',
              payload: { ...updatedOffer, status: "Accepted" },
              timestamp: new Date().toISOString()
            }));

            // Notify about request status change
            client.send(JSON.stringify({
              type: 'REQUEST_STATUS_CHANGED',
              payload: { requestId: offer.requestId, status: "Rezolvat" },
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
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

      // Send notification through WebSocket with improved error handling
      wss.clients.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'OFFER_STATUS_CHANGED',
              payload: { ...updatedOffer, status: "Rejected" },
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      });

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

      // Send notification through WebSocket with improved error handling
      wss.clients.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'OFFER_STATUS_CHANGED',
              payload: { ...updatedOffer, status: "Pending" },
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      });

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
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
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
      const receiver = receiverRole === "client"
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

      // Send real-time notification via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'NEW_MESSAGE',
            payload: enrichedMessage,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      // Trimitem notificare prin email dacă destinatarul este un service provider
      try {
        if (message.receiverRole === "service") {
          // Obținem informații despre expeditor și solicitare pentru email
          const senderName = await getUserDisplayName(message.senderId, message.senderRole, storage);
          const request = await storage.getRequest(requestId);
          
          if (request) {
            try {
              const emailNotificationService = getEmailNotificationService();
              await emailNotificationService.notifyNewMessage(
                message.receiverId, 
                message, 
                request,
                senderName
              );
              console.log(`[Email] Sent message notification to service provider ${message.receiverId}`);
            } catch (error) {
              console.error("[Email] Error sending email notification for new message:", error);
              // Continuăm cu restul fluxului, chiar dacă notificarea prin email eșuează
            }
          }
        }
      } catch (error) {
        console.error("Error preparing message email notification:", error);
      }
      
      // Send push notification via Firebase Cloud Messaging
      try {
        const admin = require('firebase-admin');
        
        // Obținem informații suplimentare despre expeditor și destinatar
        let senderName = await getUserDisplayName(message.senderId, message.senderRole, storage);
        
        // Obținem informații despre solicitare
        const request = await storage.getRequest(requestId);
        
        // Obținem Firebase UID al destinatarului pentru a trimite notificarea
        let receiverFirebaseUid = null;
        
        if (message.receiverRole === 'client') {
          // Destinatarul este client, obținem Firebase UID
          const receiver = await storage.getClient(message.receiverId);
          receiverFirebaseUid = receiver?.firebaseUid;
        } else {
          // Destinatarul este service provider, obținem Firebase UID
          const receiver = await storage.getServiceProvider(message.receiverId);
          receiverFirebaseUid = receiver?.firebaseUid;
        }
        
        // Dacă am găsit UID-ul Firebase al destinatarului, trimitem notificarea
        if (receiverFirebaseUid) {
          // Obținem token-urile FCM asociate cu acest utilizator din Firestore
          const db = admin.firestore();
          const userCollection = message.receiverRole === 'client' ? 'clients' : 'service_providers';
          const userDoc = await db.collection(userCollection).doc(message.receiverId.toString()).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData && userData.fcmTokens && userData.fcmTokens.length > 0) {
              // Pregătim datele notificării
              const notificationTitle = `${senderName} v-a trimis un mesaj`;
              const notificationBody = content.length > 100 ? content.substring(0, 97) + '...' : content;
              
              // URL-ul pentru redirecționare la click
              const deepLink = `/dashboard/${message.receiverRole}/messages/${requestId}`;
              
              // Trimitem notificarea către toate token-urile utilizatorului
              const messagePayload = {
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                },
                data: {
                  requestId: requestId.toString(),
                  messageId: message.id.toString(),
                  senderId: message.senderId.toString(),
                  senderRole: message.senderRole,
                  type: 'new_message',
                  url: deepLink,
                  timestamp: new Date().getTime().toString(),
                  requestTitle: request?.title || 'Cerere service'
                },
                tokens: userData.fcmTokens,
                // Configurare pentru Android
                android: {
                  notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                  }
                },
                // Configurare pentru iOS
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                    }
                  }
                },
                // Configurare pentru web
                webpush: {
                  notification: {
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                  },
                  fcmOptions: {
                    link: deepLink,
                  },
                  headers: {
                    TTL: '86400' // 24 de ore în secunde
                  }
                }
              };
              
              // Trimitem notificarea către toate dispozitivele utilizatorului
              admin.messaging().sendMulticast(messagePayload)
                .then((response) => {
                  console.log(`FCM: Notificare trimisă cu succes. Success count: ${response.successCount}`);
                })
                .catch((error) => {
                  console.error('FCM: Eroare la trimiterea notificării:', error);
                });
            } else {
              console.log(`Nu s-au găsit token-uri FCM pentru utilizatorul ${message.receiverId} (${message.receiverRole})`);
            }
          } else {
            console.log(`Nu s-a găsit documentul Firestore pentru utilizatorul ${message.receiverId} (${message.receiverRole})`);
          }
        } else {
          console.log(`Nu s-a găsit Firebase UID pentru utilizatorul ${message.receiverId} (${message.receiverRole})`);
        }
      } catch (fcmError) {
        console.error('Eroare la trimiterea notificării FCM:', fcmError);
        // Nu eșuăm întregul request dacă notificarea FCM eșuează
      }

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

  // Add endpoint to get unread conversations count
  app.get("/api/messages/unread/conversations", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);

      if (!client && !serviceProvider) {
        return res.status(401).json({ error: "User not found" });
      }

      const userId = client ? client.id : serviceProvider!.id;
      const userRole = client ? "client" : "service";

      // Get all messages for this user
      const messages = await storage.getUserMessages(userId, userRole, null);

      // Group messages by requestId to count distinct conversations with unread messages
      const conversationsWithUnreadMessages = messages.reduce((acc: Set<string>, message: any) => {
        // If this message is unread and was sent to the current user
        if (message.receiverId === userId && message.receiverRole === userRole && !message.isRead) {
          acc.add(message.requestId);
        }
        return acc;
      }, new Set<string>());

      const conversationsCount = conversationsWithUnreadMessages.size;

      res.json({ conversationsCount });
    } catch (error: any) {
      console.error("Error fetching unread conversations count:", error);
      res.status(500).json({ error: "Failed to fetch unread conversations count" });
    }
  });

  // Add this endpoint after the existing /api/messages GET endpoint
  app.post("/api/service/messages/send", validateFirebaseToken, async (req, res) => {
    try {
      const { content, receiverId, requestId, offerId } = req.body;

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
        content,
        offerId: offerId || null
      });

      // Add names to the response
      const enrichedMessage = {
        ...message,
        senderName: sender.companyName,
        receiverName: receiver.name
      };

      // Send notification through WebSocket with improved error handling
      wss.clients.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'NEW_MESSAGE',
              payload: enrichedMessage,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      });
      
      // Send push notification via Firebase Cloud Messaging
      try {
        const admin = require('firebase-admin');
        
        // Get receiver Firebase UID
        const receiverFirebaseUid = receiver.firebaseUid;
        
        if (receiverFirebaseUid) {
          // Obținem token-urile FCM asociate cu acest utilizator din Firestore
          const db = admin.firestore();
          const userCollection = 'clients'; // Receiving role is client
          const userDoc = await db.collection(userCollection).doc(receiver.id.toString()).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData && userData.fcmTokens && userData.fcmTokens.length > 0) {
              // Prepare notification data
              const notificationTitle = `${sender.companyName} v-a trimis un mesaj`;
              const notificationBody = content.length > 100 ? content.substring(0, 97) + '...' : content;
              
              // Deep link URL
              const deepLink = `/dashboard/client/messages/${requestId}`;
              
              // Send notification to all user devices
              const messagePayload = {
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                },
                data: {
                  requestId: requestId.toString(),
                  messageId: message.id.toString(),
                  senderId: sender.id.toString(),
                  senderRole: 'service',
                  type: 'new_message',
                  url: deepLink,
                  timestamp: new Date().getTime().toString(),
                  requestTitle: request.title || 'Cerere service'
                },
                tokens: userData.fcmTokens,
                // Android configuration
                android: {
                  notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                  }
                },
                // iOS configuration
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                    }
                  }
                },
                // Web configuration
                webpush: {
                  notification: {
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                  },
                  fcmOptions: {
                    link: deepLink,
                  },
                  headers: {
                    TTL: '86400' // 24 hours in seconds
                  }
                }
              };
              
              // Send notification to all user devices
              admin.messaging().sendMulticast(messagePayload)
                .then((response) => {
                  console.log(`FCM: Notification sent successfully. Success count: ${response.successCount}`);
                })
                .catch((error) => {
                  console.error('FCM: Error sending notification:', error);
                });
            } else {
              console.log(`No FCM tokens found for client ${receiver.id}`);
            }
          } else {
            console.log(`No Firestore document found for client ${receiver.id}`);
          }
        } else {
          console.log(`No Firebase UID found for client ${receiver.id}`);
        }
      } catch (fcmError) {
        console.error('Error sending FCM notification:', fcmError);
        // Don't fail the entire request if FCM notification fails
      }

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
  app.get("/api/service/conversations", validateFirebaseToken, async (req, res) => {    try {
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
        } else if (new Date(message.createdAt) > new Date(acc[message.requestId].createdAt)) {
          // Keep the most recent message for this request
          acc[message.requestId] = message;
        }
        return acc;
      }, {});

      // Get client information and request details for each conversation
      const conversations = await Promise.all(
        Object.values(conversationsByRequest).map(async (message: any) => {
          const request = await storage.getRequest(message.requestId);
          if (!request) return null;

          const client = await storage.getClient(request.clientId);
          if (!client) return null;

          // Get unread count
          const unreadMessages = messages.filter(m =>
            m.requestId === message.requestId &&
            m.receiverId === serviceProvider.id &&
            m.receiverRole === "service" &&
            !m.isRead
          );

          return {
            userId: client.id,
            userName: client.name,
            requestId: message.requestId,
            requestTitle: request.title,
            lastMessage: message.content,
            lastMessageDate: message.createdAt,
            unreadCount: unreadMessages.length
          };
        })
      );

      // Filter out null values and sort by date (most recent first)
      const validConversations = conversations
        .filter(conv => conv !== null)
        .sort((a: any, b: any) =>
          new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
        );

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


  // Working Hours endpoints
  app.get("/api/service/:serviceId/working-hours", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Invalid service ID" });
      }

      // Get custom hours if they exist
      const workingHours = await storage.getWorkingHours(serviceId);
      res.json(workingHours);
    } catch (error) {
      console.error("Error getting working hours:", error);
      res.status(500).json({ error: "Failed to get working hours" });
    }
  });

  app.put("/api/service/working-hours/:dayOfWeek", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { openTime, closeTime, isClosed } = req.body;
      const dayOfWeek = parseInt(req.params.dayOfWeek);

      // Save working hours
      const updatedHours = await storage.updateWorkingHours(provider.id, {
        dayOfWeek,
        openTime,
        closeTime,
        isClosed
      });

      res.json(updatedHours);
    } catch (error) {
      console.error("Error updating working hours:", error);
      res.status(500).json({ error: "Failed to update working hours" });
    }
  });

  app.delete("/api/service/working-hours/:id", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can manage working hours." });
      }

      const hourId = parseInt(req.params.id);
      if (isNaN(hourId)) {
        return res.status(400).json({ error: "Invalid working hour ID" });
      }

      // Get current working hour to verify ownership
      const workingHours = await storage.getServiceProviderWorkingHours(provider.id);
      const hourExists = workingHours.some(h => h.id === hourId);

      if (!hourExists) {
        return res.status(404).json({ error: "Working hour not found or not owned by this service provider" });
      }

      await storage.deleteWorkingHour(hourId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting working hour:", error);
      res.status(500).json({ error: "Failed to delete working hour" });
    }
  });

  // Add endpoint to get client conversations
  app.get("/api/client/conversations", validateFirebaseToken, async(req, res) => {    try {
      const client =await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if(!client) {
        return res.status(401).json({ error: "Client not found" });
      }

      //      // Getall messagesfor this client
      const messages = await storage.getUserMessages(client.id, "client", null);

      // Group messages by requestId
      const conversationsByRequest = messages.reduce((acc, message) => {        if (!acc[message.requestId]) {
          acc[message.requestId] = message;
        } else if (new Date(message.createdAt) > new Date(acc[message.requestId].createdAt)) {
          // Keep the most recent message for this request
          acc[message.requestId] = message;
        }
        return acc;
      }, {});

      // Get service provider information and request details for each conversation
      const conversations = await Promise.all(
        Object.values(conversationsByRequest).map(async (message) => {
          const request = await storage.getRequest(message.requestId);
          if (!request) return null;

          // Find the service provider who sent or received messages
          const serviceProviderId = message.senderRole === "service" ? message.senderId : message.receiverId;
          const serviceProvider = await storage.getServiceProvider(serviceProviderId);
          if (!serviceProvider) return null;

          // Get unread count
          const unreadMessages = messages.filter(m =>
            m.requestId === message.requestId &&
            m.receiverId === client.id &&
            m.receiverRole === "client" &&
            !m.isRead
          );

          return {
            userId: serviceProvider.id,
            userName: serviceProvider.companyName,
            serviceProviderUsername: serviceProvider.username,
            requestId: message.requestId,
            requestTitle: request.title,
            lastMessage: message.content,
            lastMessageDate: message.createdAt,
            unreadCount: unreadMessages.length,
            offerId: message.offerId
          };
        })
      );

      // Filter out null values and sort by date (most recent first)
      const validConversations = conversations
        .filter(conv => conv !== null)
        .sort((a, b) =>
          new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
        );

      res.json(validConversations);
    } catch (error) {
      console.error("Error fetching client conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Client message endpoints
  app.get("/api/client/messages/:requestId", validateFirebaseToken, async (req, res) => {
    try {
      console.log('GET /api/client/messages/:requestId - Start', {
        firebaseUid: req.firebaseUser!.uid,
        requestId: req.params.requestId
      });

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        console.log('Client not found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(403).json({ error: "Access denied. Only clients can view messages." });
      }

      const requestId = parseInt(req.params.requestId);
      if (isNaN(requestId)) {
        console.log('Invalid request ID:', req.params.requestId);
        return res.status(400).json({ error: "Invalid request ID" });
      }

      // Verify the client owns this request
      const request = await storage.getRequest(requestId);
      console.log('Found request:', request);

      if (!request || request.clientId !== client.id) {
        console.log('Request not found or unauthorized:', { requestId, clientId: client.id });
        return res.status(403).json({ error: "Not authorized to view these messages" });
      }

      // Get messages with enriched sender information
      const messages = await storage.getMessagesByRequest(requestId);
      console.log('Retrieved messages count:', messages.length);

      // Set proper content type and send response
      res.setHeader('Content-Type', 'application/json');
      return res.json(messages);
    } catch (error) {
      console.error('Error in GET /api/client/messages/:requestId:', error);
      return res.status(500).json({
        error: "Failed to fetch messages",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.post("/api/client/messages/send", validateFirebaseToken, async (req, res) => {
    try {
      console.log('POST /api/client/messages/send - Start', req.body);

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        console.log('Client not found for Firebase UID:', req.firebaseUser!.uid);
        return res.status(403).json({ error: "Access denied. Only clients can send messages." });
      }

      const { content, receiverId, receiverRole, requestId, offerId } = req.body;

      // Validate required fields
      if (!content || !receiverId || !requestId) {
        console.log('Missing required fields:', { content, receiverId, requestId });
        return res.status(400).json({
          error: "Invalid request data",
          message: "Content, receiverId and requestId are required"
        });
      }

      // Verify the client owns this request
      const request = await storage.getRequest(requestId);
      console.log('Found request:', request);

      if (!request || request.clientId !== client.id) {
        console.log('Request not found or unauthorized:', { requestId, clientId: client.id });
        return res.status(403).json({ error: "Not authorized to send messages for this request" });
      }

      // Create message
      const message = await storage.createMessage({
        senderId: client.id,
        senderRole: 'client',
        receiverId,
        receiverRole: receiverRole || 'service',
        content,
        requestId,
        offerId: offerId || null
      });

      // Enrich message with sender name for response
      const enrichedMessage = {
        ...message,
        senderName: client.name
      };

      // Send real-time notification through WebSocket
      const messageNotification = {
        type: 'NEW_MESSAGE',
        payload: enrichedMessage,
        timestamp: new Date().toISOString()
      };

      console.log('Broadcasting message notification:', messageNotification);

      wss.clients.forEach((wsClient) => {
        if (wsClient.readyState === WebSocket.OPEN) {
          try {
            wsClient.send(JSON.stringify(messageNotification));
          } catch (err) {
            console.error('WebSocket send error:', err);
          }
        }
      });
      
      // Send push notification via Firebase Cloud Messaging
      try {
        const admin = require('firebase-admin');
        
        // Obținem informații despre destinatar
        const receiver = await storage.getServiceProvider(receiverId);
        
        if (receiver && receiver.firebaseUid) {
          // Obținem token-urile FCM asociate cu service provider-ul
          const db = admin.firestore();
          const userCollection = 'service_providers';
          const userDoc = await db.collection(userCollection).doc(receiverId.toString()).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData && userData.fcmTokens && userData.fcmTokens.length > 0) {
              // Pregătim datele notificării
              const notificationTitle = `${client.name} v-a trimis un mesaj`;
              const notificationBody = content.length > 100 ? content.substring(0, 97) + '...' : content;
              
              // URL-ul pentru redirecționare la click
              const deepLink = `/dashboard/service/messages/${requestId}`;
              
              // Pregătim payload-ul notificării
              const messagePayload = {
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                },
                data: {
                  requestId: requestId.toString(),
                  messageId: message.id.toString(),
                  senderId: client.id.toString(),
                  senderRole: 'client',
                  type: 'new_message',
                  url: deepLink,
                  timestamp: new Date().getTime().toString(),
                  requestTitle: request.title || 'Cerere service'
                },
                tokens: userData.fcmTokens,
                // Configurare pentru Android
                android: {
                  notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                  }
                },
                // Configurare pentru iOS
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                    }
                  }
                },
                // Configurare pentru web
                webpush: {
                  notification: {
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                  },
                  fcmOptions: {
                    link: deepLink,
                  },
                  headers: {
                    TTL: '86400' // 24 de ore în secunde
                  }
                }
              };
              
              // Trimitem notificarea către toate dispozitivele utilizatorului
              admin.messaging().sendMulticast(messagePayload)
                .then((response) => {
                  console.log(`FCM: Notificare trimisă cu succes. Success count: ${response.successCount}`);
                })
                .catch((error) => {
                  console.error('FCM: Eroare la trimiterea notificării:', error);
                });
            } else {
              console.log(`Nu s-au găsit token-uri FCM pentru service provider-ul ${receiverId}`);
            }
          } else {
            console.log(`Nu s-a găsit documentul Firestore pentru service provider-ul ${receiverId}`);
          }
        } else {
          console.log(`Nu s-a găsit Firebase UID pentru service provider-ul ${receiverId}`);
        }
      } catch (fcmError) {
        console.error('Eroare la trimiterea notificării FCM:', fcmError);
        // Nu eșuăm întregul request dacă notificarea FCM eșuează
      }

      // Set proper content type and send response
      res.setHeader('Content-Type', 'application/json');
      return res.status(201).json(enrichedMessage);
    } catch (error) {
      console.error('Error in POST /api/client/messages/send:', error);
      return res.status(500).json({
        error: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Add this endpoint after the other message-related endpoints
  app.post("/api/service/conversations/:requestId/mark-read", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can mark conversations as read." });
      }

      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;

      if (!requestId || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      await storage.markConversationAsRead(requestId, provider.id);

      res.status(200).json({ message: "Conversation marked as read successfully" });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ error: "Failed to mark conversation as read" });
    }
  });

  // Add similar endpoint for client
  app.post("/api/client/conversations/:requestId/mark-read", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can mark conversations as read." });
      }

      const requestId = parseInt(req.params.requestId);
      const { userId } = req.body;

      if (!requestId || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      await storage.markConversationAsRead(requestId, client.id);

      res.status(200).json({ message: "Conversation marked as read successfully" });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ error: "Failed to mark conversation as read" });
    }
  });

  // Update the review endpoint to handle direct service reviews
  app.post("/api/reviews", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Attempting to create review with data:", req.body);

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can submit reviews." });
      }

      const { rating, comment, serviceProviderId, offerId, requestId } = req.body;

      // Verify serviceProvider exists
      const serviceProvider = await storage.getServiceProvider(serviceProviderId);
      if (!serviceProvider) {
        return res.status(400).json({ error: "Service provider not found" });
      }

      // Verificăm dacă clientul a interacționat cu acest service provider
      // prin verificarea existenței unei oferte acceptate
      let acceptedOffer = null;
      const offers = await storage.getOffersForClient(client.id);

      if (offerId) {
        acceptedOffer = offers.find(offer => 
          offer.id === offerId && 
          offer.serviceProviderId === serviceProviderId && 
          offer.status === "Accepted"
        );

        if (!acceptedOffer) {
          return res.status(403).json({ 
            error: "Cannot create review", 
            message: "Trebuie să fi acceptat o ofertă de la acest service pentru a lăsa o recenzie." 
          });
        }
      } else {
        // Dacă nu este specificat un offerId, căutăm prima ofertă acceptată
        acceptedOffer = offers.find(offer => 
          offer.serviceProviderId === serviceProviderId && 
          offer.status === "Accepted"
        );

        if (!acceptedOffer) {
          return res.status(403).json({ 
            error: "Cannot create review", 
            message: "Trebuie să fi acceptat o ofertă de la acest service pentru a lăsa o recenzie." 
          });
        }
      }

      console.log("Creating review for service provider:", serviceProviderId, "by client:", client.id);

      // Determinăm data finalizării ofertei (completedAt sau data curentă)
      const offerCompletedAt = acceptedOffer.completedAt || new Date();

      // Validate review data
      const reviewData = insertReviewSchema.parse({
        serviceProviderId,
        clientId: client.id,
        rating,
        comment,
        requestId: requestId || acceptedOffer.requestId || null,
        offerId: offerId || acceptedOffer.id || null,
        offerCompletedAt // Adăugăm data finalizării
      });

      // Create the review
      const review = await storage.createReview(reviewData);
      
      // Trimite notificare email despre recenzia nouă (considerat non-critic, poate fi grupat)
      try {
        const emailNotificationService = getEmailNotificationService();
        const clientName = client.name;
        
        await emailNotificationService.notifyNewReview(serviceProviderId, review, clientName);
        console.log(`[Email] Sent review notification to service provider ${serviceProviderId}`);
      } catch (error) {
        console.error("[Email] Error sending email notification for new review:", error);
        // Continuăm cu răspunsul, chiar dacă notificarea prin email eșuează
      }

      console.log("Review created successfully:", review);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          error: "Failed to create review",
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } else {
        res.status(500).json({ error: "Failed to create review" });
      }
    }
  });

  // Endpoint pentru actualizarea recenziilor
  // Endpoint pentru actualizarea recenziilor
  app.put("/api/reviews/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Attempting to update review with data:", req.body);

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can update reviews." });
      }

      const reviewId = parseInt(req.params.id);
      if (isNaN(reviewId)) {
        return res.status(400).json({ error: "Invalid review ID" });
      }

      // Verifică dacă recenzia există 
      const existingReview = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

      if (!existingReview || existingReview.length === 0) {
        return res.status(404).json({ error: "Review not found" });
      }

      // Verifică separat dacă clientul este proprietarul
      if (existingReview[0].clientId !== client.id) {
        return res.status(403).json({ error: "This review does not belong to you" });
      }

      const { rating, comment } = req.body;

      // Validează datele recenziei
      if (!rating || rating < 1 || rating > 5 || !comment || comment.length < 20) {
        return res.status(400).json({ 
          error: "Invalid review data", 
          message: "Rating must be between 1-5 and comment must be at least 20 characters" 
        });
      }

      // Actualizează recenzia
      const updatedReview = await storage.updateReview(reviewId, {
        rating,
        comment,
        lastModified: new Date()
      });

      console.log("Review updated successfully:", updatedReview);
      res.status(200).json(updatedReview);
    } catch (error) {
      console.error("Error updating review:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          error: "Failed to update review",
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } else {
        res.status(500).json({ error: "Failed to update review" });
      }
    }
  });

  app.put("/api/reviews/:id", validateFirebaseToken, async (req, res) => {
    try {
      console.log("Attempting to update review with data:", req.body);

      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      if (!client) {
        return res.status(403).json({ error: "Access denied. Only clients can update reviews." });
      }

      const reviewId = parseInt(req.params.id);
      if (isNaN(reviewId)) {
        return res.status(400).json({ error: "Invalid review ID" });
      }

      // Verifică dacă recenzia există 
      const existingReview = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

      if (!existingReview || existingReview.length === 0) {
        return res.status(404).json({ error: "Review not found" });
      }

      // Verifică dacă clientul este proprietarul
      if (existingReview[0].clientId !== client.id) {
        return res.status(403).json({ error: "This review does not belong to you" });
      }

      const { rating, comment } = req.body;

      // Validează datele recenziei
      if (!rating || rating < 1 || rating > 5 || !comment || comment.length < 20) {
        return res.status(400).json({ 
          error: "Invalid review data", 
          message: "Rating must be between 1-5 and comment must be at least 20 characters" 
        });
      }

      // Actualizează recenzia
      const updatedReview = await storage.updateReview(reviewId, {
        rating,
        comment,
        lastModified: new Date()
      });

      console.log("Review updated successfully:", updatedReview);
      res.status(200).json(updatedReview);
    } catch (error) {
      console.error("Error updating review:", error);
      if (error instanceof Error) {
        res.status(500).json({ 
          error: "Failed to update review",
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } else {
        res.status(500).json({ error: "Failed to update review" });
      }
    }
  });
  
  // Working Hours endpoints
  app.get("/api/service/:serviceId/working-hours", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Invalid service ID" });
      }

      // Get custom hours if they exist
      const workingHours = await storage.getWorkingHours(serviceId);
      res.json(workingHours);
    } catch (error) {
      console.error("Error getting working hours:", error);
      res.status(500).json({ error: "Failed to get working hours" });
    }
  });

  app.put("/api/service/working-hours/:dayOfWeek", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { openTime, closeTime, isClosed } = req.body;
      const dayOfWeek = parseInt(req.params.dayOfWeek);

      // Save working hours
      const updatedHours = await storage.updateWorkingHours(provider.id, {
        dayOfWeek,
        openTime,
        closeTime,
        isClosed
      });

      res.json(updatedHours);
    } catch (error) {
      console.error("Error updating working hours:", error);
      res.status(500).json({ error: "Failed to update working hours" });
    }
  });

  app.delete("/api/service/working-hours/:id", validateFirebaseToken, async (req, res) => {
    try {
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(403).json({ error: "Access denied. Only service providers can manage working hours." });
      }

      const hourId = parseInt(req.params.id);
      if (isNaN(hourId)) {
        return res.status(400).json({ error: "Invalid working hour ID" });
      }

      // Get current working hour to verify ownership
      const workingHours = await storage.getServiceProviderWorkingHours(provider.id);
      const hourExists = workingHours.some(h => h.id === hourId);

      if (!hourExists) {
        return res.status(404).json({ error: "Working hour not found or not owned by this service provider" });
      }

      await storage.deleteWorkingHour(hourId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting working hour:", error);
      res.status(500).json({ error: "Failed to delete working hour" });
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


  const httpServer = createServer(app);

  // Initialize WebSocket server with the correct path to match client
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/api/ws'  // Match the client's WebSocket path
  });

  // WebSocket connection handler with improved error handling
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

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
                  payload: data.payload,
                  timestamp: new Date().toISOString()
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
      console.log('Client disconnected');
    });
  });

  // Am eliminat ruta duplicată, folosind cea definită la linia 253

  // Endpoint-ul duplicat a fost eliminat, folosim routerul de la linia 292

  app.put("/api/service/notification-preferences", validateFirebaseToken, async (req, res) => {
    try {
      const { userType } = req.session;
      
      if (!userType || userType !== "service") {
        return res.status(403).json({ error: "Unauthorized. Only service providers can update notification preferences." });
      }
      
      const provider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!provider) {
        return res.status(404).json({ error: "Service provider not found" });
      }
      
      // Check if preferences exist
      const existingPreferences = await storage.getNotificationPreferences(provider.id);
      if (!existingPreferences) {
        // If preferences don't exist, create them
        const newPreferences = await storage.createNotificationPreferences({
          serviceProviderId: provider.id,
          ...req.body
        });
        
        return res.status(201).json(newPreferences);
      }
      
      // Update existing preferences
      const updatedPreferences = await storage.updateNotificationPreferences(existingPreferences.id, req.body);
      
      return res.status(200).json(updatedPreferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      return res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });
  // Adaugă acest endpoint în fișierul routes.ts, în funcția registerRoutes

  // Endpoint pentru polling mesaje când WebSocket nu funcționează
  app.get("/api/messages/poll", validateFirebaseToken, async (req, res) => {
    try {
      // Determină utilizatorul
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);

      if (!client && !serviceProvider) {
        return res.status(401).json({ error: "User not found" });
      }

      const userId = client ? client.id : serviceProvider!.id;
      const userRole = client ? "client" : "service";

      // Obține timestamp-ul de la care să verificăm (dacă este furnizat)
      let since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 60 * 1000); // Ultimul minut implicit

      // Obține mesajele noi
      const newMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.receiverRole, userRole),
            eq(messagesTable.isRead, false),
            sql`${messagesTable.createdAt} > ${since}`
          )
        )
        .orderBy(messagesTable.createdAt);

      // Transformă mesajele în format compatibil cu ce ar trimite WebSocket
      const wsCompatibleMessages = await Promise.all(
        newMessages.map(async (message) => {
          // Obține numele expeditorului
          let senderName = '';
          try {
            if (message.senderRole === 'client') {
              const sender = await storage.getClient(message.senderId);
              senderName = sender?.name || 'Unknown Client';
            } else {
              const sender = await storage.getServiceProvider(message.senderId);
              senderName = sender?.companyName || 'Unknown Service Provider';
            }
          } catch (error) {
            console.error('Error getting sender info:', error);
            senderName = message.senderRole === 'client' ? 'Unknown Client' : 'Unknown Service Provider';
          }

          return {
            type: 'NEW_MESSAGE',
            payload: {
              ...message,
              senderName
            },
            timestamp: message.createdAt.toISOString()
          };
        })
      );

      // Trimite răspunsul
      res.json(wsCompatibleMessages);
    } catch (error) {
      console.error("Error polling messages:", error);
      res.status(500).json({ error: "Failed to poll messages" });
    }
  });

  // Endpoint pentru a verifica manual noi mesaje - util pentru testing
  app.get("/api/messages/unread/check", validateFirebaseToken, async (req, res) => {
    try {
      const client = await storage.getClientByFirebaseUid(req.firebaseUser!.uid);
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);

      if (!client && !serviceProvider) {
        return res.status(401).json({ error: "User not found" });
      }

      const userId = client ? client.id : serviceProvider!.id;
      const userRole = client ? "client" : "service";

      // Obține mesaje necitite din ultimele 5 minute
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const newMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.receiverRole, userRole),
            eq(messagesTable.isRead, false),
            sql`${messagesTable.createdAt} > ${fiveMinutesAgo}`
          )
        )
        .orderBy(messagesTable.createdAt);

      res.json({ 
        unreadCount: newMessages.length,
        newMessages
      });
    } catch (error) {
      console.error("Error checking unread messages:", error);
      res.status(500).json({ error: "Failed to check unread messages" });
    }
  });

  // API pentru verificarea cererilor noi pentru furnizorul de servicii
  app.get('/api/service/new-requests', validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Obține cererile din zona furnizorului de servicii
      const requestsInArea = await storage.getRequestsByLocation(serviceProvider.county, serviceProvider.city);
      
      // Obține cererile deja vizualizate de furnizorul de servicii
      const viewedRequests = await storage.getViewedRequestsByServiceProvider(serviceProvider.id);
      
      // Filtrăm doar cererile nevizualizate
      const newRequests = requestsInArea.filter(request => {
        return !viewedRequests.some(viewed => viewed.requestId === request.id);
      });
      
      res.json({ 
        count: newRequests.length,
        newRequests
      });
    } catch (error) {
      console.error("Error checking new requests:", error);
      res.status(500).json({ error: "Failed to check new requests" });
    }
  });

  // API pentru verificarea ofertelor acceptate pentru furnizorul de servicii
  app.get('/api/service/accepted-offers', validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Obține ofertele trimise de furnizorul de servicii
      const sentOffers = await storage.getSentOffersByServiceProvider(serviceProvider.id);
      
      // Filtrăm ofertele acceptate
      const acceptedOffers = sentOffers.filter(offer => offer.status === 'Accepted');
      
      // Obținem ofertele acceptate care au fost deja vizualizate
      const viewedAcceptedOffers = await storage.getViewedAcceptedOffersByServiceProvider(serviceProvider.id);
      
      // Filtrăm ofertele acceptate nevizualizate
      const newAcceptedOffers = acceptedOffers.filter(offer => {
        return !viewedAcceptedOffers.some(viewed => viewed.offerId === offer.id);
      });
      
      res.json({ 
        count: newAcceptedOffers.length,
        newAcceptedOffers
      });
    } catch (error) {
      console.error("Error checking accepted offers:", error);
      res.status(500).json({ error: "Failed to check accepted offers" });
    }
  });

  // API pentru verificarea recenziilor noi pentru furnizorul de servicii
  app.get('/api/service/new-reviews', validateFirebaseToken, async (req, res) => {
    try {
      const serviceProvider = await storage.getServiceProviderByFirebaseUid(req.firebaseUser!.uid);
      if (!serviceProvider) {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      // Verificăm recenziile noi - implementăm doar răspunsul de bază
      // În viitor, aici se va adăuga logica pentru a verifica recenziile necitite
      
      res.json({ 
        count: 0,
        newReviews: []
      });
    } catch (error) {
      console.error("Error checking new reviews:", error);
      res.status(500).json({ error: "Failed to check new reviews" });
    }
  });

  // Adăugăm rutele pentru notificări FCM
  app.post('/api/notifications/register-token', validateFirebaseToken, async (req, res) => {
    // Delegăm cererea către handlerul din routes/notifications.ts
    await registerToken(req, res);
  });

  app.post('/api/notifications/send', validateFirebaseToken, async (req, res) => {
    // Delegăm cererea către handlerul din routes/notifications.ts
    await sendNotification(req, res);
  });

  app.post('/api/notifications/unregister-token', validateFirebaseToken, async (req, res) => {
    // Delegăm cererea către handlerul din routes/notifications.ts
    await unregisterToken(req, res);
  });

  // Return the server at the end
  return httpServer;
}