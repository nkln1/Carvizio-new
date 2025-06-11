import { Express, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { IStorage } from '../storage';
import { adminLoginSchema, insertAdminSchema } from '@shared/schema';
import { z } from 'zod';

// Middleware pentru verificarea dacă utilizatorul este admin folosind token de sesiune
const createIsAdminMiddleware = (storage: IStorage) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verificăm dacă există o sesiune admin validă
      if (!req.session || !req.session.adminId) {
        return res.status(401).json({ message: 'Autentificare necesară' });
      }

      // Verificăm dacă admin-ul există și este activ în baza de date
      const adminUser = await storage.getAdminById(req.session.adminId);

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
  // Creăm middleware-ul de admin folosind storage
  const isAdmin = createIsAdminMiddleware(storage);
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
    if (req.session) {
      // Resetăm explicit proprietățile sesiunii înainte de a o distruge
      req.session.adminId = undefined;
      req.session.adminUsername = undefined;

      // Distrugem sesiunea
      req.session.destroy((err) => {
        if (err) {
          console.error('Eroare la deconectarea adminului:', err);
          return res.status(500).json({ message: 'Eroare la deconectare' });
        }

        // Șterge cookie-ul de sesiune - folosim opțiuni explicite pentru a asigura ștergerea
        res.clearCookie('connect.sid', { 
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });

        return res.json({ 
          message: 'Deconectare reușită',
          success: true
        });
      });
    } else {
      // Nu există sesiune activă
      return res.json({ 
        message: 'Nicio sesiune activă', 
        success: true 
      });
    }
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

  // Obține lista tuturor clienților cu paginație (doar pentru admin)
  app.get('/api/admin/clients', isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const clients = await storage.getAllClientsPaginated(offset, limit);
      const totalClients = await storage.getTotalClientsCount();
      
      res.json({
        clients,
        pagination: {
          page,
          limit,
          total: totalClients,
          totalPages: Math.ceil(totalClients / limit)
        }
      });
    } catch (error) {
      console.error('Eroare la obținerea listei de clienți:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de clienți' });
    }
  });

  // Obține detalii client cu cererile și recenziile sale
  app.get('/api/admin/clients/:id', isAdmin, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClientById(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Clientul nu a fost găsit' });
      }

      const clientRequests = await storage.getClientRequests(clientId);
      const clientReviews = await storage.getClientReviews(clientId);
      
      res.json({
        client,
        requests: clientRequests,
        reviews: clientReviews
      });
    } catch (error) {
      console.error('Eroare la obținerea detaliilor clientului:', error);
      res.status(500).json({ message: 'Eroare la obținerea detaliilor clientului' });
    }
  });

  // Obține cererile unui client specific
  app.get('/api/admin/clients/:id/requests', isAdmin, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const requests = await storage.getClientRequests(clientId);
      res.json(requests);
    } catch (error) {
      console.error('Eroare la obținerea cererilor clientului:', error);
      res.status(500).json({ message: 'Eroare la obținerea cererilor clientului' });
    }
  });

  // Obține recenziile unui client specific
  app.get('/api/admin/clients/:id/reviews', isAdmin, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const reviews = await storage.getClientReviews(clientId);
      res.json(reviews);
    } catch (error) {
      console.error('Eroare la obținerea recenziilor clientului:', error);
      res.status(500).json({ message: 'Eroare la obținerea recenziilor clientului' });
    }
  });

  // Obține mașinile unui client specific
  app.get('/api/admin/clients/:id/cars', isAdmin, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const cars = await storage.getClientCars(clientId);
      res.json(cars);
    } catch (error) {
      console.error('Eroare la obținerea mașinilor clientului:', error);
      res.status(500).json({ message: 'Eroare la obținerea mașinilor clientului' });
    }
  });

  // Obține lista tuturor furnizorilor de servicii cu paginație (doar pentru admin)
  app.get('/api/admin/service-providers', isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const serviceProviders = await storage.getAllServiceProvidersPaginated(offset, limit);
      const totalProviders = await storage.getTotalServiceProvidersCount();
      
      res.json({
        serviceProviders,
        pagination: {
          page,
          limit,
          total: totalProviders,
          totalPages: Math.ceil(totalProviders / limit)
        }
      });
    } catch (error) {
      console.error('Eroare la obținerea listei de furnizori de servicii:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de furnizori de servicii' });
    }
  });

  // Obține detalii furnizor de servicii cu recenziile primite
  app.get('/api/admin/service-providers/:id', isAdmin, async (req, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const provider = await storage.getServiceProviderById(providerId);
      
      if (!provider) {
        return res.status(404).json({ message: 'Furnizorul de servicii nu a fost găsit' });
      }

      const providerReviews = await storage.getServiceProviderReviews(providerId);
      const providerOffers = await storage.getServiceProviderOffers(providerId);
      
      res.json({
        provider,
        reviews: providerReviews,
        offers: providerOffers
      });
    } catch (error) {
      console.error('Eroare la obținerea detaliilor furnizorului de servicii:', error);
      res.status(500).json({ message: 'Eroare la obținerea detaliilor furnizorului de servicii' });
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