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
    // Utilizăm un email verificat și dedicat pentru trimiterea notificărilor
    // Acum că utilizăm un cont plătit, putem trimite către orice adresă
    // Actualizat la 2 aprilie 2025: folosim adresa verificată din contul Elastic Email
    this.fromEmail = 'notificari@carvizio.ro';
    this.fromName = 'Service Auto App';
    
    if (!this.apiKey) {
      console.warn('[Email Service] ELASTIC_EMAIL_API_KEY missing. Email notifications will not be sent.');
    } else {
      const maskedKey = this.apiKey.substring(0, 4) + '...' + this.apiKey.substring(this.apiKey.length - 4);
      console.log(`[Email Service] Initialized with API key: ${maskedKey}`);
      console.log(`[Email Service] From email: ${this.fromEmail}`);
      console.log(`[Email Service] From name: ${this.fromName}`);
      
      // Rulăm un test la inițializare pentru a verifica API-ul
      this.testElasticEmailConnection();
      
      // Actualizat la 2 aprilie 2025: test suplimentar pentru a verifica trimiterea emailurilor
      this.sendTestEmail();
    }
  }
  
  /**
   * Trimite un email de test pentru a verifica funcționalitatea
   */
  private async sendTestEmail() {
    try {
      console.log('[Email Service] Sending test email...');
      
      await this.sendEmail({
        to: "nikelino6@yahoo.com", // Adresa de test a proprietarului
        subject: "Test Email Service - " + new Date().toISOString(),
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0080ff;">Test Email Service</h2>
            <p>Acesta este un email de test trimis la ${new Date().toLocaleString()}.</p>
            <p>Dacă ai primit acest email, serviciul funcționează corect.</p>
            <p>API Key utilizat: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}</p>
            <p>From email: ${this.fromEmail}</p>
          </div>
        `,
        bodyText: `Test Email Service - ${new Date().toLocaleString()}\n\nAcesta este un email de test. Dacă ai primit acest email, serviciul funcționează corect.`
      });
    } catch (error) {
      console.error('[Email Service] Failed to send test email:', error);
    }
  }
  
  /**
   * Test de conectare la Elastic Email pentru a verifica API key-ul
   */
  private async testElasticEmailConnection() {
    try {
      console.log('[Email Service] Testing Elastic Email API connection...');
      console.log(`[Email Service] API Key length: ${this.apiKey.length} characters`);
      
      // Actualizat la 2 aprilie 2025: testăm direct endpoint-ul pentru trimiterea email-urilor
      console.log('[Email Service] Testing email endpoints...');
      
      // Pregătim parametrii pentru un test simplu
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      params.append('subject', 'API Connection Test');
      params.append('from', this.fromEmail);
      params.append('fromName', this.fromName);
      params.append('to', 'no-reply@serviceauto.ro'); // Adresă internă pentru test
      params.append('bodyHtml', '<p>This is a test email to verify API connectivity.</p>');
      
      try {
        // Verificăm doar validitatea API-ului fără a trimite efectiv email-ul
        const pingResult = await axios.get(`https://api.elasticemail.com/v2/email/ping?apikey=${this.apiKey}`);
        
        if (pingResult.data && pingResult.data.success) {
          console.log('[Email Service] API ping successful!');
        } else {
          console.error('[Email Service] API ping failed:', pingResult.data);
        }
      } catch (pingError) {
        console.error('[Email Service] API ping error:', pingError);
        
        if (axios.isAxiosError(pingError)) {
          console.error('  Status:', pingError.response?.status);
          console.error('  Status Text:', pingError.response?.statusText);
          console.error('  Response data:', pingError.response?.data);
        }
      }
      
      // Verificăm și starea contului
      try {
        const statusParams = new URLSearchParams();
        statusParams.append('apikey', this.apiKey);
        
        const statusResult = await axios.get('https://api.elasticemail.com/v2/account/status?' + statusParams.toString());
        
        if (statusResult.data && statusResult.data.success) {
          console.log('[Email Service] Account status check successful!');
          console.log('[Email Service] Account status:', statusResult.data.data);
        } else {
          console.error('[Email Service] Account status check failed:', statusResult.data);
        }
      } catch (statusError) {
        console.error('[Email Service] Account status check error:', statusError);
        
        if (axios.isAxiosError(statusError)) {
          console.error('  Status:', statusError.response?.status);
          console.error('  Status Text:', statusError.response?.statusText);
          console.error('  Response data:', statusError.response?.data);
        }
      }
      
    } catch (error) {
      console.error('[Email Service] Overall error testing Elastic Email API:', error);
    }
  }
  
  /**
   * Testează punctul de intrare account/load
   */
  private async testAccountLoad() {
    try {
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      
      console.log('[Email Service] Making request to account/load endpoint');
      const response = await axios.get('https://api.elasticemail.com/v2/account/load?' + params.toString());
      
      console.log('[Email Service] Received response from account/load endpoint:', response.status);
      
      if (response.data && response.data.success) {
        console.log('[Email Service] Account/load test successful!');
        console.log(`[Email Service] Account: ${response.data.data?.email || 'Unknown'}`);
        console.log(`[Email Service] Daily send limit: ${response.data.data?.dailysendlimit || 'Unknown'}`);
      } else {
        console.error('[Email Service] Account/load test failed:', response.data);
      }
    } catch (error) {
      console.error('[Email Service] Error calling account/load:', error instanceof Error ? error.message : String(error));
      
      if (axios.isAxiosError(error)) {
        console.error('  Status:', error.response?.status);
        console.error('  Status Text:', error.response?.statusText);
        console.error('  Response data:', error.response?.data);
      }
    }
  }
  
  /**
   * Testează punctul de intrare verifyaccount
   */
  private async testVerifyAccount() {
    try {
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey);
      
      console.log('[Email Service] Making request to verifyaccount endpoint');
      const response = await axios.get('https://api.elasticemail.com/v2/account/verifyaccount?' + params.toString());
      
      console.log('[Email Service] Received response from verifyaccount endpoint:', response.status);
      
      if (response.data && response.data.success) {
        console.log('[Email Service] Verify account test successful!');
      } else {
        console.error('[Email Service] Verify account test failed:', response.data);
      }
    } catch (error) {
      console.error('[Email Service] Error calling verifyaccount:', error instanceof Error ? error.message : String(error));
      
      if (axios.isAxiosError(error)) {
        console.error('  Status:', error.response?.status);
        console.error('  Status Text:', error.response?.statusText);
        console.error('  Response data:', error.response?.data);
      }
    }
  }

  /**
   * Trimite un email folosind Elastic Email HTTP API
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Verificare și loggare a API Key-ului (mascat pentru securitate)
      if (!this.apiKey) {
        console.warn('[Email Service] Cannot send email: API key missing');
        return false;
      } else {
        const maskedKey = this.apiKey.substring(0, 4) + '...' + this.apiKey.substring(this.apiKey.length - 4);
        console.log(`[Email Service] Attempting to send email with API key: ${maskedKey}`);
      }

      // Loggare detalii email pentru depanare
      console.log(`[Email Service] Sending email to: ${options.to}`);
      console.log(`[Email Service] Email subject: ${options.subject}`);
      console.log(`[Email Service] From email: ${options.from || this.fromEmail}`);

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

      // Loggare URL și request parameters
      console.log('[Email Service] Making request to Elastic Email API');
      const paramString = params.toString().replace(this.apiKey, 'APIKEY_HIDDEN');
      console.log(`[Email Service] Request parameters: ${paramString}`);

      const response = await axios.post('https://api.elasticemail.com/v2/email/send', params);
      console.log('[Email Service] Received response from Elastic Email API');
      
      // Loggare răspuns complet
      console.log('[Email Service] API Response:', JSON.stringify(response.data));

      if (response.data && response.data.success) {
        console.log(`[Email Service] Email sent successfully to ${options.to}`);
        console.log(`[Email Service] Message ID: ${response.data.data?.messageid || 'N/A'}`);
        return true;
      } else {
        console.error('[Email Service] Failed to send email:', response.data);
        console.error('[Email Service] Error message:', response.data?.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('[Email Service] Error sending email:', error);
      if (axios.isAxiosError(error)) {
        console.error('[Email Service] Axios request failed:');
        console.error('  Status:', error.response?.status);
        console.error('  Status Text:', error.response?.statusText);
        console.error('  Response data:', error.response?.data);
      }
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

      // Acum că utilizăm un cont plătit Elastic Email, trimitem direct către adresa de email a service provider-ului
      const destinationEmail = serviceProvider.email;
      
      // Nu mai este nevoie de note suplimentare, deoarece trimitem direct la destinația corectă
      let modifiedHtmlContent = htmlContent;

      // Trimite emailul
      return await this.sendEmail({
        to: destinationEmail,
        subject,
        bodyHtml: modifiedHtmlContent,
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