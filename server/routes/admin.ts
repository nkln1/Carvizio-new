import { Express, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { IStorage } from '../storage';
import { adminLoginSchema } from '@shared/schema';
import { z } from 'zod';

// Middleware pentru verificarea dacă utilizatorul este admin folosind token de sesiune
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificăm dacă există o sesiune admin validă
    if (!req.session || !req.session.adminId) {
      return res.status(401).json({ message: 'Autentificare necesară' });
    }
    
    // Verificăm dacă admin-ul există și este activ în baza de date
    const adminUser = await req.storage.getAdminById(req.session.adminId);
    
    if (!adminUser || !adminUser.isActive) {
      return res.status(403).json({ message: 'Nu aveți drepturi de administrator sau contul este dezactivat' });
    }
    
    // Admin validat, permitem accesul
    req.admin = adminUser;
    next();
  } catch (error) {
    console.error('Eroare la verificarea drepturilor de admin:', error);
    return res.status(500).json({ message: 'Eroare internă a serverului' });
  }
};

// Adăugăm tipurile necesare pentru Request
declare global {
  namespace Express {
    interface Request {
      admin?: any; // Admin sessions
      storage: IStorage; // Storage instance
      session: any; // Session data
    }
  }
}

export function registerAdminRoutes(app: Express, storage: IStorage, validateFirebaseToken: any): void {
  // Rută pentru login admin
  app.post('/api/admin/login', async (req, res) => {
    try {
      // Validăm datele de login folosind schema Zod
      const result = adminLoginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Date de autentificare invalide', 
          errors: result.error.format() 
        });
      }
      
      const { username, password } = result.data;
      
      // Verificăm credențialele
      const admin = await storage.verifyAdminCredentials(username, password);
      
      if (!admin) {
        return res.status(401).json({ message: 'Nume de utilizator sau parolă incorecte' });
      }
      
      // Creăm sesiunea pentru admin
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      
      // Returnăm datele admin fără parolă
      const { password: _, ...adminData } = admin;
      return res.json({ 
        message: 'Autentificare reușită', 
        admin: adminData 
      });
    } catch (error) {
      console.error('Eroare la autentificarea adminului:', error);
      return res.status(500).json({ message: 'Eroare internă la autentificare' });
    }
  });
  
  // Rută pentru logout admin
  app.post('/api/admin/logout', async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Eroare la deconectarea adminului:', err);
        return res.status(500).json({ message: 'Eroare la deconectare' });
      }
      
      res.clearCookie('connect.sid'); // Șterge cookie-ul de sesiune
      return res.json({ message: 'Deconectare reușită' });
    });
  });
  
  // Rută pentru verificarea sesiunii de admin
  app.get('/api/admin/check-session', async (req, res) => {
    try {
      if (!req.session || !req.session.adminId) {
        return res.status(401).json({ authenticated: false });
      }
      
      const admin = await storage.getAdminById(req.session.adminId);
      
      if (!admin || !admin.isActive) {
        return res.status(401).json({ authenticated: false });
      }
      
      // Returnăm info admin fără parolă
      const { password: _, ...adminData } = admin;
      return res.json({ 
        authenticated: true, 
        admin: adminData 
      });
    } catch (error) {
      console.error('Eroare la verificarea sesiunii admin:', error);
      return res.status(500).json({ message: 'Eroare internă la verificarea sesiunii' });
    }
  });
  
  // Obține lista tuturor clienților (doar pentru admin)
  app.get('/api/admin/clients', isAdmin, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Eroare la obținerea listei de clienți:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de clienți' });
    }
  });
  
  // Obține lista tuturor furnizorilor de servicii (doar pentru admin)
  app.get('/api/admin/service-providers', isAdmin, async (req, res) => {
    try {
      const serviceProviders = await storage.getAllServiceProviders();
      res.json(serviceProviders);
    } catch (error) {
      console.error('Eroare la obținerea listei de furnizori de servicii:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de furnizori de servicii' });
    }
  });
  
  // Obține lista tuturor cererilor (doar pentru admin)
  app.get('/api/admin/requests', isAdmin, async (req, res) => {
    try {
      const requests = await storage.getAllRequests();
      
      // Adăugăm numele clientului pentru fiecare cerere
      const requestsWithClientNames = await Promise.all(
        requests.map(async (request) => {
          const client = await storage.getClient(request.clientId);
          return {
            ...request,
            clientName: client ? client.name : 'Client necunoscut'
          };
        })
      );
      
      res.json(requestsWithClientNames);
    } catch (error) {
      console.error('Eroare la obținerea listei de cereri:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de cereri' });
    }
  });
  
  // Obține lista tuturor recenziilor (doar pentru admin)
  app.get('/api/admin/reviews', isAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      
      // Adăugăm numele clientului și furnizorului pentru fiecare recenzie
      const reviewsWithNames = await Promise.all(
        reviews.map(async (review) => {
          const client = await storage.getClient(review.clientId);
          const serviceProvider = await storage.getServiceProvider(review.serviceProviderId);
          
          return {
            ...review,
            clientName: client ? client.name : 'Client necunoscut',
            serviceProviderName: serviceProvider ? serviceProvider.companyName : 'Furnizor necunoscut'
          };
        })
      );
      
      res.json(reviewsWithNames);
    } catch (error) {
      console.error('Eroare la obținerea listei de recenzii:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de recenzii' });
    }
  });
  
  // Actualizare stare de verificare a unui client (doar pentru admin)
  app.post('/api/admin/client/:id/verify', isAdmin, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const { verified } = req.body;
      
      await storage.updateClientVerificationStatus(clientId, verified);
      
      res.json({ message: 'Statusul de verificare a fost actualizat cu succes' });
    } catch (error) {
      console.error('Eroare la actualizarea statusului de verificare a clientului:', error);
      res.status(500).json({ message: 'Eroare la actualizarea statusului de verificare' });
    }
  });
  
  // Actualizare stare de verificare a unui furnizor de servicii (doar pentru admin)
  app.post('/api/admin/service-provider/:id/verify', isAdmin, async (req, res) => {
    try {
      const serviceProviderId = parseInt(req.params.id, 10);
      const { verified } = req.body;
      
      await storage.updateServiceProviderVerificationStatus(serviceProviderId, verified);
      
      res.json({ message: 'Statusul de verificare a fost actualizat cu succes' });
    } catch (error) {
      console.error('Eroare la actualizarea statusului de verificare a furnizorului de servicii:', error);
      res.status(500).json({ message: 'Eroare la actualizarea statusului de verificare' });
    }
  });
  
  // Gestionează raportările de recenzii (doar pentru admin)
  app.post('/api/admin/review/:id/dismiss-report', isAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id, 10);
      await storage.dismissReviewReport(reviewId);
      res.json({ message: 'Raportul a fost respins cu succes' });
    } catch (error) {
      console.error('Eroare la gestionarea raportului de recenzie:', error);
      res.status(500).json({ message: 'Eroare la gestionarea raportului de recenzie' });
    }
  });
  
  // Rută pentru administrarea conturilor de admin (crearea unui admin nou)
  app.post('/api/admin/admins', isAdmin, async (req, res) => {
    try {
      const result = insertAdminSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Date invalide pentru crearea administratorului', 
          errors: result.error.format() 
        });
      }
      
      // Verificăm dacă există deja un admin cu același username sau email
      const existingAdmin = await storage.getAdminByEmail(result.data.email);
      if (existingAdmin) {
        return res.status(400).json({ message: 'Există deja un administrator cu acest email' });
      }
      
      // Creăm noul admin
      const newAdmin = await storage.createAdmin(result.data);
      
      // Returnăm datele admin fără parolă
      const { password: _, ...adminData } = newAdmin;
      return res.status(201).json({ 
        message: 'Administrator creat cu succes', 
        admin: adminData 
      });
    } catch (error) {
      console.error('Eroare la crearea administratorului:', error);
      return res.status(500).json({ message: 'Eroare internă la crearea administratorului' });
    }
  });
  
  // Rută pentru listarea tuturor adminilor (doar pentru admin)
  app.get('/api/admin/admins', isAdmin, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      
      // Eliminăm parolele din rezultate pentru securitate
      const adminsWithoutPasswords = admins.map(admin => {
        const { password: _, ...adminData } = admin;
        return adminData;
      });
      
      res.json(adminsWithoutPasswords);
    } catch (error) {
      console.error('Eroare la obținerea listei de administratori:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de administratori' });
    }
  });
}