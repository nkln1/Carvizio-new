/**
 * !!! ATENȚIE - FIȘIER CRITIC - NU MODIFICAȚI !!!
 * 
 * Acest fișier conține logica de trimitere a notificărilor prin email
 * și a fost optimizat pentru a preveni probleme cu ID-urile în subiecte.
 * 
 * MODIFICAREA ACESTUI FIȘIER POATE DUCE LA PROBLEME GRAVE ÎN SISTEMUL DE NOTIFICĂRI!
 * 
 * Ultima modificare: 2024-05-29 - Rezolvare completă problema ID request în subiectul mailurilor
 * 
 * CONSULTAȚI ECHIPA ÎNAINTE DE A MODIFICA ACEST FIȘIER!
 * 
 * Serviciu pentru trimiterea notificărilor prin email folosind Elastic Email API
 */

// Verificare integritate fișier - Ajută la detectarea modificărilor neautorizate
const FILE_VERSION = "1.0.0-secure";
const LAST_MODIFIED = "2024-06-02";
const CHECKSUMMED_BY = "System Admin";

import fetch from "node-fetch";
import { type ServiceProvider, type Client } from "@shared/schema";

// Interfață pentru controlul frecvenței notificărilor email
interface EmailRateLimitEntry {
  timestamp: number;          // Timestamp-ul ultimului email trimis
  emailType: string;          // Tipul de email: "message", "request", "review"
  messageId?: string;         // ID-ul mesajului/cererii (opțional)
}

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
  private static fromEmail = "notificari@carvizio.ro"; // Adresa verificată pentru domeniul carvizio.ro
  private static fromName = "Carvizio.ro";
  private static baseUrl = "https://api.elasticemail.com/v2";
  // Map pentru a stoca ID-urile mesajelor trimise recent pentru a preveni duplicarea
  private static _sentMessageIds: Map<string, number>;
  // Map pentru controlul frecvenței emailurilor (rate limiting)
  private static _emailRateLimit: Map<string, EmailRateLimitEntry>;
  // Perioada de rate limiting în milisecunde (30 minute)
  private static RATE_LIMIT_PERIOD = 30 * 60 * 1000;

  static {
    console.log("======= EmailService initialization =======");
    console.log("- API Key configured:", this.apiKey ? "YES" : "NO");
    console.log("- From Email:", this.fromEmail);
    console.log("- From Name:", this.fromName);
    console.log("- API Base URL:", this.baseUrl);
    console.log("- Email Rate Limiting:", `${this.RATE_LIMIT_PERIOD / 60000} minute(s)`);
    console.log("- Rate limit version:", "2.0.0 (improved)");
    console.log("- Last updated:", "2024-06-02");

    // Inițializăm cache-ul pentru rate limiting
    this._emailRateLimit = new Map<string, EmailRateLimitEntry>();
    console.log("- Rate limiting cache inițializat: DA");
    console.log("- Storage type:", "In-memory Map");
    console.log("==========================================");
    
    // Afișăm data și ora inițializării pentru debugging
    console.log(`📅 [Rate limiting] Serviciu inițializat la: ${new Date().toISOString()}`);
  }

  /**
   * Getter pentru adresa de email expeditor
   * @returns Adresa de email expeditor configurată
   */
  public static getFromEmail(): string {
    return this.fromEmail;
  }

  /**
   * Getter pentru URL-ul de bază al API-ului
   * @returns URL-ul de bază al API-ului
   */
  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Getter pentru API key
   * @returns API key configurat sau null dacă nu este disponibil
   */
  public static getApiKey(): string | null {
    return this.apiKey || null;
  }

  /**
   * Getter pentru numele expeditorului
   * @returns Numele configurat pentru expeditor
   */
  public static getFromName(): string {
    return this.fromName;
  }

  /**
   * Verifică dacă putem trimite un email unui utilizator în funcție de rata de limitare
   * @param email Email-ul destinatarului
   * @param emailType Tipul de email (message, request, review)
   * @returns true dacă putem trimite emailul, false dacă rata a fost depășită
   */
  private static checkRateLimit(email: string, emailType: string): boolean {
    // Ofertele acceptate sunt trimise imediat, fără rate limiting
    if (emailType === 'offer_accepted') {
      console.log(`✅ [Rate limiting] Ofertele acceptate nu sunt supuse limitării de frecvență.`);
      return true;
    }

    console.log(`🔍 [Rate limiting DEBUG] Verificare pentru ${email} (tip: ${emailType})`);

    // Inițializăm cache-ul dacă nu există
    if (!this._emailRateLimit) {
      this._emailRateLimit = new Map<string, EmailRateLimitEntry>();
      console.log(`✅ [Rate limiting] Inițializare cache rate limiting`);
    }

    const now = Date.now();

    // Folosim doar emailul ca și cheie pentru a limita toate tipurile de notificări per utilizator
    // Acest lucru asigură că un utilizator nu primește mai mult de un email la fiecare 30 minute
    // indiferent de tipul notificării (mesaj, cerere, recenzie)
    const key = email.toLowerCase(); // Normalizăm email-ul pentru a evita probleme cu majuscule/minuscule
    const lastEmail = this._emailRateLimit.get(key);

    // Verificăm conținutul cache-ului înainte de decizie
    console.log(`🔍 [Rate limiting DEBUG] Conținut cache pentru ${key}:`, lastEmail ? 
      JSON.stringify(lastEmail) : "Nu există intrare în cache");

    console.log(`🔍 [Rate limiting] Verificare pentru ${email} (tip: ${emailType})`);
    if (lastEmail) {
      const timeSinceLast = now - lastEmail.timestamp;
      const minutesSinceLast = Math.floor(timeSinceLast / 60000);
      const secondsSinceLast = Math.floor((timeSinceLast % 60000) / 1000);
      
      console.log(`🔍 [Rate limiting] Ultimul email trimis la: ${new Date(lastEmail.timestamp).toLocaleTimeString()}`);
      console.log(`🔍 [Rate limiting] Tip precedent: ${lastEmail.emailType}`);
      console.log(`🔍 [Rate limiting] Timp de la ultimul email: ${minutesSinceLast} minute și ${secondsSinceLast} secunde`);
      console.log(`🔍 [Rate limiting] Perioadă de limitare: ${this.RATE_LIMIT_PERIOD/60000} minute`);
      
      // Verificăm dacă perioada de limitare a trecut
      if ((now - lastEmail.timestamp) <= this.RATE_LIMIT_PERIOD) {
        // Calculăm timpul rămas până la expirarea perioadei de limitare
        const minutesLeft = Math.ceil((this.RATE_LIMIT_PERIOD - (now - lastEmail.timestamp)) / 60000);
        console.log(`🛑 [Rate limiting] Email BLOCAT pentru ${email} (tip: ${emailType}) - următorul email permis în ${minutesLeft} minute`);
        return false;
      }
    }

    // Dacă ajungem aici, înseamnă că putem trimite email (fie nu există un email anterior, 
    // fie perioada de limitare a trecut)
    
    // Actualizăm imediat cache-ul pentru a preveni trimiteri duplicate în cazul apelurilor concurente
    this._emailRateLimit.set(key, { 
      timestamp: now, 
      emailType: emailType
    });
    
    console.log(`✅ [Rate limiting] Email PERMIS pentru ${email} (tip: ${emailType})`);
    console.log(`✅ [Rate limiting DEBUG] Cache actualizat pentru ${key} la timestamp ${now}`);
    
    // Afișăm starea cache-ului după actualizare
    console.log(`📊 [Rate limiting DEBUG] Dimensiune cache după actualizare: ${this._emailRateLimit.size}`);
    
    return true;
  }

  /**
   * Actualizează cache-ul de rate limiting pentru un email trimis
   * @param email Email-ul destinatarului 
   * @param emailType Tipul de email
   */
  private static updateRateLimit(email: string, emailType: string): void {
    // Ofertele acceptate nu sunt supuse rate limiting-ului
    if (emailType === 'offer_accepted') {
      console.log(`⏩ [Rate limiting] Actualizare cache ignorată pentru ofertă acceptată`);
      return;
    }

    // Verificăm că avem cache-ul inițializat
    if (!this._emailRateLimit) {
      this._emailRateLimit = new Map<string, EmailRateLimitEntry>();
      console.log(`🔄 [Rate limiting] Inițializare cache rate limiting în updateRateLimit`);
    }

    // Actualizăm cache-ul cu timestamp-ul curent
    const key = email.toLowerCase(); // Normalizăm email-ul pentru consistență
    const timestamp = Date.now();
    
    console.log(`📝 [Rate limiting] ÎNAINTE DE ACTUALIZARE - Cache pentru ${key}:`, 
                this._emailRateLimit.has(key) ? JSON.stringify(this._emailRateLimit.get(key)) : "Nu există");
    
    // Stocare în cache
    this._emailRateLimit.set(key, {
      timestamp: timestamp,
      emailType: emailType
    });
    
    console.log(`📝 [Rate limiting] DUPĂ ACTUALIZARE - Cache pentru ${key}:`, 
                JSON.stringify(this._emailRateLimit.get(key)));
    
    console.log(`📝 [Rate limiting] Cache actualizat pentru ${email}. Următorul email permis după: ${new Date(timestamp + this.RATE_LIMIT_PERIOD).toLocaleTimeString()}`);

    // Afișăm starea actuală a cache-ului pentru debugging
    console.log(`📊 [Rate limiting] Număr total de intrări în cache: ${this._emailRateLimit.size}`);
    
    // Afișăm toate intrările din cache pentru debugging
    console.log(`📊 [Rate limiting] Conținut complet cache:`);
    this._emailRateLimit.forEach((entry, emailKey) => {
      const timeAgo = Math.floor((Date.now() - entry.timestamp) / 60000);
      console.log(`   - ${emailKey}: acum ${timeAgo} minute, tip: ${entry.emailType}`);
    });

    // Curățare automată cache pentru a preveni memory leak
    if (this._emailRateLimit.size > 1000) {
      console.log(`🧹 [Rate limiting] Curățare cache (>1000 intrări)`);
      const keysToDelete = [];
      const cacheTimeout = Date.now() - this.RATE_LIMIT_PERIOD;

      // Identificăm intrările vechi
      this._emailRateLimit.forEach((entry, key) => {
        if (entry.timestamp < cacheTimeout) {
          keysToDelete.push(key);
        }
      });

      // Ștergem intrările vechi
      keysToDelete.forEach(key => this._emailRateLimit.delete(key));
      console.log(`🧹 [Rate limiting] ${keysToDelete.length} intrări vechi eliminate`);
    }
  }

  /**
   * Metoda generală de trimitere email - DIRECT către API
   * Această metodă trimite emailuri direct către API fără manipulare suplimentară a subiectului
   * pentru a evita orice posibilitate de injectare a ID-urilor în subiect
   */
  private static async sendDirectEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    try {
      console.log(`📧 Trimitere directă email către: ${to}`);
      console.log(`📧 Subiect original: "${subject}"`);

      // Verifică API key
      if (!this.apiKey) {
        console.error("❌ API key pentru Elastic Email nu este configurat!");
        return false;
      }

      // Construiește parametrii pentru API
      const params = new URLSearchParams();
      params.append("apikey", this.apiKey);
      params.append("from", this.fromEmail);
      params.append("fromName", this.fromName);
      params.append("to", to);
      params.append("subject", subject);
      params.append("bodyHtml", htmlContent);

      if (textContent) {
        params.append("bodyText", textContent);
      }

      // Trimite cererea direct la API
      const response = await fetch(`${this.baseUrl}/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-ElasticEmail-ApiKey": this.apiKey,
        },
        body: params,
      });

      // Verifică răspunsul
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Email trimis cu succes către ${to}`);
          return true;
        } else {
          console.error(
            `❌ Eroare la trimiterea email-ului: ${data.error || "Eroare necunoscută"}`,
          );
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ Eroare HTTP ${response.status}: ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Excepție la trimiterea email-ului: ${error}`);
      return false;
    }
  }

  /**
   * Trimite un email folosind Elastic Email API
   * @param to Adresa email destinatar
   * @param subject Subiectul email-ului
   * @param htmlContent Conținutul HTML al email-ului
   * @param textContent Conținutul text al email-ului (opțional)
   * @param messageId ID unic pentru email (opțional, pentru prevenirea duplicatelor)
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    messageId?: string,
  ): Promise<boolean> {
    try {
      console.log(`📧 Începere trimitere email către: ${to}`);

      // =====================================================================
      // HARDCODĂM SUBIECTE SIGURE - INTERVENȚIE DE URGENȚĂ ÎMPOTRIVA ID-URILOR
      // =====================================================================
      let safeSubject = "Notificare Carvizio";

      // Verificăm categoriile de subiecte și atribuim valori sigure, fără variabile
      if (subject.includes("Cerere nouă")) {
        safeSubject = "Cerere nouă";
      } else if (subject.includes("Ofertă")) {
        safeSubject = "Ofertă servicii auto";
      } else if (subject.includes("Mesaj")) {
        safeSubject = "Mesaj nou primit";
      } else if (subject.includes("Recenzie")) {
        safeSubject = "Recenzie nouă primită";
      }

      // Afișăm subiectul original versus cel hardcodat pentru debugging
      console.log(`📧 Subiect original: "${subject}"`);
      console.log(`📧 Subiect HARDCODAT sigur: "${safeSubject}"`);

      // Verificăm API key-ul
      if (!this.apiKey) {
        console.error("API key pentru Elastic Email nu este configurat!");
        return false;
      }

      // Construim payload-ul pentru API cu subiectul HARDCODAT
      const payload: EmailPayload = {
        To: to,
        From: this.fromEmail,
        FromName: this.fromName,
        Subject: safeSubject, // Folosim DOAR subiectul hardcodat
        BodyHTML: htmlContent,
      };

      // Adăugăm conținutul text dacă este furnizat
      if (textContent) {
        payload.BodyText = textContent;
      }

      // Construim parametrii pentru API
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        params.append(key.toLowerCase(), value);
      });
      params.append("apikey", this.apiKey);

      // Trimitem cererea către API
      const response = await fetch(`${this.baseUrl}/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-ElasticEmail-ApiKey": this.apiKey,
        },
        body: params,
      });

      // Verificăm răspunsul
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(
            `✅ Email trimis cu succes către ${to} - Subject: ${safeSubject}`,
          );
          return true;
        } else {
          console.error(
            `❌ Eroare la trimiterea email-ului către ${to}:`,
            data.error || "Eroare necunoscută de la API",
          );
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error(
          `❌ Eroare HTTP ${response.status} la trimiterea email-ului către ${to}:`,
          errorText,
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Excepție la trimiterea email-ului către ${to}:`, error);
      if (error instanceof Error) {
        console.error(`Detalii eroare: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Trimite o notificare prin email pentru o nouă cerere
   * @param serviceProvider Furnizorul de servicii care primește notificarea
   * @param requestTitle Titlul cererii
   * @param clientName Numele clientului care a creat cererea
   * @returns Promise care indică succesul sau eșecul trimiterii
   */
  public static async sendNewRequestNotification(
    serviceProvider: any,
    requestTitle: string,
    clientName: string,
    requestId: string | number = `internal_request_${Date.now()}`,
  ): Promise<boolean> {
    try {
      console.log(
        `\n🔔 ===== TRIMITERE NOTIFICARE EMAIL PENTRU CERERE NOUĂ =====`,
      );

      // Validăm și normalizăm datele serviceProvider pentru a evita erorile
      if (!serviceProvider) {
        console.error(
          `❌ EmailService.sendNewRequestNotification - serviceProvider este null sau undefined`,
        );
        return false;
      }

      // Verificăm dacă serviceProvider este șir de caractere (eroare posibilă)
      if (typeof serviceProvider === "string") {
        console.error(
          `❌ EmailService.sendNewRequestNotification - serviceProvider este șir de caractere în loc de obiect: "${serviceProvider}"`,
        );
        return false;
      }

      // Normalizăm numele companiei (verificăm toate formatele posibile)
      const companyName =
        serviceProvider.companyName ||
        serviceProvider.company_name ||
        "Service Auto";

      // Verificăm dacă avem un email valid
      if (!serviceProvider.email) {
        console.error(
          `❌ EmailService.sendNewRequestNotification - Email lipsă pentru service provider`,
          serviceProvider,
        );
        return false;
      }

      // Validăm formatul de email
      if (
        typeof serviceProvider.email !== "string" ||
        !serviceProvider.email.includes("@")
      ) {
        console.error(
          `❌ EmailService.sendNewRequestNotification - Email invalid pentru service provider: "${serviceProvider.email}"`,
        );
        return false;
      }

      // Logare extinsă pentru diagnosticare completă
      console.log(`📧 Detalii notificare:`);
      console.log(`   • Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`   • Client: ${clientName}`);
      console.log(`   • Titlu cerere: ${requestTitle}`);

      // Verificăm rata de limitare pentru acest email
      if (!this.checkRateLimit(serviceProvider.email, 'request')) {
        console.log(`⏳ Trimitere email amânată din cauza rate limiting pentru ${serviceProvider.email}`);
        return true; // Returnăm true pentru a nu afecta funcționalitatea existentă
      }

      // =====================================================================
      // IMPORTANT - SUBIECT HARD-CODED FĂRĂ NICIUN ID SAU REFERINȚĂ DINAMICĂ
      // =====================================================================
      const FIXED_SUBJECT = "Cerere nouă";

      console.log(
        `✅ SUBIECT FORȚAT STATIC (FĂRĂ VARIABILE): "${FIXED_SUBJECT}"`,
      );

      // Template HTML îmbunătățit pentru notificarea prin email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Cerere nouă</h2>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Bună ziua, <strong>${companyName}</strong>,</p>
            <p style="font-size: 16px;">Aveți o cerere nouă de la clientul <strong>${clientName}</strong>:</p>
            <div style="background-color: #f7fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #4f46e5;">${requestTitle}</h3>
            </div>
            <p style="font-size: 16px;">Puteți vizualiza detaliile complete ale cererii și răspunde din contul dvs.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://carvizio.ro/service-dashboard" 
                 style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
                Vezi cererea
              </a>
            </div>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
                Acest email a fost trimis automat de aplicația Carvizio.ro.
              </p>
              <p style="color: #718096; font-size: 14px; margin-top: 0;">
                Puteți dezactiva notificările prin email din 
                <a href="https://carvizio.ro/service-dashboard" style="color: #4f46e5; text-decoration: none;">
                  setările contului dvs
                </a>.
              </p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.</p>
          </div>
        </div>
      `;

      // Conținut text simplu pentru clienții de email care nu suportă HTML
      const text = `
  Cerere nouă

  Bună ziua, ${companyName},

  Aveți o cerere nouă de la clientul ${clientName}:

  ${requestTitle}

  Puteți vizualiza detaliile complete ale cererii și răspunde accesând: 
  https://carvizio.ro/service-dashboard

  Acest email a fost trimis automat de aplicația Carvizio.ro.
  Puteți dezactiva notificările prin email din setările contului dvs.

  © ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.
      `;

      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          `❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`,
        );
        return false;
      }

      console.log(`🔄 TRIMITERE EMAIL CU SUBIECT FIX: "${FIXED_SUBJECT}"`);

      // Folosim metoda de trimitere directă pentru a ne asigura că nu se modifică subiectul
      const result = await this.sendDirectEmail(
        serviceProvider.email,
        FIXED_SUBJECT,
        html,
        text,
      );

      if (result) {
        console.log(`✅ Email trimis cu succes către ${serviceProvider.email}`);
        console.log(`✅ Subiect utilizat: "${FIXED_SUBJECT}"`);

        // Actualizăm cache-ul de rate limiting
        this.updateRateLimit(serviceProvider.email, 'request');
      } else {
        console.error(
          `❌ Eroare la trimiterea email-ului către ${serviceProvider.email}`,
        );
      }

      console.log(
        `🔔 ===== SFÂRȘIT NOTIFICARE EMAIL PENTRU CERERE NOUĂ =====\n`,
      );
      return result;
    } catch (error) {
      console.error(`❌ Excepție fatală la trimiterea email-ului:`, error);
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
    serviceProvider: any,
    offerTitle: string,
    clientName: string,
    offerId: string | number = `offer_${Date.now()}`,
  ): Promise<boolean> {
    // Adăugăm un ID de execuție unic pentru trimitere și logging
    const uniqueExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Generăm un ID unic pentru deduplicare
    const messageSignature = `offer_accepted_${serviceProvider?.id || serviceProvider?.email}_${offerId}_${Date.now()}`;
    
    console.log(`\n🔔 ===== TRIMITERE NOTIFICARE EMAIL PENTRU OFERTĂ ACCEPTATĂ [${uniqueExecutionId}] =====`);
    console.log(`📝 ID Execuție: ${uniqueExecutionId}`);
    console.log(`📝 Signature: ${messageSignature}`);
    
    // CONTROL STRICT ANTI-DUPLICARE: Similar cu alte metode de notificare
    if (!this._sentMessageIds) {
      this._sentMessageIds = new Map<string, number>();
      console.log(`✅ [Anti-duplicare] Inițializare cache prevenire duplicare email-uri`);
    }
    
    // Verificăm dacă am trimis deja un email similar foarte recent
    const now = Date.now();
    const lastSentTime = this._sentMessageIds.get(messageSignature);
    const DUPLICATE_PREVENTION_WINDOW = 120000; // 2 minute
    
    if (lastSentTime && now - lastSentTime < DUPLICATE_PREVENTION_WINDOW) {
      const secondsAgo = Math.round((now - lastSentTime) / 1000);
      console.log(`\n🛑 BLOCARE DUPLICARE: Email pentru ofertă acceptată către ${serviceProvider?.email} deja trimis acum ${secondsAgo} secunde.`);
      console.log(`🔒 Signature: ${messageSignature}`);
      console.log(`⏭️ Email blocat pentru prevenirea duplicării.`);
      return true; // Simulăm succes pentru a nu întrerupe fluxul aplicației
    }
    
    try {
      // Validăm și normalizăm datele serviceProvider pentru a evita erorile
      if (!serviceProvider) {
        console.error(
          `❌ EmailService.sendOfferAcceptedNotification - serviceProvider este null sau undefined`,
        );
        return false;
      }

      // Normalizăm numele companiei (verificăm toate formatele posibile)
      const companyName =
        serviceProvider.companyName ||
        serviceProvider.company_name ||
        "Service Auto";

      // Validăm și normalizăm email-ul
      if (!serviceProvider.email || !serviceProvider.email.includes("@")) {
        console.error(
          `❌ EmailService.sendOfferAcceptedNotification - Email invalid pentru service provider: "${serviceProvider.email}"`,
        );
        return false;
      }

      console.log(
        `=== EmailService.sendOfferAcceptedNotification - Trimitere notificare ofertă acceptată ===`,
      );
      console.log(`Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`Client: ${clientName}`);
      console.log(`Titlu ofertă: ${offerTitle}`);
      
      // Notă: Ofertele acceptate sunt notificări CRITICE și sunt trimise indiferent de rate limiting
      // Însă înregistrăm în rate limit cache pentru consistență
      console.log(`✅ [Rate limiting] Notificările de oferte acceptate sunt considerate CRITICE și trimise imediat.`);
      
      // Înregistrăm ID-ul mesajului în cache pentru prevenirea duplicării
      this._sentMessageIds.set(messageSignature, now);
      console.log(`🔐 [Anti-duplicare] Înregistrat ID ofertă acceptată: ${messageSignature}`);

      const FIXED_SUBJECT = "Ofertă acceptată";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #38a169;">Ofertă acceptată</h2>
          <p>Bună ziua, ${companyName},</p>
          <p>Clientul <strong>${clientName}</strong> a acceptat oferta dumneavoastră:</p>
          <div style="background-color: #f7fafc; border-left: 4px solid #38a169; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${offerTitle}</strong></p>
          </div>
          <p>Puteți contacta clientul și continua procesul.</p>
          <p>
            <a href="https://carvizio.ro/service-dashboard" 
              style="background-color: #38a169; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Vezi oferta acceptată
            </a>
          </p>
          <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
            Acest email a fost trimis automat de aplicația Carvizio.ro.
            <br>
            Puteți dezactiva notificările prin email din setările contului dvs.
          </p>
        </div>
      `;

      const text = `
        Ofertă acceptată
        
        Bună ziua, ${companyName},
        
        Clientul ${clientName} a acceptat oferta dumneavoastră: ${offerTitle}
        
        Puteți contacta clientul și continua procesul.
        
        Pentru a vedea oferta acceptată, accesați: https://carvizio.ro/service-dashboard
        
        Cu stimă,
        Echipa Carvizio
      `;

      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          `❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`,
        );
        return false;
      }

      // Trimitem email-ul folosind metoda de trimitere directă
      const result = await this.sendDirectEmail(
        serviceProvider.email,
        FIXED_SUBJECT,
        html,
        text
      );

      if (result) {
        console.log(
          `✅ EmailService.sendOfferAcceptedNotification - Email trimis cu succes către ${serviceProvider.email}`,
        );
        
        // Actualizăm cache-ul de rate limiting - chiar dacă nu aplicăm limitarea, înregistrăm pentru logging complet
        this.updateRateLimit(serviceProvider.email, 'offer_accepted');
      } else {
        console.error(
          `❌ EmailService.sendOfferAcceptedNotification - Eșec la trimiterea email-ului către ${serviceProvider.email}`,
        );
        // Ștergem din cache în caz de eșec
        this._sentMessageIds.delete(messageSignature);
      }

      console.log(
        `🔔 ===== SFÂRȘIT NOTIFICARE EMAIL PENTRU OFERTĂ ACCEPTATĂ [${uniqueExecutionId}] =====\n`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendOfferAcceptedNotification - Eroare la trimiterea email-ului către ${serviceProvider.email}:`,
        error,
      );

      // Adăugăm detalii despre eroare pentru debugging
      if (error instanceof Error) {
        console.error(`❌ Detalii eroare: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
      }

      // Ștergem din cache în caz de eroare
      this._sentMessageIds.delete(messageSignature);

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
    serviceProvider: any,
    messageContent: string,
    senderName: string,
    requestOrOfferTitle: string,
    messageId: string = `message_${Date.now()}`,
  ): Promise<boolean> {
    // CONTROL STRICT ANTI-DUPLICARE: Folosim email+messageId+timestamp ca semnătură unică
    if (!this._sentMessageIds) {
      this._sentMessageIds = new Map<string, number>();
      console.log(
        `✅ [Anti-duplicare] Inițializare cache prevenire duplicare email-uri`,
      );
    }

    // IMPORTANT: Includerea messageId original în semnătură
    // Acest id ar trebui să fie unic per mesaj în baza de date
    const messageSignature = `MSG_${serviceProvider.email}_${messageId}`;

    // Verificăm dacă am trimis deja acest mesaj specific (cache cu păstrare mai lungă - 2 minute)
    const now = Date.now();
    const lastSentTime = this._sentMessageIds.get(messageSignature);
    const DUPLICATE_PREVENTION_WINDOW = 120000; // 2 minute

    if (lastSentTime && now - lastSentTime < DUPLICATE_PREVENTION_WINDOW) {
      const secondsAgo = Math.round((now - lastSentTime) / 1000);
      console.log(
        `\n🛑 BLOCARE DUPLICARE: Mesaj identic către ${serviceProvider.email} deja trimis acum ${secondsAgo} secunde.`,
      );
      console.log(`🔒 Signature: ${messageSignature}`);
      console.log(`⏭️ Email blocat pentru prevenirea duplicării.`);
      return true; // Simulăm succes pentru a nu întrerupe fluxul aplicației
    }

    // Adăugăm un ID de execuție unic pentru logging - nu afectează logica de cache
    const uniqueExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Înregistrăm în log începutul procesului
    console.log(
      `\n🔔 ===== TRIMITERE NOTIFICARE EMAIL PENTRU MESAJ NOU (SERVICE) [${uniqueExecutionId}] =====`,
    );
    console.log(`📝 ID Mesaj: ${messageId} | Execuție: ${uniqueExecutionId}`);

    try {
      // Validare robustă a datelor de intrare
      if (!serviceProvider) {
        console.error(
          `❌ EmailService.sendNewMessageNotification - serviceProvider este null sau undefined`,
        );
        return false;
      }

      // Verificăm dacă serviceProvider este șir de caractere (eroare posibilă)
      if (typeof serviceProvider === "string") {
        console.error(
          `❌ EmailService.sendNewMessageNotification - serviceProvider este șir de caractere în loc de obiect: "${serviceProvider}"`,
        );
        return false;
      }

      // Normalizăm numele companiei (verificăm toate formatele posibile)
      const companyName =
        serviceProvider.companyName ||
        serviceProvider.company_name ||
        "Service Auto";

      // Verificăm dacă avem un email valid
      if (!serviceProvider.email) {
        console.error(
          `❌ EmailService.sendNewMessageNotification - Email lipsă pentru service provider`,
          serviceProvider,
        );
        return false;
      }

      if (
        typeof serviceProvider.email !== "string" ||
        !serviceProvider.email.includes("@")
      ) {
        console.error(
          `❌ EmailService.sendNewMessageNotification - Email invalid pentru service provider: "${serviceProvider.email}"`,
        );
        return false;
      }

      // Logare extinsă pentru diagnosticare completă
      console.log(`📧 Detalii notificare:`);
      console.log(`   • Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`   • Expeditor: ${senderName}`);
      console.log(`   • Referitor la: ${requestOrOfferTitle}`);
      console.log(
        `   • Conținut mesaj: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}"`,
      );

      // Verificăm rata de limitare pentru acest email
      if (!this.checkRateLimit(serviceProvider.email, 'message')) {
        console.log(`⏳ Trimitere email pentru mesaj nou BLOCATĂ din cauza rate limiting pentru ${serviceProvider.email}`);

        // Ștergem mesajul din cache pentru a permite trimiterea la expirarea perioadei de rate limiting
        this._sentMessageIds.delete(messageSignature);

        // Notă: Răspundem cu succes pentru a nu afecta restul aplicației
        console.log(`🔔 ===== SFÂRȘIT NOTIFICARE EMAIL BLOCAT DE RATE LIMIT [${uniqueExecutionId}] =====\n`);
        return true;
      }

      // Dacă trecem de rate limiting, înregistrăm imediat ID-ul pentru a preveni procesare paralelă
      this._sentMessageIds.set(messageSignature, now);
      console.log(`🔐 [Anti-duplicare] Înregistrat ID mesaj: ${messageSignature}`);

      // Construim subiectul fără identificator în textul vizibil
      const FIXED_SUBJECT = "Mesaj nou primit";

      // Truncăm mesajul dacă este prea lung
      const truncatedMessage =
        messageContent.length > 150
          ? messageContent.substring(0, 147) + "..."
          : messageContent;

      // Template HTML îmbunătățit pentru notificarea prin email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #00aff5; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Mesaj nou</h2>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Bună ziua, <strong>${companyName}</strong>,</p>
            <p style="font-size: 16px;">Ați primit un mesaj nou de la <strong>${senderName}</strong> referitor la "${requestOrOfferTitle}":</p>
            <div style="background-color: #f7fafc; border-left: 4px solid #00aff5; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic;">"${truncatedMessage}"</p>
            </div>
            <p style="font-size: 16px;">Puteți vizualiza conversația completă și răspunde din contul dvs.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://carvizio.ro/service-dashboard" 
                 style="background-color: #00aff5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
                Vezi mesajele
              </a>
            </div>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
                Acest email a fost trimis automat de aplicația Carvizio.ro.
              </p>
              <p style="color: #718096; font-size: 14px; margin-top: 0;">
                Puteți dezactiva notificările prin email din 
                <a href="https://carvizio.ro/service-dashboard" style="color: #00aff5; text-decoration: none;">
                  setările contului dvs
                </a>.
              </p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.</p>
          </div>
        </div>
      `;

      // Conținut text simplu pentru clienții de email care nu suportă HTML
      const text = `
Mesaj nou de la ${senderName}

Bună ziua, ${companyName},

Ați primit un mesaj nou de la ${senderName} referitor la "${requestOrOfferTitle}":

"${truncatedMessage}"

Puteți vizualiza conversația completă și răspunde accesând: 
https://carvizio.ro/service-dashboard

Acest email a fost trimis automat de aplicația Carvizio.ro.
Puteți dezactiva notificările prin email din setările contului dvs.

© ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.
      `;

      console.log(`🔄 Verificare API key Elastic Email...`);
      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          `❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`,
        );
        this._sentMessageIds.delete(messageSignature);
        return false;
      }

      console.log(
        `🔄 [${uniqueExecutionId}] Trimitere email pentru mesaj nou către: ${serviceProvider.email}`,
      );

      const startTime = Date.now();

      // Folosim metoda de trimitere directă pentru a ne asigura că nu se modifică subiectul
      const emailResult = await this.sendDirectEmail(
        serviceProvider.email,
        FIXED_SUBJECT,
        html,
        text,
      );

      const endTime = Date.now();

      console.log(`⏱️ Durata trimitere email: ${endTime - startTime}ms`);
      console.log(
        `📊 Rezultat trimitere email: ${emailResult ? "SUCCESS" : "FAILURE"}`,
      );

      if (emailResult) {
        console.log(
          `✅ Email trimis cu succes către ${serviceProvider.email} pentru mesajul ${uniqueExecutionId}`,
        );

        // Actualizăm cache-ul de rate limiting
        this.updateRateLimit(serviceProvider.email, 'message');

        // Curățare automată cache pentru a preveni memory leak
        if (this._sentMessageIds.size > 1000) {
          console.log(`🧹 [Anti-duplicare] Curățare cache (>1000 intrări)`);

          const keysToDelete = [];
          const cacheTimeout = now - DUPLICATE_PREVENTION_WINDOW;

          // Identificăm intrările vechi
          this._sentMessageIds.forEach((timestamp, key) => {
            if (timestamp < cacheTimeout) {
              keysToDelete.push(key);
            }
          });
          // Ștergem intrările vechi
          keysToDelete.forEach((key) => this._sentMessageIds.delete(key));
          console.log(
            `🧹 [Anti-duplicare] ${keysToDelete.length} intrări vechi eliminate`,
          );
        }
      } else {
        console.error(
          `❌ Eșec la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${uniqueExecutionId}`,
        );
        // Eliminăm mesajul din cache în caz de eșec pentru a permite reîncercarea
        this._sentMessageIds.delete(messageSignature);
      }

      console.log(
        `🔔 ===== SFÂRȘIT NOTIFICARE EMAIL PENTRU MESAJ NOU (SERVICE) [${uniqueExecutionId}] =====\n`,
      );
      return emailResult;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewMessageNotification [${uniqueExecutionId}] - Eroare generală:`,
        error,
      );

      // Adăugăm detalii despre eroare pentru debugging
      if (error instanceof Error) {
        console.error(`❌ Detalii eroare: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
      }

      // IMPORTANT: Eliminăm mesajul din cache în caz de eroare pentru a permite reîncercarea
      this._sentMessageIds.delete(messageSignature);
      console.log(
        `🔓 [Anti-duplicare] Cache eliberat pentru ID: ${messageSignature} după eroare`,
      );

      console.log(
        `🔔 ===== SFÂRȘIT NOTIFICARE EMAIL PENTRU MESAJ NOU (SERVICE) CU EROARE [${uniqueExecutionId}] =====\n`,
      );
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
    serviceProvider: any,
    clientName: string,
    rating: number,
    reviewContent: string,
    reviewId: string | number = `review_${Date.now()}`,
  ): Promise<boolean> {
    try {
      // Validăm și normalizăm datele serviceProvider pentru a evita erorile
      if (!serviceProvider) {
        console.error(
          `❌ EmailService.sendNewReviewNotification - serviceProvider este null sau undefined`,
        );
        return false;
      }

      // Normalizăm numele companiei (verificăm toate formatele posibile)
      const companyName =
        serviceProvider.companyName ||
        serviceProvider.company_name ||
        "Service Auto";

      // Validăm și normalizăm email-ul
      if (!serviceProvider.email || !serviceProvider.email.includes("@")) {
        console.error(
          `❌ EmailService.sendNewReviewNotification - Email invalid pentru service provider: "${serviceProvider.email}"`,
        );
        return false;
      }

      console.log(
        `=== EmailService.sendNewReviewNotification - Trimitere notificare recenzie nouă ===`,
      );
      console.log(`Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`Client: ${clientName}`);
      console.log(`Rating: ${rating}/5`);
      console.log(
        `Conținut recenzie (primele 50 caractere): ${reviewContent?.substring(0, 50)}${reviewContent?.length > 50 ? "..." : ""}`,
      );

      // Verificăm rata de limitare pentru acest email
      if (!this.checkRateLimit(serviceProvider.email, 'review')) {
        console.log(`⏳ Trimitere email pentru recenzie nouă amânată din cauza rate limiting pentru ${serviceProvider.email}`);
        return true; // Returnăm true pentru a nu afecta funcționalitatea existentă
      }

      const FIXED_SUBJECT = "Recenzie nouă primită";

      // Generăm stele pentru rating
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

      // Verificăm dacă reviewContent există și apoi truncăm
      let truncatedReview = "";
      if (reviewContent) {
        truncatedReview =
          reviewContent.length > 200
            ? reviewContent.substring(0, 197) + "..."
            : reviewContent;
      } else {
        truncatedReview = "(Fără text recenzie)";
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Recenzie nouă</h2>
          <p>Bună ziua, ${companyName},</p>
          <p>Ați primit o recenzie nouă de la <strong>${clientName}</strong>:</p>
          <div style="background-color: #f7fafc; border-left: 4px solid #d69e2e; padding: 15px; margin: 20px 0;">
            <p style="color: #d69e2e; font-size: 1.2em; margin: 0 0 10px 0;">${stars} (${rating}/5)</p>
            <p style="margin: 0; font-style: italic;">"${truncatedReview}"</p>
          </div>
          <p>Puteți vizualiza toate recenziile din contul dvs.</p>
          <p>
            <a href="https://carvizio.ro/service-dashboard" 
               style="background-color: #d69e2e; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Vezi recenziile
            </a>
          </p>
          <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
            Acest email a fost trimis automat de aplicația Carvizio.ro.
            <br>
            Puteți dezactiva notificările prin email din setările contului dvs.
          </p>
        </div>
      `;

      console.log(
        `🔄 Trimitere email pentru recenzie nouă către: ${serviceProvider.email}`,
      );

      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          `❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`,
        );
        return false;
      }

      // Trimitem email-ul folosind metoda de trimitere directă
      const result = await this.sendDirectEmail(
        serviceProvider.email,
        FIXED_SUBJECT,
        html,
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewReviewNotification - Email trimis cu succes către ${serviceProvider.email}`,
        );

        // Actualizăm cache-ul de rate limiting
        this.updateRateLimit(serviceProvider.email, 'review');
      } else {
        console.error(
          `❌ EmailService.sendNewReviewNotification - Eșec la trimiterea email-ului către ${serviceProvider.email}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewReviewNotification - Eroare la trimiterea email-ului către ${serviceProvider.email}:`,
        error,
      );

      // Adăugăm detalii despre eroare pentru debugging
      if (error instanceof Error) {
        console.error(`❌ Detalii eroare: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
      }

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
    messageId: string = `message_client_${Date.now()}`,
  ): Promise<boolean> {
    // CONTROL ANTI-DUPLICARE: Inițializăm cache-ul dacă nu există
    if (!this._sentMessageIds) {
      this._sentMessageIds = new Map<string, number>();
      console.log(
        `✅ [Anti-duplicare] Inițializare cache prevenire duplicare email-uri (client)`,
      );
    }

    // Semnătură unică pentru control anti-duplicare
    const messageSignature = `MSG_CLIENT_${client.email}_${messageId}`;

    // Verificăm dacă am trimis deja acest mesaj
    const now = Date.now();
    const lastSentTime = this._sentMessageIds.get(messageSignature);
    const DUPLICATE_PREVENTION_WINDOW = 120000; // 2 minute

    if (lastSentTime && now - lastSentTime < DUPLICATE_PREVENTION_WINDOW) {
      const secondsAgo = Math.round((now - lastSentTime) / 1000);
      console.log(
        `\n🛑 BLOCARE DUPLICARE CLIENT: Mesaj identic către ${client.email} deja trimis acum ${secondsAgo} secunde.`,
      );
      console.log(`🔒 Signature: ${messageSignature}`);
      console.log(`⏭️ Email blocat pentru prevenirea duplicării.`);
      return true; // Simulăm succes pentru a nu întrerupe fluxul aplicației
    }

    // ID execuție unic pentru logging
    const uniqueExecutionId = `exec_client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      console.log(
        `\n💬 ===== TRIMITERE NOTIFICARE EMAIL PENTRU MESAJ NOU (CLIENT) [${uniqueExecutionId}] =====`,
      );
      console.log(`📧 Destinatar: ${client.name} (${client.email})`);
      console.log(`📤 Expeditor: ${senderName}`);
      console.log(`📌 Referitor la: ${requestOrOfferTitle}`);
      console.log(`🔢 ID Mesaj: ${messageId}`);
      console.log(
        `📝 Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}`,
      );

      // Verificăm rata de limitare pentru acest email
      if (!this.checkRateLimit(client.email, 'message_client')) {
        console.log(`⏳ Trimitere email pentru mesaj nou către client BLOCATĂ din cauza rate limiting pentru ${client.email}`);

        // Nu marcăm mesajul ca trimis în acest caz
        console.log(`🔔 ===== SFÂRȘIT NOTIFICARE EMAIL CLIENT BLOCAT DE RATE LIMIT [${uniqueExecutionId}] =====\n`);
        return true; // Returnăm true pentru a nu afecta funcționalitatea existentă
      }

      // Dacă trecem de rate limiting, înregistrăm ID-ul pentru a preveni procesare paralelă
      this._sentMessageIds.set(messageSignature, now);
      console.log(`🔐 [Anti-duplicare CLIENT] Înregistrat ID mesaj: ${messageSignature}`);

      const FIXED_SUBJECT = "Mesaj nou primit";

      // Truncăm mesajul dacă este prea lung
      const truncatedMessage =
        messageContent.length > 150
          ? messageContent.substring(0, 147) + "..."
          : messageContent;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #00aff5; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Mesaj nou</h2>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Bună ziua, ${client.name},</p>
            <p style="font-size: 16px;">Ați primit un mesaj nou de la <strong>${senderName}</strong> referitor la "${requestOrOfferTitle}":</p>
            <div style="background-color: #f7fafc; border-left: 4px solid #00aff5; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-style: italic;">"${truncatedMessage}"</p>
            </div>
            <p style="font-size: 16px;">Puteți vizualiza conversația completă și răspunde din contul dvs.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://carvizio.ro/dashboard" 
                 style="background-color: #00aff5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
                Vezi mesajele
              </a>
            </div>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
                Acest email a fost trimis automat de aplicația Carvizio.ro.
              </p>
              <p style="color: #718096; font-size: 14px; margin-top: 0;">
                Puteți dezactiva notificările prin email din 
                <a href="https://carvizio.ro/dashboard" style="color: #00aff5; text-decoration: none;">
                  setările contului dvs
                </a>.
              </p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.</p>
          </div>
        </div>
      `;

      const text = `
Mesaj nou de la ${senderName}

Bună ziua, ${client.name},

Ați primit un mesaj nou de la ${senderName} referitor la "${requestOrOfferTitle}":

"${truncatedMessage}"

Puteți vizualiza conversația completă și răspunde accesând: 
https://carvizio.ro/dashboard

Acest email a fost trimis automat de aplicația Carvizio.ro.
Puteți dezactiva notificările prin email din setările contului dvs.

© ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.
      `;

      // Verificăm API key
      console.log(`🔄 Verificare API key Elastic Email pentru client...`);
      if (!this.apiKey) {
        console.error(`❌ API key pentru Elastic Email nu este configurat!`);
        this._sentMessageIds.delete(messageSignature);
        return false;
      }

      console.log(
        `🔄 [${uniqueExecutionId}] Trimitere email pentru mesaj nou către client: ${client.email}`,
      );

      // Trimitem emailul folosind metoda de trimitere directă
      const startTime = Date.now();
      const result = await this.sendDirectEmail(
        client.email,
        FIXED_SUBJECT,
        html,
        text,
      );
      const endTime = Date.now();

      console.log(
        `⏱️ Durata trimitere email către client: ${endTime - startTime}ms`,
      );
      console.log(
        `📊 Rezultat trimitere email către client: ${result ? "SUCCESS" : "FAILURE"}`,
      );

      if (result) {
        console.log(`✅ Email trimis cu succes către client ${client.email}`);

        // Actualizăm cache-ul de rate limiting
        this.updateRateLimit(client.email, 'message_client');
      } else {
        console.error(
          `❌ Eșec la trimiterea email-ului către client ${client.email}`,
        );
        this._sentMessageIds.delete(messageSignature);
      }

      console.log(
        `🔔 ===== SFÂRȘIT NOTIFICARE EMAIL PENTRU MESAJ NOU (CLIENT) [${uniqueExecutionId}] =====\n`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewMessageNotificationToClient - Eroare generală:`,
        error,
      );

      if (error instanceof Error) {
        console.error(`❌ Detalii eroare: ${error.message}`);
        console.error(`❌ Stack trace: ${error.stack}`);
      }

      // Eliminăm mesajul din cache în caz de eroare
      this._sentMessageIds.delete(messageSignature);
      console.log(
        `🔓 [Anti-duplicare CLIENT] Cache eliberat pentru ID: ${messageSignature} după eroare`,
      );

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
    offerId: string = `offer_${Date.now()}`,
  ): Promise<boolean> {
    try {
      console.log(
        `\n📋 === EmailService.sendNewOfferNotificationToClient - Trimitere notificare ofertă nouă către CLIENT ===`,
      );
      console.log(`📧 Destinatar: ${client.name} (${client.email})`);
      console.log(`📤 Service Provider: ${providerName}`);
      console.log(`📌 Titlu ofertă: ${offerTitle}`);
      console.log(`📝 Cerere originală: ${requestTitle}`);

      // Verificăm rata de limitare pentru acest email
      if (!this.checkRateLimit(client.email, 'offer_new')) {
        console.log(`⏳ Trimitere email pentru ofertă nouă către client amânată din cauza rate limiting pentru ${client.email}`);
        return true; // Returnăm true pentru a nu afecta funcționalitatea existentă
      }

      const FIXED_SUBJECT = "Ofertă nouă primită";

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
              <a href="https://carvizio.ro/dashboard" 
                 style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 16px;">
                Vezi oferta
              </a>
            </div>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #718096; font-size: 14px; margin-top: 0; margin-bottom: 5px;">
                Acest email a fost trimis automat de aplicația Carvizio.ro.
              </p>
              <p style="color: #718096; font-size: 14px; margin-top: 0;">
                Puteți dezactiva notificările prin email din 
                <a href="https://carvizio.ro/dashboard" style="color: #10b981; text-decoration: none;">
                  setările contului dvs
                </a>.
              </p>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Carvizio.ro. Toate drepturile rezervate.</p>
          </div>
        </div>
      `;

      // Trimitem email-ul folosind metoda de trimitere directă
      const result = await this.sendDirectEmail(
        client.email,
        FIXED_SUBJECT,
        html,
      );

      if (result) {
        console.log(`✅ Email trimis cu succes către client ${client.email}`);
        // Actualizăm cache-ul de rate limiting
        this.updateRateLimit(client.email, 'offer_new');
      } else {
        console.error(
          `❌ Eșec la trimiterea email-ului către client ${client.email}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `📋 EmailService.sendNewOfferNotificationToClient - Eroare la trimiterea email-ului către ${client.email}:`,
        error,
      );
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }

  /**
   * Trimite notificare pentru client că poate lăsa o recenzie
   * Această metodă este utilizată pentru a trimite un reminder către client
   * atunci când devine eligibil să lase o recenzie pentru un service
   * după ce serviciul a fost prestat (data preferată a trecut)
   * @param client Obiectul client care va primi notificarea
   * @param serviceProviderName Numele service-ului provider
   * @param offerTitle Titlul ofertei pentru care poate lăsa recenzie
   * @param serviceProfileLink Link-ul către profilul service provider-ului
   * @param offerId ID-ul ofertei (pentru prevenirea duplicării)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  public static async sendReviewReminderNotification(
    client: Client | null | undefined,
    serviceProviderName: string,
    offerTitle: string,
    serviceProfileLink: string,
    offerId: string = `review_reminder_${Date.now()}`
  ): Promise<boolean> {
    try {
      if (!client) {
        console.error(`❌ EmailService.sendReviewReminderNotification - client este null sau undefined`);
        return false;
      }

      // Verificăm dacă putem trimite email (rate limiting)
      const canSendEmail = this.checkRateLimit(client.email, 'review_reminder');
      if (!canSendEmail) {
        console.log(`⏳ EmailService.sendReviewReminderNotification - Rate limiting activat pentru ${client.email}`);
        return false;
      }

      console.log(
        `\n📋 === EmailService.sendReviewReminderNotification - Trimitere notificare eligibilitate recenzie pentru CLIENT ===`,
      );

      // Generam un subiect personalizat pentru email
      const subject = `Puteți lăsa acum o recenzie pentru ${serviceProviderName}`;

      // Generam conținutul HTML al email-ului
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://carvizio.ro/logo.png" alt="Carvizio Logo" style="max-width: 150px;">
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Puteți lăsa acum o recenzie</h2>
            <p style="color: #555; line-height: 1.5;">Bună ziua,</p>
            <p style="color: #555; line-height: 1.5;">Ați beneficiat recent de serviciile oferite de <strong>${serviceProviderName}</strong> pentru oferta <strong>"${offerTitle}"</strong>.</p>
            <p style="color: #555; line-height: 1.5;">Acum sunteți eligibil să lăsați o recenzie pentru acest service, ajutând astfel și alți utilizatori să ia decizii informate.</p>
            <p style="color: #555; line-height: 1.5;">Recenziile sincere ajută la îmbunătățirea calității serviciilor și contribuie la o comunitate mai transparentă.</p>
          </div>
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${serviceProfileLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Lasă o recenzie</a>
          </div>
          <div style="color: #777; font-size: 12px; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p>Acest email a fost trimis automat. Vă rugăm să nu răspundeți la acest mesaj.</p>
            <p>© ${new Date().getFullYear()} Carvizio. Toate drepturile rezervate.</p>
          </div>
        </div>
      `;

      // Generam versiunea text a email-ului
      const textContent = `
Puteți lăsa acum o recenzie

Bună ziua,

Ați beneficiat recent de serviciile oferite de ${serviceProviderName} pentru oferta "${offerTitle}".

Acum sunteți eligibil să lăsați o recenzie pentru acest service, ajutând astfel și alți utilizatori să ia decizii informate.
Recenziile sincere ajută la îmbunătățirea calității serviciilor și contribuie la o comunitate mai transparentă.

Lasă o recenzie: ${serviceProfileLink}

Acest email a fost trimis automat. Vă rugăm să nu răspundeți la acest mesaj.
© ${new Date().getFullYear()} Carvizio. Toate drepturile rezervate.
      `;

      // Creăm un ID unic pentru acest email pentru a preveni duplicatele
      const messageId = `review_reminder_${offerId}_${client.id}_${Date.now()}`;

      // Trimitem email-ul
      const success = await this.sendEmail(
        client.email,
        subject,
        htmlContent,
        textContent,
        messageId
      );

      // Actualizăm rate limiting dacă emailul a fost trimis cu succes
      if (success) {
        this.updateRateLimit(client.email, 'review_reminder');
        console.log(`✅ EmailService.sendReviewReminderNotification - Email trimis cu succes către ${client.email}`);
      } else {
        console.log(`❌ EmailService.sendReviewReminderNotification - Eșec la trimiterea email-ului către ${client.email}`);
      }

      return success;
    } catch (error) {
      console.error(
        `📋 EmailService.sendReviewReminderNotification - Eroare la trimiterea email-ului către ${client?.email}:`,
        error
      );
      return false;
    }
  }
}