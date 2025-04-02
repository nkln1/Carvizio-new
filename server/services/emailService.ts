/**
 * Serviciu pentru trimiterea notificărilor prin email folosind Elastic Email API
 */

import fetch from 'node-fetch';
import { type ServiceProvider } from '@shared/schema';

// Tipuri pentru serviciul de email - conform documentație Elastic Email API v2
interface EmailPayload {
  To: string; // Adresa email destinatar
  From: string; // Adresa email expeditor
  FromName?: string; // Nume afișat expeditor
  Subject: string; // Subiectul email-ului
  BodyHTML: string; // Conținutul HTML al email-ului
  BodyText?: string; // Conținutul Text al email-ului (opțional)
}

export class EmailService {
  private static apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  // Folosim adresa de email verificată în contul Elastic Email
  private static fromEmail = 'notificari@carvizio.ro'; // Adresa verificată pentru domeniul carvizio.ro
  private static fromName = 'Auto Service App';
  private static baseUrl = 'https://api.elasticemail.com/v2';

  /**
   * Trimite un email folosind Elastic Email API
   * @param to Email-ul destinatarului
   * @param subject Subiectul email-ului
   * @param htmlContent Conținutul HTML al email-ului
   * @param textContent Conținutul text al email-ului
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('API key pentru Elastic Email nu este configurat');
        return false;
      }

      const payload: EmailPayload = {
        To: to,
        From: this.fromEmail,
        FromName: this.fromName,
        Subject: subject,
        BodyHTML: htmlContent,
        BodyText: textContent
      };

      // Construim URL-ul cu parametrii pentru a folosi application/x-www-form-urlencoded 
      // în loc de application/json care pare să funcționeze mai bine cu API-ul v2
      const params = new URLSearchParams();
      params.append('apikey', this.apiKey || '');
      params.append('to', payload.To);
      params.append('from', payload.From);
      params.append('fromName', payload.FromName || '');
      params.append('subject', payload.Subject);
      params.append('bodyHtml', payload.BodyHTML);
      if (payload.BodyText) {
        params.append('bodyText', payload.BodyText);
      }

      const response = await fetch(`${this.baseUrl}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-ElasticEmail-ApiKey': this.apiKey || ''
        },
        body: params
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Eroare la trimiterea email-ului:', errorData);
        return false;
      }

      const data = await response.json();
      console.log('Email trimis cu succes:', data);
      return true;
    } catch (error) {
      console.error('Excepție la trimiterea email-ului:', error);
      return false;
    }
  }

  /**
   * Trimite notificare de cerere nouă
   * @param serviceProvider Furnizorul de servicii
   * @param requestTitle Titlul cererii
   * @param clientName Numele clientului
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendNewRequestNotification(
    serviceProvider: ServiceProvider,
    requestTitle: string,
    clientName: string
  ): Promise<boolean> {
    const subject = `Cerere nouă: ${requestTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Cerere nouă de service</h2>
        <p>Bună ziua, ${serviceProvider.companyName},</p>
        <p>Ați primit o cerere nouă de service de la <strong>${clientName}</strong>:</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${requestTitle}</h3>
        </div>
        <p>Puteți vizualiza detaliile și răspunde acestei cereri din contul dvs.</p>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=cereri" 
             style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Vezi cererea
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
      </div>
    `;

    return this.sendEmail(serviceProvider.email, subject, html);
  }

  /**
   * Trimite notificare de ofertă acceptată
   * @param serviceProvider Furnizorul de servicii
   * @param offerTitle Titlul ofertei
   * @param clientName Numele clientului
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendOfferAcceptedNotification(
    serviceProvider: ServiceProvider,
    offerTitle: string,
    clientName: string
  ): Promise<boolean> {
    const subject = `Ofertă acceptată: ${offerTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Ofertă acceptată</h2>
        <p>Bună ziua, ${serviceProvider.companyName},</p>
        <p><strong>${clientName}</strong> a acceptat oferta dvs. pentru:</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #68d391; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${offerTitle}</h3>
        </div>
        <p>Puteți vizualiza detaliile și contacta clientul din contul dvs.</p>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=oferte-acceptate" 
             style="background-color: #68d391; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Vezi oferta acceptată
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
      </div>
    `;

    return this.sendEmail(serviceProvider.email, subject, html);
  }

  /**
   * Trimite notificare de mesaj nou
   * @param serviceProvider Furnizorul de servicii
   * @param messageContent Conținutul mesajului
   * @param senderName Numele expeditorului
   * @param requestOrOfferTitle Titlul cererii sau ofertei asociate
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendNewMessageNotification(
    serviceProvider: ServiceProvider,
    messageContent: string,
    senderName: string,
    requestOrOfferTitle: string
  ): Promise<boolean> {
    const subject = `Mesaj nou de la ${senderName}`;
    
    // Truncăm mesajul dacă este prea lung
    const truncatedMessage = messageContent.length > 150 
      ? messageContent.substring(0, 147) + '...' 
      : messageContent;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Mesaj nou</h2>
        <p>Bună ziua, ${serviceProvider.companyName},</p>
        <p>Ați primit un mesaj nou de la <strong>${senderName}</strong> referitor la "${requestOrOfferTitle}":</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #f6ad55; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${truncatedMessage}"</p>
        </div>
        <p>Puteți vizualiza conversația completă și răspunde din contul dvs.</p>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=mesaje" 
             style="background-color: #f6ad55; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Vezi mesajele
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
      </div>
    `;

    return this.sendEmail(serviceProvider.email, subject, html);
  }

  /**
   * Trimite notificare de recenzie nouă
   * @param serviceProvider Furnizorul de servicii
   * @param clientName Numele clientului
   * @param rating Evaluarea (1-5)
   * @param reviewContent Conținutul recenziei
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendNewReviewNotification(
    serviceProvider: ServiceProvider,
    clientName: string,
    rating: number,
    reviewContent: string
  ): Promise<boolean> {
    const subject = `Recenzie nouă de la ${clientName}`;
    
    // Generăm stele pentru rating
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    
    // Truncăm recenzia dacă este prea lungă
    const truncatedReview = reviewContent.length > 200 
      ? reviewContent.substring(0, 197) + '...' 
      : reviewContent;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Recenzie nouă</h2>
        <p>Bună ziua, ${serviceProvider.companyName},</p>
        <p>Ați primit o recenzie nouă de la <strong>${clientName}</strong>:</p>
        <div style="background-color: #f7fafc; border-left: 4px solid #d69e2e; padding: 15px; margin: 20px 0;">
          <p style="color: #d69e2e; font-size: 1.2em; margin: 0 0 10px 0;">${stars} (${rating}/5)</p>
          <p style="margin: 0; font-style: italic;">"${truncatedReview}"</p>
        </div>
        <p>Puteți vizualiza toate recenziile din contul dvs.</p>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=recenzii" 
             style="background-color: #d69e2e; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Vezi recenziile
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
      </div>
    `;

    return this.sendEmail(serviceProvider.email, subject, html);
  }
}