import axios from 'axios';
import { ServiceProvider } from '@shared/schema';
import { IStorage } from '../storage';

interface EmailOptions {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  from?: string;
}

/**
 * Service pentru trimiterea de email-uri folosind Elastic Email HTTP API
 */
export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = process.env.ELASTIC_EMAIL_API_KEY || '';
    this.fromEmail = 'no-reply@serviceauto.ro';
    this.fromName = 'Service Auto App';
    
    if (!this.apiKey) {
      console.warn('[Email Service] ELASTIC_EMAIL_API_KEY missing. Email notifications will not be sent.');
    }
  }

  /**
   * Trimite un email folosind Elastic Email HTTP API
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.warn('[Email Service] Cannot send email: API key missing');
        return false;
      }

      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      params.append('from', options.from || this.fromEmail);
      params.append('fromName', this.fromName);
      params.append('to', options.to);
      params.append('subject', options.subject);
      params.append('bodyHtml', options.bodyHtml);
      
      if (options.bodyText) {
        params.append('bodyText', options.bodyText);
      }

      const response = await axios.post('https://api.elasticemail.com/v2/email/send', params);

      if (response.data && response.data.success) {
        console.log(`[Email Service] Email sent successfully to ${options.to}`);
        return true;
      } else {
        console.error('[Email Service] Failed to send email:', response.data);
        return false;
      }
    } catch (error) {
      console.error('[Email Service] Error sending email:', error);
      return false;
    }
  }

  /**
   * Verifică notificările pentru un service și trimite un email
   * dacă serviciul are activată notificarea prin email
   */
  async sendServiceNotificationEmail(
    serviceProvider: ServiceProvider,
    storage: IStorage,
    subject: string,
    htmlContent: string,
    textContent?: string,
    isInstant: boolean = false
  ): Promise<boolean> {
    try {
      // Verifică preferințele de notificare
      const preferences = await storage.getNotificationPreferences(serviceProvider.id);
      
      // Dacă nu există preferințe sau notificările prin email sunt dezactivate, nu trimite
      if (!preferences || !preferences.emailNotificationsEnabled) {
        console.log(`[Email Service] Email notifications disabled for service ${serviceProvider.id}`);
        return false;
      }

      // Trimite emailul
      return await this.sendEmail({
        to: serviceProvider.email,
        subject,
        bodyHtml: htmlContent,
        bodyText: textContent
      });
    } catch (error) {
      console.error('[Email Service] Error sending service notification email:', error);
      return false;
    }
  }
}

// Exportă o instanță singleton
export const emailService = new EmailService();