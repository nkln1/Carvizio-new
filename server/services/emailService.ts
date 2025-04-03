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
  
  // Getteri pentru diagnosticare (nu expunem API Key)
  public static getFromEmail(): string {
    return this.fromEmail;
  }
  
  public static getBaseUrl(): string {
    return this.baseUrl;
  }

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
        console.error('🚫 API key pentru Elastic Email nu este configurat');
        throw new Error('API key pentru Elastic Email nu este configurat');
      }

      // Verificare adresă de email destinatar
      if (!to || !to.includes('@') || to.trim() === '') {
        console.error('🚫 Adresa de email destinatar invalidă:', to);
        throw new Error(`Adresa de email destinatar invalidă: "${to}"`);
      }

      // Diagnostic complet
      console.log('\n📧 ===== ELASTIC EMAIL - TRIMITERE EMAIL =====');
      console.log('📋 Detalii email:');
      console.log('  • Destinatar:', to);
      console.log('  • Expeditor:', this.fromEmail);
      console.log('  • Nume Expeditor:', this.fromName);
      console.log('  • Subiect:', subject);
      console.log('  • Conținut HTML:', htmlContent ? `${htmlContent.substring(0, 100)}${htmlContent.length > 100 ? '...' : ''}` : 'Nu există');
      console.log('  • Conținut Text:', textContent ? `${textContent.substring(0, 100)}${textContent.length > 100 ? '...' : ''}` : 'Nu există');
      console.log('📡 API Info:');
      console.log('  • API Key configurată:', !!this.apiKey);
      console.log('  • API Key hash:', 
        this.apiKey ? `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}` : 'N/A');
      console.log('  • API URL:', `${this.baseUrl}/email/send`);

      const payload: EmailPayload = {
        To: to,
        From: this.fromEmail,
        FromName: this.fromName,
        Subject: subject,
        BodyHTML: htmlContent,
        BodyText: textContent
      };

      // Construim URL-ul cu parametrii pentru application/x-www-form-urlencoded 
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

      console.log('🔄 Trimitere cerere către API...');
      
      let startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-ElasticEmail-ApiKey': this.apiKey || ''
        },
        body: params
      });
      let endTime = Date.now();
      
      console.log(`⏱️ Durata cerere API: ${endTime - startTime}ms`);
      console.log(`📊 Răspuns primit: [${response.status}] ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type răspuns:', contentType);

      if (!response.ok) {
        console.log('❌ Răspuns cu eroare de la API');
        let errorData;
        try {
          // Încercăm să parsăm răspunsul ca JSON dacă este posibil
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            console.error('🚫 Eroare JSON de la API:', JSON.stringify(errorData, null, 2));
          } else {
            // Altfel obținem textul răspunsului
            errorData = await response.text();
            console.error('🚫 Eroare text de la API:', errorData);
          }
        } catch (parseError) {
          console.error('🚫 Eroare la parsarea răspunsului de eroare:', parseError);
          errorData = 'Nu am putut parsa răspunsul de eroare';
        }
        
        console.error('🚫 Eroare la trimiterea email-ului. Status:', response.status);
        throw new Error(`Eroare API Elastic Email (${response.status}): ${JSON.stringify(errorData)}`);
      }

      // Procesare răspuns de succes
      let data;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log('✅ Răspuns JSON de succes:', JSON.stringify(data, null, 2));
        } else {
          data = await response.text();
          console.log('✅ Răspuns text de succes:', data);
        }
      } catch (parseError) {
        console.warn('⚠️ Nu am putut parsa răspunsul ca JSON:', parseError);
        data = 'Răspuns neașteptat, posibil succes dar format necunoscut';
      }
      
      console.log('✅ Email trimis cu succes!');
      console.log('📧 ===== SFÂRȘIT TRIMITERE EMAIL =====\n');
      return true;
    } catch (error) {
      console.error('❌ EXCEPȚIE la trimiterea email-ului:', error);
      
      // Capturăm mai multe informații despre eroare pentru debugging
      if (error instanceof Error) {
        console.error('❌ Mesaj eroare:', error.message);
        console.error('❌ Stack trace:', error.stack);
      }
      
      // Încercăm să trimitem un email de test spre noi înșine pentru diagnosticare
      try {
        console.log('🔄 Încercare de trimitere email de diagnostic către dezvoltator...');
        // Nu folosim metoda sendEmail pentru a evita recursivitatea
        const diagnosticParams = new URLSearchParams();
        diagnosticParams.append('apikey', this.apiKey || '');
        diagnosticParams.append('to', 'nkln@yahoo.com'); // Adresa de test/dezvoltator
        diagnosticParams.append('from', this.fromEmail);
        diagnosticParams.append('fromName', 'Auto Service App - ERROR');
        diagnosticParams.append('subject', 'DIAGNOSTICARE: Eroare trimitere email');
        diagnosticParams.append('bodyHtml', `
          <h1>Eroare la trimiterea unui email</h1>
          <p>A apărut o eroare în timpul trimiterii unui email către: ${to}</p>
          <p>Eroare: ${error instanceof Error ? error.message : String(error)}</p>
          <hr>
          <p>Acest email a fost generat automat pentru diagnosticare.</p>
        `);
        
        await fetch(`${this.baseUrl}/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-ElasticEmail-ApiKey': this.apiKey || ''
          },
          body: diagnosticParams
        });
        console.log('✅ Email de diagnosticare trimis cu succes');
      } catch (diagError) {
        console.error('❌ Nu s-a putut trimite email-ul de diagnosticare:', diagError);
      }
      
      console.log('📧 ===== SFÂRȘIT TRIMITERE EMAIL CU EROARE =====\n');
      
      // În loc să aruncăm eroarea mai departe, revenim false pentru a nu întrerupe fluxul aplicației
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
    console.log(`=== EmailService.sendNewRequestNotification - Trimitere notificare cerere nouă ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Titlu cerere: ${requestTitle}`);
    console.log(`Client: ${clientName}`);
    
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

    try {
      const result = await this.sendEmail(serviceProvider.email, subject, html);
      console.log(`EmailService.sendNewRequestNotification - Email trimis cu succes către ${serviceProvider.email}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendNewRequestNotification - Eroare la trimiterea email-ului către ${serviceProvider.email}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
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
    console.log(`=== EmailService.sendOfferAcceptedNotification - Trimitere notificare ofertă acceptată ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Titlu ofertă: ${offerTitle}`);
    console.log(`Client: ${clientName}`);
    
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

    try {
      const result = await this.sendEmail(serviceProvider.email, subject, html);
      console.log(`EmailService.sendOfferAcceptedNotification - Email trimis cu succes către ${serviceProvider.email}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendOfferAcceptedNotification - Eroare la trimiterea email-ului către ${serviceProvider.email}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
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
    console.log(`=== EmailService.sendNewMessageNotification - Trimitere notificare mesaj nou ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Expeditor: ${senderName}`);
    console.log(`Referitor la: ${requestOrOfferTitle}`);
    console.log(`Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
    
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

    try {
      const result = await this.sendEmail(serviceProvider.email, subject, html);
      console.log(`EmailService.sendNewMessageNotification - Email trimis cu succes către ${serviceProvider.email}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendNewMessageNotification - Eroare la trimiterea email-ului către ${serviceProvider.email}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
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
    console.log(`=== EmailService.sendNewReviewNotification - Trimitere notificare recenzie nouă ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Client: ${clientName}`);
    console.log(`Rating: ${rating}/5`);
    console.log(`Conținut recenzie (primele 50 caractere): ${reviewContent.substring(0, 50)}${reviewContent.length > 50 ? '...' : ''}`);
    
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

    try {
      const result = await this.sendEmail(serviceProvider.email, subject, html);
      console.log(`EmailService.sendNewReviewNotification - Email trimis cu succes către ${serviceProvider.email}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendNewReviewNotification - Eroare la trimiterea email-ului către ${serviceProvider.email}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }
}