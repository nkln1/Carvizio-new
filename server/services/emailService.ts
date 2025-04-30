/**
 * Serviciu pentru trimiterea notificărilor prin email folosind Elastic Email API
 */

import fetch from "node-fetch";
import { type ServiceProvider, type Client } from "@shared/schema";

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

  static {
    console.log("EmailService initialization:");
    console.log("- API Key configured:", this.apiKey ? "YES" : "NO");
    console.log("- From Email:", this.fromEmail);
    console.log("- From Name:", this.fromName);
    console.log("- API Base URL:", this.baseUrl);
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
      // Adăugăm un ID unic la subiect dacă este furnizat un messageId
      // Acest ID unic ajută la evitarea grupării email-urilor în inbox-ul utilizatorului
      const finalSubject = messageId ? `${subject} [${messageId}]` : subject;

      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          "API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY",
        );
        console.error(
          `📝 Variabile de mediu disponibile:`,
          Object.keys(process.env)
            .filter(
              (key) =>
                !key.includes("SECRET") &&
                !key.includes("KEY") &&
                !key.includes("TOKEN"),
            )
            .join(", "),
        );
        return false;
      }

      // Construim payload-ul pentru API
      const payload: EmailPayload = {
        To: to,
        From: this.fromEmail,
        FromName: this.fromName,
        Subject: finalSubject,
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
        // Verificăm și rezultatul dat de API-ul Elastic Email
        if (data.success) {
          // Email trimis cu succes
          console.log(
            `✅ Email trimis cu succes către ${to} - Subject: ${finalSubject}`,
          );
          return true;
        } else {
          // API-ul a răspuns, dar nu a putut trimite email-ul
          console.error(
            `❌ Eroare la trimiterea email-ului către ${to}:`,
            data.error || "Eroare necunoscută de la API",
          );
          return false;
        }
      } else {
        // Cererea către API a eșuat
        const errorText = await response.text();
        console.error(
          `❌ Eroare HTTP ${response.status} la trimiterea email-ului către ${to}:`,
          errorText,
        );
        return false;
      }
    } catch (error) {
      // Excepție la trimiterea email-ului
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
    requestId: string | number = `request_${Date.now()}`,
  ): Promise<boolean> {
    try {
      console.log(
        `\n🔔 ===== TRIMITERE NOTIFICARE EMAIL PENTRU CERERE NOUĂ =====`,
      );
      console.log(
        `📊 Date furnizor servicii:`,
        JSON.stringify(serviceProvider, null, 2),
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

      const debugInfo = `[Cerere Nouă] Client: ${clientName}, Titlu: ${requestTitle}, ID: ${requestId}`;

      // Logare extinsă pentru diagnosticare completă
      console.log(`📧 Detalii notificare:`);
      console.log(`   • Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`   • Client: ${clientName}`);
      console.log(`   • Titlu cerere: ${requestTitle}`);
      console.log(`   • ID Cerere: ${requestId}`);

      const subject = `Cerere nouă de la ${clientName}`;

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
            <!-- ID Cerere: ${requestId} - Folosit pentru prevenirea duplicării -->
          </div>
        </div>
      `;

      // Conținut text simplu pentru clienții de email care nu suportă HTML
      const text = `
  Cerere nouă de la ${clientName}

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
        console.error(
          `📝 Variabile de mediu disponibile:`,
          Object.keys(process.env)
            .filter(
              (key) =>
                !key.includes("SECRET") &&
                !key.includes("KEY") &&
                !key.includes("TOKEN"),
            )
            .join(", "),
        );
        return false;
      }

      console.log(
        `✅ API key configurat: ${this.apiKey ? `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}` : "N/A"}`,
      );
      console.log(
        `🔄 Trimitere email pentru cerere nouă către: ${serviceProvider.email}`,
      );

      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        serviceProvider.email,
        subject,
        html,
        text,
        String(requestId),
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewRequestNotification - Email trimis cu succes către ${serviceProvider.email} pentru cererea ${requestId}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendNewRequestNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId}`,
        );
      }

      console.log(
        `🔔 ===== SFÂRȘIT NOTIFICARE EMAIL PENTRU CERERE NOUĂ =====\n`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewRequestNotification - Eroare la trimiterea email-ului pentru cererea ${requestId}:`,
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

      const debugInfo = `[Ofertă Acceptată] Client: ${clientName}, Titlu: ${offerTitle}, ID: ${offerId}`;
      console.log(
        `=== EmailService.sendOfferAcceptedNotification - Trimitere notificare ofertă acceptată ===`,
      );
      console.log(`Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`Client: ${clientName}`);
      console.log(`Titlu ofertă: ${offerTitle}`);
      console.log(`ID Ofertă: ${offerId}`);

      const subject = `Ofertă acceptată de ${clientName}`;
      // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
      const uniqueSubject = `${subject} [${offerId}]`;

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
          <!-- ID Ofertă: ${offerId} - Folosit pentru prevenirea duplicării -->
        </div>
      `;

      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          `❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`,
        );
        return false;
      }

      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        serviceProvider.email,
        uniqueSubject,
        html,
        undefined, // text content
        debugInfo, // info debugging
      );

      if (result) {
        console.log(
          `✅ EmailService.sendOfferAcceptedNotification - Email trimis cu succes către ${serviceProvider.email} pentru oferta ${offerId}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendOfferAcceptedNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendOfferAcceptedNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId}:`,
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

    // Blocăm imediat această semnătură pentru a preveni procesare paralelă
    this._sentMessageIds.set(messageSignature, now);
    console.log(
      `🔐 [Anti-duplicare] Înregistrat ID mesaj: ${messageSignature}`,
    );

    // Adăugăm un ID de execuție unic pentru logging - nu afectează logica de cache
    const uniqueExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Înregistrăm în log începutul procesului
    console.log(
      `\n🔔 ===== TRIMITERE NOTIFICARE EMAIL PENTRU MESAJ NOU (SERVICE) [${uniqueExecutionId}] =====`,
    );
    console.log(`📝 ID Mesaj: ${messageId} | Execuție: ${uniqueExecutionId}`);

    try {
      console.log(
        `📊 Date furnizor servicii:`,
        JSON.stringify(serviceProvider, null, 2),
      );

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

      // Construim un ID de execuție unic pentru acest mesaj (prevenție dublare)
      const execMessageId = `${messageId}_${uniqueExecutionId}`;
      console.log(`🆔 ID Execuție unic generat: ${execMessageId}`);

      const debugInfo = `[Mesaj Nou] De la: ${senderName}, Cerere/Ofertă: ${requestOrOfferTitle}, ID Mesaj: ${execMessageId}`;

      // Logare extinsă pentru diagnosticare completă
      console.log(`📧 Detalii notificare:`);
      console.log(`   • Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`   • Expeditor: ${senderName}`);
      console.log(`   • Referitor la: ${requestOrOfferTitle}`);
      console.log(`   • ID Mesaj: ${execMessageId}`);
      console.log(
        `   • Conținut mesaj: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}"`,
      );

      // Construim subiectul fără identificator în textul vizibil
      const subject = `Mesaj nou de la ${senderName}`;
      // Folosim subject direct fără adăugarea ID-ului în subiect
      const uniqueSubject = subject;

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
            <!-- ID Unic: ${execMessageId} - Previne duplicarea -->
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
ID unic: ${execMessageId}
      `;

      console.log(`🔄 Verificare API key Elastic Email...`);
      // Verificăm API key-ul și afișăm detalii pentru debugging
      if (!this.apiKey) {
        console.error(
          `❌ API key pentru Elastic Email nu este configurat! Verificați variabila de mediu ELASTIC_EMAIL_API_KEY`,
        );
        console.error(
          `📝 Variabile de mediu disponibile:`,
          Object.keys(process.env)
            .filter(
              (key) =>
                !key.includes("SECRET") &&
                !key.includes("KEY") &&
                !key.includes("TOKEN"),
            )
            .join(", "),
        );
        return false;
      }

      console.log(
        `✅ API key configurat: ${this.apiKey ? `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}` : "N/A"}`,
      );
      console.log(
        `🔄 [${uniqueExecutionId}] Trimitere email pentru mesaj nou către: ${serviceProvider.email}`,
      );

      // UN SINGUR APEL LA TRIMITERE EMAIL - BLOCAT DE MUTEX PENTRU A PREVENI APELURI CONCURENTE
      console.log(
        `🔒 [${uniqueExecutionId}] Marcăm mesajul ca fiind în curs de trimitere pentru a preveni duplicarea`,
      );
      // Înregistrăm mesajul ca fiind în curs de trimitere
      this._sentMessageIds.set(messageSignature, now);

      const startTime = Date.now();

      // IMPORTANT: Aici este SINGURUL LOC din această metodă unde se face trimiterea email-ului,
      // și este protejat împotriva duplicării prin control de concurență
      const emailResult = await this.sendEmail(
        serviceProvider.email,
        uniqueSubject,
        html,
        text,
        null,
      );

      const endTime = Date.now();

      console.log(`⏱️ Durata trimitere email: ${endTime - startTime}ms`);
      console.log(
        `📊 Rezultat trimitere email: ${emailResult ? "SUCCESS" : "FAILURE"}`,
      );

      if (emailResult) {
        console.log(
          `✅ Email trimis cu succes către ${serviceProvider.email} pentru mesajul ${execMessageId}`,
        );
        // Păstrăm ID-ul în cache doar în caz de succes
        this._sentMessageIds.set(messageSignature, now);

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
          `❌ Eșec la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${execMessageId}`,
        );
        console.error(
          `📝 Detalii eșec: Email către ${serviceProvider.email}, Subiect: ${uniqueSubject}`,
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

      // În caz de eroare, logăm informații detaliate pentru depanare
      console.error(`📝 Detalii eroare completă:`, error);
      console.error(
        `📝 Date trimitere: Email către ${serviceProvider?.email}, De la: ${senderName}, Titlu: ${requestOrOfferTitle}`,
      );

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

      const debugInfo = `[Recenzie Nouă] Client: ${clientName}, Rating: ${rating}/5, ID: ${reviewId}`;
      console.log(
        `=== EmailService.sendNewReviewNotification - Trimitere notificare recenzie nouă ===`,
      );
      console.log(`Destinatar: ${companyName} (${serviceProvider.email})`);
      console.log(`Client: ${clientName}`);
      console.log(`Rating: ${rating}/5`);
      console.log(`ID Recenzie: ${reviewId}`);
      console.log(
        `Conținut recenzie (primele 50 caractere): ${reviewContent?.substring(0, 50)}${reviewContent?.length > 50 ? "..." : ""}`,
      );

      const subject = `Recenzie nouă de la ${clientName}`;
      // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
      const uniqueSubject = `${subject} [${reviewId}]`;

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
          <!-- ID Recenzie: ${reviewId} - Folosit pentru prevenirea duplicării -->
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

      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        serviceProvider.email,
        uniqueSubject,
        html,
        undefined, // text content
        debugInfo, // info debugging
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewReviewNotification - Email trimis cu succes către ${serviceProvider.email} pentru recenzia ${reviewId}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendNewReviewNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewReviewNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId}:`,
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
    try {
      const debugInfo = `[Mesaj Nou pentru CLIENT] De la: ${senderName}, Cerere/Ofertă: ${requestOrOfferTitle}, ID Mesaj: ${messageId}`;
      console.log(
        `\n💬 === EmailService.sendNewMessageNotificationToClient - Trimitere notificare mesaj nou către CLIENT ===`,
      );
      console.log(`📧 Destinatar: ${client.name} (${client.email})`);
      console.log(`📤 Expeditor: ${senderName}`);
      console.log(`📌 Referitor la: ${requestOrOfferTitle}`);
      console.log(`🔢 ID Mesaj: ${messageId}`);
      console.log(
        `📝 Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}`,
      );

      const subject = `Mesaj nou de la ${senderName}`;

      // CLIENT
      // Adăugăm un identificator unic în subiect pentru a preveni gruparea mesajelor
      const uniqueSubject = `${subject}`;

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
            <!-- ID Mesaj: ${messageId} - Folosit pentru prevenirea duplicării -->
          </div>
        </div>
      `;

      // Trimitem email-ul folosind noul parametru de debugging
      const result = await this.sendEmail(
        client.email,
        uniqueSubject,
        html,
        undefined, // text content
        null,
      );
      console.log(
        `💬 EmailService.sendNewMessageNotificationToClient - Email trimis cu succes către ${client.email} pentru mesajul ${messageId}`,
      );
      return result;
    } catch (error) {
      console.error(
        `💬 EmailService.sendNewMessageNotificationToClient - Eroare la trimiterea email-ului către ${client.email} pentru mesajul ${messageId}:`,
        error,
      );
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
    offerId: string = `offer_${Date.now()}`,
  ): Promise<boolean> {
    try {
      const debugInfo = `[Ofertă Nouă pentru CLIENT] De la: ${providerName}, Ofertă: ${offerTitle}, Cerere: ${requestTitle}, ID: ${offerId}`;
      console.log(
        `\n📋 === EmailService.sendNewOfferNotificationToClient - Trimitere notificare ofertă nouă către CLIENT ===`,
      );
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
            <!-- ID Ofertă: ${offerId} - Folosit pentru prevenirea duplicării -->
          </div>
        </div>
      `;

      // Trimitem email-ul folosind parametrul de debugging
      const result = await this.sendEmail(
        client.email,
        uniqueSubject,
        html,
        undefined, // text content
        debugInfo, // info debugging
      );
      console.log(
        `📋 EmailService.sendNewOfferNotificationToClient - Email trimis cu succes către ${client.email} pentru oferta ${offerId}`,
      );
      return result;
    } catch (error) {
      console.error(
        `📋 EmailService.sendNewOfferNotificationToClient - Eroare la trimiterea email-ului către ${client.email} pentru oferta ${offerId}:`,
        error,
      );
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }
}
