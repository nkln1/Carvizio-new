import { EmailNotificationService } from './emailNotificationService';
import { emailService } from './emailService';
import { IStorage } from '../storage';

// Initializăm și exportăm serviciile

let emailNotificationService: EmailNotificationService | null = null;

/**
 * Inițializează toate serviciile
 * @param storage Storage-ul pentru accesul la date
 */
export function initializeServices(storage: IStorage) {
  // Inițializeaza serviciul de notificări email
  emailNotificationService = new EmailNotificationService(storage);
  
  console.log('[Services] All services initialized');
  return {
    emailService,
    emailNotificationService
  };
}

/**
 * Returnează serviciul de notificări email
 * Va arunca o eroare dacă serviciul nu a fost inițializat
 */
export function getEmailNotificationService(): EmailNotificationService {
  if (!emailNotificationService) {
    throw new Error('Email notification service not initialized. Call initializeServices first.');
  }
  
  return emailNotificationService;
}

/**
 * Verifică dacă serviciile sunt inițializate
 */
export function areServicesInitialized(): boolean {
  return !!emailNotificationService;
}

// Exportă direct serviciul de email
export { emailService };