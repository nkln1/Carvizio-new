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
  // Definim proprietățile statice înainte de block-ul static pentru a evita accesul înainte de inițializare
  private static apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  private static fromEmail = 'notificari@carvizio.ro'; // Adresa verificată pentru domeniul carvizio.ro
  private static fromName = 'Auto Service App';
  private static baseUrl = 'https://api.elasticemail.com/v2';
  
  static {
    console.log('EmailService initialization:');
    console.log('- API Key configured:', this.apiKey ? 'YES' : 'NO');
    console.log('- From Email:', this.fromEmail);
    console.log('- From Name:', this.fromName);
    console.log('- API Base URL:', this.baseUrl);
    if (this.apiKey) {
      console.log(`- API Key (masked): ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
    } else {
      console.log('- ELASTIC_EMAIL_API_KEY environment variable not found');
      console.log('- Available environment variables:', Object.keys(process.env).join(', '));
    }
  }
  
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
    textContent?: string,
    debugInfo: string = ''
  ): Promise<boolean> {
    const messageId = `email_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    try {
      if (!this.apiKey) {
        console.error(`[${messageId}] 🚫 API key pentru Elastic Email nu este configurat`);
        throw new Error('API key pentru Elastic Email nu este configurat');
      }

      // Verificare adresă de email destinatar
      if (!to || !to.includes('@') || to.trim() === '') {
        console.error(`[${messageId}] 🚫 Adresa de email destinatar invalidă:`, to);
        throw new Error(`Adresa de email destinatar invalidă: "${to}"`);
      }

      // Diagnostic complet
      console.log(`\n[${messageId}] 📧 ===== ELASTIC EMAIL - TRIMITERE EMAIL =====`);
      if (debugInfo) {
        console.log(`[${messageId}] 🔍 Context: ${debugInfo}`);
      }
      console.log(`[${messageId}] 📋 Detalii email:`);
      console.log(`[${messageId}]   • Destinatar:`, to);
      console.log(`[${messageId}]   • Expeditor:`, this.fromEmail);
      console.log(`[${messageId}]   • Nume Expeditor:`, this.fromName);
      console.log(`[${messageId}]   • Subiect:`, subject);
      console.log(`[${messageId}]   • Conținut HTML:`, htmlContent ? `${htmlContent.substring(0, 100)}${htmlContent.length > 100 ? '...' : ''}` : 'Nu există');
      console.log(`[${messageId}]   • Conținut Text:`, textContent ? `${textContent.substring(0, 100)}${textContent.length > 100 ? '...' : ''}` : 'Nu există');
      console.log(`[${messageId}] 📡 API Info:`);
      console.log(`[${messageId}]   • API Key configurată:`, !!this.apiKey);
      console.log(`[${messageId}]   • API Key hash:`, 
        this.apiKey ? `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}` : 'N/A');
      console.log(`[${messageId}]   • API URL:`, `${this.baseUrl}/email/send`);

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

      console.log(`[${messageId}] 🔄 Trimitere cerere către API...`);
      
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
      
      console.log(`[${messageId}] ⏱️ Durata cerere API: ${endTime - startTime}ms`);
      console.log(`[${messageId}] 📊 Răspuns primit: [${response.status}] ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`[${messageId}] 📄 Content-Type răspuns:`, contentType);

      if (!response.ok) {
        console.log(`[${messageId}] ❌ Răspuns cu eroare de la API`);
        let errorData;
        try {
          // Încercăm să parsăm răspunsul ca JSON dacă este posibil
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            console.error(`[${messageId}] 🚫 Eroare JSON de la API:`, JSON.stringify(errorData, null, 2));
          } else {
            // Altfel obținem textul răspunsului
            errorData = await response.text();
            console.error(`[${messageId}] 🚫 Eroare text de la API:`, errorData);
          }
        } catch (parseError) {
          console.error(`[${messageId}] 🚫 Eroare la parsarea răspunsului de eroare:`, parseError);
          errorData = 'Nu am putut parsa răspunsul de eroare';
        }
        
        console.error(`[${messageId}] 🚫 Eroare la trimiterea email-ului. Status:`, response.status);
        throw new Error(`Eroare API Elastic Email (${response.status}): ${JSON.stringify(errorData)}`);
      }

      // Procesare răspuns de succes
      let data;
      try {
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log(`[${messageId}] ✅ Răspuns JSON de succes:`, JSON.stringify(data, null, 2));
        } else {
          data = await response.text();
          console.log(`[${messageId}] ✅ Răspuns text de succes:`, data);
        }
      } catch (parseError) {
        console.warn(`[${messageId}] ⚠️ Nu am putut parsa răspunsul ca JSON:`, parseError);
        data = 'Răspuns neașteptat, posibil succes dar format necunoscut';
      }
      
      console.log(`[${messageId}] ✅ Email trimis cu succes!`);
      console.log(`[${messageId}] 📧 ===== SFÂRȘIT TRIMITERE EMAIL =====\n`);
      return true;
    } catch (error) {
      console.error(`[${messageId}] ❌ EXCEPȚIE la trimiterea email-ului:`, error);
      
      // Capturăm mai multe informații despre eroare pentru debugging
      if (error instanceof Error) {
        console.error(`[${messageId}] ❌ Mesaj eroare:`, error.message);
        console.error(`[${messageId}] ❌ Stack trace:`, error.stack);
      }
      
      // Încercăm să trimitem un email de test spre noi înșine pentru diagnosticare
      try {
        console.log(`[${messageId}] 🔄 Încercare de trimitere email de diagnostic către dezvoltator...`);
        // Nu folosim metoda sendEmail pentru a evita recursivitatea
        const diagnosticParams = new URLSearchParams();
        diagnosticParams.append('apikey', this.apiKey || '');
        diagnosticParams.append('to', 'notificari@carvizio.ro'); // Folosim adresa de expeditor pentru diagnosticare
        diagnosticParams.append('from', this.fromEmail);
        diagnosticParams.append('fromName', 'Auto Service App - ERROR');
        diagnosticParams.append('subject', `DIAGNOSTICARE: Eroare trimitere email [${messageId}]`);
        diagnosticParams.append('bodyHtml', `
          <h1>Eroare la trimiterea unui email</h1>
          <p>A apărut o eroare în timpul trimiterii unui email către: ${to}</p>
          <p>ID Mesaj: ${messageId}</p>
          <p>Subiect: ${subject}</p>
          ${debugInfo ? `<p>Context: ${debugInfo}</p>` : ''}
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
        console.log(`[${messageId}] ✅ Email de diagnosticare trimis cu succes`);
      } catch (diagError) {
        console.error(`[${messageId}] ❌ Nu s-a putut trimite email-ul de diagnosticare:`, diagError);
      }
      
      console.log(`[${messageId}] 📧 ===== SFÂRȘIT TRIMITERE EMAIL CU EROARE =====\n`);
      
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
    serviceProvider: any, // Modificat pentru a accepta structuri diferite
    requestTitle: string,
    clientName: string,
    requestId: string | number = `request_${Date.now()}`
  ): Promise<boolean> {
    const debugInfo = `[Cerere Nouă] Client: ${clientName}, Titlu: ${requestTitle}, ID: ${requestId}`;
    console.log(`\n📨 === EmailService.sendNewRequestNotification - Trimitere notificare cerere nouă ===`);
    console.log(`📧 Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`📝 Titlu cerere: ${requestTitle}`);
    console.log(`👤 Client: ${clientName}`);
    console.log(`🔢 ID Cerere: ${requestId}`);
    
    // Validare date de intrare
    if (!serviceProvider || !serviceProvider.email) {
      console.error(`❌ Date furnizor de servicii invalide:`, serviceProvider);
      return false;
    }
    
    // Verificăm dacă email-ul este valid
    if (!serviceProvider.email.includes('@')) {
      console.error(`❌ Adresa de email invalidă: ${serviceProvider.email}`);
      return false;
    }
    
    const subject = `Cerere nouă: ${requestTitle}`;
    // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
    const uniqueSubject = `${subject} [${requestId}]`;
    
    // HTML mai atractiv pentru notificarea prin email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4299e1; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Cerere nouă de service</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px;">Bună ziua, <strong>${serviceProvider.companyName}</strong>,</p>
          <p style="font-size: 16px;">Ați primit o cerere nouă de service de la <strong>${clientName}</strong>:</p>
          <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #2d3748;">${requestTitle}</h3>
          </div>
          <p style="font-size: 16px;">Puteți vizualiza detaliile complete ale cererii și răspunde direct din contul dvs.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://auto-service-app.replit.app/service-dashboard?tab=cereri" 
               style="background-color: #4299e1; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
              Vezi cererea
            </a>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
              Acest email a fost trimis automat de aplicația Auto Service.
            </p>
            <p style="color: #718096; font-size: 14px; margin-top: 0;">
              Puteți dezactiva notificările prin email din 
              <a href="https://auto-service-app.replit.app/service-dashboard?tab=account" style="color: #4299e1; text-decoration: none;">
                setările contului dvs
              </a>.
            </p>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Auto Service App. Toate drepturile rezervate.</p>
          <!-- ID Cerere: ${requestId} - Folosit pentru prevenirea duplicării -->
        </div>
      </div>
    `;

    // Text simplu pentru clienții de email care nu suportă HTML
    const text = `
Cerere nouă de service: ${requestTitle}

Bună ziua, ${serviceProvider.companyName},

Ați primit o cerere nouă de service de la ${clientName}.

Puteți vizualiza detaliile și răspunde acestei cereri accesând: https://auto-service-app.replit.app/service-dashboard?tab=cereri

Acest email a fost trimis automat de aplicația Auto Service.
Puteți dezactiva notificările prin email din setările contului dvs.

© ${new Date().getFullYear()} Auto Service App. Toate drepturile rezervate.
    `;

    try {
      console.log(`🔄 Inițiere trimitere email pentru cerere nouă...`);
      
      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(`❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`);
        console.error(`Variabile de mediu disponibile:`, Object.keys(process.env).filter(key => 
          !key.includes('SECRET') && !key.includes('KEY') && !key.includes('TOKEN')).join(', '));
        
        // Încercăm să verificăm direct variabila de mediu pentru debugging
        console.error(`ELASTIC_EMAIL_API_KEY în process.env: ${!!process.env.ELASTIC_EMAIL_API_KEY}`);
        if (process.env.ELASTIC_EMAIL_API_KEY) {
          console.error(`Lungime ELASTIC_EMAIL_API_KEY: ${process.env.ELASTIC_EMAIL_API_KEY.length}`);
        }
        
        return false;
      }

      // Verificăm parametrii email pentru debugging
      if (!serviceProvider.email || !uniqueSubject || !html) {
        console.error(`❌ Parametri email invalizi:`, {
          email: !!serviceProvider.email, 
          subject: !!uniqueSubject, 
          html: !!html
        });
        return false;
      }

      // Trimitem email-ul cu logging extins pentru debugging
      console.log(`🔄 Trimitere email către: ${serviceProvider.email}`);
      console.log(`🔄 Subiect: ${uniqueSubject}`);
      console.log(`🔄 API Key prezent: ${!!this.apiKey}`);
      console.log(`🔄 API Key trunchiat: ${this.apiKey ? `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}` : 'N/A'}`);
      console.log(`🔄 Dimensiune conținut HTML: ${html.length} caractere`);
      
      // Apel direct la metoda sendEmail cu try-catch separat pentru robustețe
      let result: boolean;
      try {
        // Încercăm trimiterea email-ului
        result = await this.sendEmail(
          serviceProvider.email, 
          uniqueSubject, 
          html, 
          text, // Adăugăm și conținut text simplu pentru compatibilitate
          debugInfo // info debugging
        );
        
        console.log(`🔄 Rezultat apel sendEmail: ${result ? 'SUCCESS' : 'FAILURE'}`);
      } catch (innerError) {
        console.error(`❌ Excepție internă în timpul trimiterii email-ului: ${innerError instanceof Error ? innerError.message : String(innerError)}`);
        if (innerError instanceof Error && innerError.stack) {
          console.error(`❌ Stack trace excepție internă: ${innerError.stack}`);
        }
        result = false;
      }
      
      if (result) {
        console.log(`✅ EmailService.sendNewRequestNotification - Email trimis cu succes către ${serviceProvider.email} pentru cererea ${requestId}`);
      } else {
        console.error(`❌ EmailService.sendNewRequestNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId}`);
        
        // Încercăm un fallback cu adresa de diagnosticare
        try {
          console.log(`🔄 Încercare fallback la adresa de diagnosticare...`);
          const fallbackResult = await this.sendEmail(
            "notificari@carvizio.ro", // Adresa de diagnosticare
            `[DIAGNOSTIC] ${uniqueSubject}`,
            `<h1>Test diagnostic - Eșec trimitere email cerere nouă</h1>
            <p>Acest email este un test de diagnostic pentru o cerere nouă care nu a putut fi trimisă la adresa destinatarului original.</p>
            <p><strong>Destinatar original:</strong> ${serviceProvider.email}</p>
            <p><strong>Cerere:</strong> ${requestTitle}</p>
            <p><strong>Client:</strong> ${clientName}</p>`,
            `Test diagnostic - Eșec trimitere email cerere nouă\n\nDestinatarul original: ${serviceProvider.email}\nCerere: ${requestTitle}\nClient: ${clientName}`,
            `[FALLBACK] ${debugInfo}`
          );
          console.log(`🔄 Rezultat fallback diagnostic: ${fallbackResult ? 'SUCCESS' : 'FAILURE'}`);
        } catch (fallbackError) {
          console.error(`❌ Și fallback-ul a eșuat:`, fallbackError);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`❌ EmailService.sendNewRequestNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId}:`, error);
      // Logging detailed error information
      if (error instanceof Error) {
        console.error(`❌ Error details: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
      }
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    } finally {
      console.log(`📨 === Sfârșit procesare notificare cerere nouă ===\n`);
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
    clientName: string,
    offerId: string | number = `offer_${Date.now()}`
  ): Promise<boolean> {
    const debugInfo = `[Ofertă Acceptată] Client: ${clientName}, Titlu: ${offerTitle}, ID: ${offerId}`;
    console.log(`=== EmailService.sendOfferAcceptedNotification - Trimitere notificare ofertă acceptată ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Titlu ofertă: ${offerTitle}`);
    console.log(`Client: ${clientName}`);
    console.log(`ID Ofertă: ${offerId}`);
    
    const subject = `Ofertă acceptată: ${offerTitle}`;
    // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
    const uniqueSubject = `${subject} [${offerId}]`;
    
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
        <!-- ID Ofertă: ${offerId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo // info debugging
      );
      console.log(`EmailService.sendOfferAcceptedNotification - Email trimis cu succes către ${serviceProvider.email} pentru oferta ${offerId}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendOfferAcceptedNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId}:`, error);
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
    requestOrOfferTitle: string,
    messageId: string = `message_${Date.now()}`
  ): Promise<boolean> {
    const debugInfo = `[Mesaj Nou] De la: ${senderName}, Cerere/Ofertă: ${requestOrOfferTitle}, ID Mesaj: ${messageId}`;
    console.log(`=== EmailService.sendNewMessageNotification - Trimitere notificare mesaj nou ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Expeditor: ${senderName}`);
    console.log(`Referitor la: ${requestOrOfferTitle}`);
    console.log(`ID Mesaj: ${messageId}`);
    console.log(`Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
    
    const subject = `Mesaj nou de la ${senderName}`;
    
    // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
    const uniqueSubject = `${subject} [${messageId}]`;
    
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
        <!-- ID Mesaj: ${messageId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo // info debugging
      );
      console.log(`EmailService.sendNewMessageNotification - Email trimis cu succes către ${serviceProvider.email} pentru mesajul ${messageId}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendNewMessageNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${messageId}:`, error);
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
    reviewContent: string,
    reviewId: string | number = `review_${Date.now()}`
  ): Promise<boolean> {
    const debugInfo = `[Recenzie Nouă] Client: ${clientName}, Rating: ${rating}/5, ID: ${reviewId}`;
    console.log(`=== EmailService.sendNewReviewNotification - Trimitere notificare recenzie nouă ===`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Client: ${clientName}`);
    console.log(`Rating: ${rating}/5`);
    console.log(`ID Recenzie: ${reviewId}`);
    console.log(`Conținut recenzie (primele 50 caractere): ${reviewContent.substring(0, 50)}${reviewContent.length > 50 ? '...' : ''}`);
    
    const subject = `Recenzie nouă de la ${clientName}`;
    // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
    const uniqueSubject = `${subject} [${reviewId}]`;
    
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
        <!-- ID Recenzie: ${reviewId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo // info debugging
      );
      console.log(`EmailService.sendNewReviewNotification - Email trimis cu succes către ${serviceProvider.email} pentru recenzia ${reviewId}`);
      return result;
    } catch (error) {
      console.error(`EmailService.sendNewReviewNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }
  
  /**
   * Trimite notificare de mesaj nou către client
   * Această metodă este specializată pentru a notifica clienții (nu service provider-ii)
   * @param client Clientul care primește notificarea
   * @param messageContent Conținutul mesajului
   * @param senderName Numele expeditorului (service provider)
   * @param requestOrOfferTitle Titlul cererii sau ofertei asociate
   * @param messageId ID unic pentru mesaj (pentru prevenirea duplicării)
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendNewMessageNotificationToClient(
    client: any, // Acceptă orice format client
    messageContent: string,
    senderName: string,
    requestOrOfferTitle: string,
    messageId: string = `message_client_${Date.now()}`
  ): Promise<boolean> {
    const debugInfo = `[Mesaj Nou pentru CLIENT] De la: ${senderName}, Cerere/Ofertă: ${requestOrOfferTitle}, ID Mesaj: ${messageId}`;
    console.log(`\n💬 === EmailService.sendNewMessageNotificationToClient - Trimitere notificare mesaj nou către CLIENT ===`);
    console.log(`📧 Destinatar: ${client.name} (${client.email})`);
    console.log(`📤 Expeditor: ${senderName}`);
    console.log(`📌 Referitor la: ${requestOrOfferTitle}`);
    console.log(`🔢 ID Mesaj: ${messageId}`);
    console.log(`📝 Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
    
    const subject = `Mesaj nou de la ${senderName}`;
    
    // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
    const uniqueSubject = `${subject} [${messageId}]`;
    
    // Truncăm mesajul dacă este prea lung
    const truncatedMessage = messageContent.length > 150 
      ? messageContent.substring(0, 147) + '...' 
      : messageContent;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Mesaj nou</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px;">Bună ziua, ${client.name},</p>
          <p style="font-size: 16px;">Ați primit un mesaj nou de la <strong>${senderName}</strong> referitor la "${requestOrOfferTitle}":</p>
          <div style="background-color: #f7fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-style: italic;">"${truncatedMessage}"</p>
          </div>
          <p style="font-size: 16px;">Puteți vizualiza conversația completă și răspunde din contul dvs.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://auto-service-app.replit.app/client-dashboard?tab=messages" 
               style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
              Vezi mesajele
            </a>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
              Acest email a fost trimis automat de aplicația Auto Service.
            </p>
            <p style="color: #718096; font-size: 14px; margin-top: 0;">
              Puteți dezactiva notificările prin email din 
              <a href="https://auto-service-app.replit.app/client-dashboard?tab=account" style="color: #3b82f6; text-decoration: none;">
                setările contului dvs
              </a>.
            </p>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Auto Service App. Toate drepturile rezervate.</p>
          <!-- ID Mesaj: ${messageId} - Folosit pentru prevenirea duplicării -->
        </div>
      </div>
    `;

    try {
      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        client.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo // info debugging
      );
      console.log(`💬 EmailService.sendNewMessageNotificationToClient - Email trimis cu succes către ${client.email} pentru mesajul ${messageId}`);
      return result;
    } catch (error) {
      console.error(`💬 EmailService.sendNewMessageNotificationToClient - Eroare la trimiterea email-ului către ${client.email} pentru mesajul ${messageId}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }
  
  /**
   * Trimite notificare de ofertă nouă către client
   * @param client Clientul care primește notificarea
   * @param offerTitle Titlul ofertei
   * @param providerName Numele service provider-ului
   * @param requestTitle Titlul cererii originale
   * @param offerId ID unic pentru ofertă (pentru prevenirea duplicării)
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendNewOfferNotificationToClient(
    client: any, // Acceptă orice format client
    offerTitle: string,
    providerName: string,
    requestTitle: string,
    offerId: string = `offer_${Date.now()}`
  ): Promise<boolean> {
    const debugInfo = `[Ofertă Nouă pentru CLIENT] De la: ${providerName}, Ofertă: ${offerTitle}, Cerere: ${requestTitle}, ID: ${offerId}`;
    console.log(`\n📋 === EmailService.sendNewOfferNotificationToClient - Trimitere notificare ofertă nouă către CLIENT ===`);
    console.log(`📧 Destinatar: ${client.name} (${client.email})`);
    console.log(`📤 Service Provider: ${providerName}`);
    console.log(`📌 Titlu ofertă: ${offerTitle}`);
    console.log(`📝 Cerere originală: ${requestTitle}`);
    console.log(`🔢 ID Ofertă: ${offerId}`);
    
    const subject = `Ofertă nouă de la ${providerName}`;
    
    // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
    const uniqueSubject = `${subject} [${offerId}]`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Ofertă nouă</h2>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px;">Bună ziua, ${client.name},</p>
          <p style="font-size: 16px;">Ați primit o ofertă nouă de la <strong>${providerName}</strong> pentru cererea dumneavoastră "${requestTitle}":</p>
          <div style="background-color: #f7fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #10b981;">${offerTitle}</h3>
          </div>
          <p style="font-size: 16px;">Puteți vizualiza detaliile complete ale ofertei și răspunde din contul dvs.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://auto-service-app.replit.app/client-dashboard?tab=offers" 
               style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
              Vezi oferta
            </a>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
              Acest email a fost trimis automat de aplicația Auto Service.
            </p>
            <p style="color: #718096; font-size: 14px; margin-top: 0;">
              Puteți dezactiva notificările prin email din 
              <a href="https://auto-service-app.replit.app/client-dashboard?tab=account" style="color: #10b981; text-decoration: none;">
                setările contului dvs
              </a>.
            </p>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Auto Service App. Toate drepturile rezervate.</p>
          <!-- ID Ofertă: ${offerId} - Folosit pentru prevenirea duplicării -->
        </div>
      </div>
    `;

    try {
      // Trimitem email-ul folosind parametrul de debugging
      const result = await this.sendEmail(
        client.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo // info debugging
      );
      console.log(`📋 EmailService.sendNewOfferNotificationToClient - Email trimis cu succes către ${client.email} pentru oferta ${offerId}`);
      return result;
    } catch (error) {
      console.error(`📋 EmailService.sendNewOfferNotificationToClient - Eroare la trimiterea email-ului către ${client.email} pentru oferta ${offerId}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }
}