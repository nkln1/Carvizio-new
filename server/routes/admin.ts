import { Express, Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { IStorage } from '../storage';

// Lista de e-mailuri cu roluri de admin
const ADMIN_EMAILS = ['nikelino6@yahoo.com'];

// Middleware pentru verificarea dacă utilizatorul este admin
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ message: 'Autentificare necesară' });
    }
    
    const adminEmail = req.firebaseUser.email;
    
    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
      return res.status(403).json({ message: 'Nu aveți drepturi de administrator' });
    }
    
    next();
  } catch (error) {
    console.error('Eroare la verificarea drepturilor de admin:', error);
    return res.status(500).json({ message: 'Eroare internă a serverului' });
  }
};

export function registerAdminRoutes(app: Express, storage: IStorage, validateFirebaseToken: any): void {
  // Obține lista tuturor clienților (doar pentru admin)
  app.get('/api/admin/clients', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Eroare la obținerea listei de clienți:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de clienți' });
    }
  });
  
  // Obține lista tuturor furnizorilor de servicii (doar pentru admin)
  app.get('/api/admin/service-providers', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const serviceProviders = await storage.getAllServiceProviders();
      res.json(serviceProviders);
    } catch (error) {
      console.error('Eroare la obținerea listei de furnizori de servicii:', error);
      res.status(500).json({ message: 'Eroare la obținerea listei de furnizori de servicii' });
    }
  });
  
  // Obține lista tuturor cererilor (doar pentru admin)
  app.get('/api/admin/requests', validateFirebaseToken, isAdmin, async (req, res) => {
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
  app.get('/api/admin/reviews', validateFirebaseToken, isAdmin, async (req, res) => {
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
  app.post('/api/admin/client/:id/verify', validateFirebaseToken, isAdmin, async (req, res) => {
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
  app.post('/api/admin/service-provider/:id/verify', validateFirebaseToken, isAdmin, async (req, res) => {
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
  app.post('/api/admin/review/:id/dismiss-report', validateFirebaseToken, isAdmin, async (req, res) => {
    try {
      const reviewId = parseInt(req.params.id, 10);
      const { action } = req.body; // 'remove' sau 'dismiss'
      
      if (action === 'remove') {
        await storage.deleteReview(reviewId);
        res.json({ message: 'Recenzia a fost ștearsă cu succes' });
      } else if (action === 'dismiss') {
        await storage.dismissReviewReport(reviewId);
        res.json({ message: 'Raportul a fost respins cu succes' });
      } else {
        res.status(400).json({ message: 'Acțiune nevalidă' });
      }
    } catch (error) {
      console.error('Eroare la gestionarea raportului de recenzie:', error);
      res.status(500).json({ message: 'Eroare la gestionarea raportului de recenzie' });
    }
  });
}