/**
 * JavaScript version of the EmailService for testing purposes
 * This is a direct port of the TypeScript EmailService to JavaScript
 */

import fetch from "node-fetch";

export class EmailService {
  // Define static properties
  static apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  static fromEmail = "notificari@carvizio.ro";
  static fromName = "Auto Service App";
  static baseUrl = "https://api.elasticemail.com/v2";

  // Static getters for better encapsulation
  static getApiKey() {
    return this.apiKey;
  }

  static getFromEmail() {
    return this.fromEmail;
  }

  static getFromName() {
    return this.fromName;
  }

  static getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Trimite un email folosind Elastic Email API
   * @param {string} to - Adresa email destinatar
   * @param {string} subject - Subiectul email-ului
   * @param {string} htmlContent - Conținutul HTML al email-ului
   * @param {string} textContent - Conținutul text al email-ului (opțional)
   * @param {string} messageId - ID unic pentru email (opțional, pentru prevenirea duplicatelor)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendEmail(to, subject, htmlContent, textContent, messageId) {
    // Generate a unique ID for tracking if none provided
    const emailId =
      messageId || `email_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    console.log(`[${emailId}] 📧 Trimitere email: "${subject}" către ${to}`);

    if (!this.apiKey) {
      console.error(
        `[${emailId}] ❌ API key pentru Elastic Email nu este configurat`,
      );
      return false;
    }

    // Verificare adresă de email destinatar
    if (!to || !to.includes("@") || to.trim() === "") {
      console.error(
        `[${emailId}] ❌ Adresă de email destinatar invalidă: "${to}"`,
      );
      return false;
    }

    const payload = {
      apikey: this.apiKey,
      from: this.fromEmail,
      fromName: this.fromName,
      to,
      subject,
      bodyHtml: htmlContent,
      bodyText: textContent || "",
      messageID: emailId,
      isTransactional: true,
    };

    try {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });

      console.log(
        `[${emailId}] 🔄 Trimitere request către Elastic Email API...`,
      );

      const response = await fetch(`${this.baseUrl}/email/send`, {
        method: "POST",
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-ElasticEmail-ApiKey": this.apiKey,
        },
      });

      // Verificăm răspunsul HTTP
      if (!response.ok) {
        console.error(
          `[${emailId}] ❌ Eroare HTTP de la Elastic Email API: ${response.status} ${response.statusText}`,
        );
        try {
          const errorData = await response.text();
          console.error(`[${emailId}] ❌ Răspuns eroare: ${errorData}`);
        } catch (parseError) {
          console.error(
            `[${emailId}] ❌ Nu s-a putut citi răspunsul de eroare`,
          );
        }
        return false;
      }

      // Parsăm răspunsul JSON
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(
          `[${emailId}] ❌ Eroare la parsarea răspunsului JSON:`,
          jsonError,
        );
        return false;
      }

      if (!data.success) {
        console.error(
          `[${emailId}] ❌ Eroare API Elastic Email: ${JSON.stringify(data)}`,
        );
        return false;
      }

      console.log(
        `[${emailId}] ✅ Email trimis cu succes! MessageID: ${data.data?.messageid || "N/A"}`,
      );
      return true;
    } catch (error) {
      console.error(`[${emailId}] ❌ Eroare la trimiterea email-ului:`, error);
      if (error instanceof Error) {
        console.error(`[${emailId}] ❌ Detalii eroare:`, error.message);
        console.error(`[${emailId}] ❌ Stack trace:`, error.stack);
      }

      // Încercăm să trimitem un email de diagnosticare în caz de eșec
      try {
        console.log(`[${emailId}] 🔍 Încercare trimitere email diagnostic...`);
        const diagnosticParams = new URLSearchParams();
        diagnosticParams.append("apikey", this.apiKey);
        diagnosticParams.append("from", this.fromEmail);
        diagnosticParams.append("fromName", `${this.fromName} - Diagnostic`);
        // Folosim adresa notificari@carvizio.ro explicit pentru diagnostic
        diagnosticParams.append("to", "notificari@carvizio.ro"); 
        diagnosticParams.append(
          "subject",
          `[TEST DIAGNOSTIC] Eroare trimitere email: ${subject}`,
        );
        diagnosticParams.append(
          "bodyHtml",
          `
          <h2>Eroare la trimiterea unui email</h2>
          <p><strong>ID Email:</strong> ${emailId}</p>
          <p><strong>Destinatar original:</strong> ${to}</p>
          <p><strong>Subiect original:</strong> ${subject}</p>
          <p><strong>Eroare:</strong> ${error instanceof Error ? error.message : String(error)}</p>
          <p>Acest email este trimis automat pentru diagnosticarea problemelor cu sistemul de notificări.</p>
        `,
        );

        await fetch(`${this.baseUrl}/email/send`, {
          method: "POST",
          body: diagnosticParams,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-ElasticEmail-ApiKey": this.apiKey,
          },
        });
      } catch (diagError) {
        console.error(
          `[${emailId}] ❌ Și email-ul de diagnosticare a eșuat:`,
          diagError,
        );
      }

      return false;
    }
  }

  /**
   * SERVICIU -> NOTIFICĂRI PENTRU SERVICE DASHBOARD
   */

  /**
   * Trimite o notificare prin email pentru o nouă cerere
   * @param {Object} serviceProvider - Furnizorul de servicii care primește notificarea
   * @param {string} requestTitle - Titlul cererii
   * @param {string} clientName - Numele clientului care a creat cererea
   * @param {string} requestId - ID-ul cererii (pentru prevenirea duplicatelor)
   * @param {string} debugInfo - Informații de debugging (opțional)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewRequestNotification(
    serviceProvider,
    requestTitle,
    clientName,
    requestId,
    debugInfo,
  ) {
    console.log(
      `\n==== TRIMITERE EMAIL NOTIFICARE CERERE NOUĂ PENTRU SERVICE ====`,
    );
    console.log(
      `Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`,
    );
    console.log(`Client: ${clientName}`);
    console.log(`Titlu cerere: ${requestTitle}`);
    console.log(`ID cerere: ${requestId}`);

    // Generăm un ID unic pentru acest email
    const emailId = `service_request_${requestId || Date.now()}_${Date.now()}`;
    const uniqueSubject = `Cerere nouă: ${requestTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #00aff5; margin-bottom: 20px;">Cerere nouă de service auto</h2>
        <p>Bună ${serviceProvider.companyName},</p>
        <p>Aveți o cerere nouă de la <strong>${clientName}</strong> pentru:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #333;">${requestTitle}</h3>
        </div>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=requests" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Vezi cererea
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
        <!-- ID Cerere: ${emailId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      console.log(
        `Trimitere email pentru cerere nouă către: ${serviceProvider.email}`,
      );

      const result = await this.sendEmail(
        serviceProvider.email,
        uniqueSubject,
        html,
        undefined, // text content
        emailId, // message ID
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewRequestNotification - Email trimis cu succes către ${serviceProvider.email} pentru cererea ${requestId || "nouă"}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendNewRequestNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId || "nouă"}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewRequestNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId || "nouă"}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Trimite o notificare prin email pentru o ofertă acceptată
   * @param {Object} serviceProvider - Furnizorul de servicii care primește notificarea
   * @param {string} offerTitle - Titlul ofertei
   * @param {string} clientName - Numele clientului care a acceptat oferta
   * @param {string} offerId - ID-ul ofertei (pentru prevenirea duplicatelor)
   * @param {string} debugInfo - Informații de debugging (opțional)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendOfferAcceptedNotification(
    serviceProvider,
    offerTitle,
    clientName,
    offerId,
    debugInfo,
  ) {
    console.log(
      `\n==== TRIMITERE EMAIL NOTIFICARE OFERTĂ ACCEPTATĂ PENTRU SERVICE ====`,
    );
    console.log(
      `Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`,
    );
    console.log(`Client: ${clientName}`);
    console.log(`Titlu ofertă: ${offerTitle}`);
    console.log(`ID ofertă: ${offerId}`);

    // Generăm un ID unic pentru acest email
    const emailId = `service_accepted_offer_${offerId || Date.now()}_${Date.now()}`;
    const uniqueSubject = `Ofertă acceptată: ${offerTitle}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #00aff5; margin-bottom: 20px;">Ofertă acceptată!</h2>
        <p>Bună ${serviceProvider.companyName},</p>
        <p><strong>${clientName}</strong> a acceptat oferta dumneavoastră pentru:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #333;">${offerTitle}</h3>
        </div>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=accepted-offers" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Vezi detalii
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
        <!-- ID Ofertă: ${emailId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      console.log(
        `Trimitere email pentru ofertă acceptată către: ${serviceProvider.email}`,
      );

      const result = await this.sendEmail(
        serviceProvider.email,
        uniqueSubject,
        html,
        undefined, // text content
        emailId, // message ID
      );

      if (result) {
        console.log(
          `✅ EmailService.sendOfferAcceptedNotification - Email trimis cu succes către ${serviceProvider.email} pentru oferta ${offerId || "acceptată"}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendOfferAcceptedNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId || "acceptată"}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendOfferAcceptedNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId || "acceptată"}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Trimite o notificare prin email pentru un mesaj nou către service
   * @param {Object} serviceProvider - Furnizorul de servicii care primește notificarea
   * @param {string} messageContent - Conținutul mesajului
   * @param {string} senderName - Numele expeditorului
   * @param {string} requestOrOfferTitle - Titlul cererii sau ofertei asociate
   * @param {string} messageId - ID-ul mesajului (pentru prevenirea duplicatelor)
   * @param {string} debugInfo - Informații de debugging (opțional)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewMessageNotification(
    serviceProvider,
    messageContent,
    senderName,
    requestOrOfferTitle,
    messageId,
    debugInfo,
  ) {
    // Creăm un mesaj de log detaliat pentru debugging
    const logMessage = `
==== TRIMITERE EMAIL NOTIFICARE MESAJ NOU CĂTRE SERVICE ====
Timestamp: ${new Date().toISOString()}
Destinatar: ${serviceProvider?.companyName || 'N/A'} (${serviceProvider?.email || 'N/A'})
Destinatar ID: ${serviceProvider?.id || 'N/A'}
Expeditor: ${senderName || 'N/A'}
Subiect: ${requestOrOfferTitle || 'N/A'}
ID mesaj: ${messageId || 'N/A'}
Debug Info: ${debugInfo || 'N/A'}
`;

    // Logarea în consolă și într-un fișier pentru debugging ulterior
    console.log(logMessage);
    
    try {
      const fs = await import('fs');
      fs.appendFileSync('public/logs/email-debug.txt', logMessage + '\n');
    } catch (logErr) {
      console.error('Nu s-a putut scrie în fișierul de log:', logErr);
    }

    // Verificări de siguranță pentru a preveni erorile
    if (!serviceProvider) {
      console.error('❌ serviceProvider este null sau undefined');
      return false;
    }

    if (!serviceProvider.email || !serviceProvider.email.includes('@')) {
      console.error(`❌ Email invalid pentru service provider: "${serviceProvider.email}"`);
      return false;
    }

    console.log(
      `\n==== TRIMITERE EMAIL NOTIFICARE MESAJ NOU CĂTRE SERVICE ====`,
    );
    console.log(
      `Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`,
    );
    console.log(`Expeditor: ${senderName}`);
    console.log(`Subiect: ${requestOrOfferTitle}`);
    console.log(`ID mesaj: ${messageId}`);
    console.log(
      `Conținut: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}`,
    );

    // Generăm un ID unic pentru acest email - asigurăm că are un format consistent
    const uniqueMessageId = messageId || `msg_${Date.now()}`;
    const emailId = `service_message_${uniqueMessageId}`;
    const uniqueSubject = `Mesaj nou: ${requestOrOfferTitle}`;

    // Trunchiază mesajul dacă este prea lung pentru preview
    const messagePreview =
      messageContent.length > 100
        ? messageContent.substring(0, 100) + "..."
        : messageContent;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #00aff5; margin-bottom: 20px;">Mesaj nou</h2>
        <p>Bună ${serviceProvider.companyName},</p>
        <p>Aveți un mesaj nou de la <strong>${senderName}</strong> referitor la:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #333;">${requestOrOfferTitle}</h3>
          <p style="margin-bottom: 0; color: #666; font-style: italic;">"${messagePreview}"</p>
        </div>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=messages" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Răspunde
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
        <!-- ID Mesaj: ${emailId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      console.log(
        `Trimitere email pentru mesaj nou către service: ${serviceProvider.email}`,
      );

      // Log important înainte de trimitere
      console.log(`[DEBUG] Înainte de trimitere - destinatar real: ${serviceProvider.email}`);

      const result = await this.sendEmail(
        serviceProvider.email, // Adresa de email a destinatarului
        uniqueSubject,        // Subiectul email-ului
        html,                 // Conținutul HTML
        undefined,            // Text content (opțional)
        emailId,              // ID unic pentru mesaj
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewMessageNotification - Email trimis cu succes către ${serviceProvider.email} pentru mesajul ${messageId || "nou"}`,
        );
        // Adaugă înregistrare de succes în log
        try {
          const fs = await import('fs');
          fs.appendFileSync('public/logs/email-debug.txt', `✅ SUCCES: Email trimis la ${serviceProvider.email} la ${new Date().toISOString()}\n`);
        } catch (logErr) {
          console.error('Nu s-a putut actualiza log-ul de succes:', logErr);
        }
      } else {
        console.error(
          `❌ EmailService.sendNewMessageNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${messageId || "nou"}`,
        );
        // Adaugă înregistrare de eșec în log
        try {
          const fs = await import('fs');
          fs.appendFileSync('public/logs/email-debug.txt', `❌ EȘEC: Email către ${serviceProvider.email} a eșuat la ${new Date().toISOString()}\n`);
        } catch (logErr) {
          console.error('Nu s-a putut actualiza log-ul de eșec:', logErr);
        }
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewMessageNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${messageId || "nou"}:`,
        error,
      );
      
      // Adaugă eroare în log
      try {
        const fs = await import('fs');
        fs.appendFileSync('public/logs/email-debug.txt', `❌ EROARE: ${error.message} la ${new Date().toISOString()}\n`);
      } catch (logErr) {
        console.error('Nu s-a putut actualiza log-ul de eroare:', logErr);
      }
      
      return false;
    }
  }

  /**
   * Trimite o notificare prin email pentru o recenzie nouă
   * @param {Object} serviceProvider - Furnizorul de servicii care primește notificarea
   * @param {string} clientName - Numele clientului care a lăsat recenzia
   * @param {number} rating - Rating-ul (1-5) acordat
   * @param {string} reviewContent - Conținutul recenziei
   * @param {string} reviewId - ID-ul recenziei (pentru prevenirea duplicatelor)
   * @param {string} debugInfo - Informații de debugging (opțional)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewReviewNotification(
    serviceProvider,
    clientName,
    rating,
    reviewContent,
    reviewId,
    debugInfo,
  ) {
    console.log(
      `\n==== TRIMITERE EMAIL NOTIFICARE RECENZIE NOUĂ PENTRU SERVICE ====`,
    );
    console.log(
      `Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`,
    );
    console.log(`Client: ${clientName}`);
    console.log(`Rating: ${rating}/5`);
    console.log(`ID recenzie: ${reviewId}`);
    console.log(
      `Conținut: ${reviewContent?.substring(0, 50)}${reviewContent?.length > 50 ? "..." : ""}`,
    );

    // Generăm un ID unic pentru acest email
    const emailId = `service_review_${reviewId || Date.now()}_${Date.now()}`;
    const uniqueSubject = `Recenzie nouă: ${clientName} (${rating}/5 stele)`;

    // Generăm reprezentarea vizuală a rating-ului cu stele
    let ratingStars = "";
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        ratingStars += "★"; // Stea plină
      } else {
        ratingStars += "☆"; // Stea goală
      }
    }

    // Trunchiază recenzia dacă este prea lungă pentru preview
    const reviewPreview =
      reviewContent && reviewContent.length > 200
        ? reviewContent.substring(0, 200) + "..."
        : reviewContent || "(Fără comentarii)";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #00aff5; margin-bottom: 20px;">Recenzie nouă</h2>
        <p>Bună ${serviceProvider.companyName},</p>
        <p><strong>${clientName}</strong> v-a lăsat o recenzie nouă:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <div style="font-size: 24px; color: #f8ce0b; margin-bottom: 10px;">
            ${ratingStars} <span style="color: #333; font-size: 16px;">${rating}/5</span>
          </div>
          <p style="margin-bottom: 0; color: #666; font-style: italic;">"${reviewPreview}"</p>
        </div>
        <p>
          <a href="https://auto-service-app.replit.app/service-dashboard?tab=reviews" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Vezi recenziile
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
        <!-- ID Recenzie: ${emailId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      console.log(
        `Trimitere email pentru recenzie nouă către: ${serviceProvider.email}`,
      );

      const result = await this.sendEmail(
        serviceProvider.email,
        uniqueSubject,
        html,
        undefined, // text content
        emailId, // message ID
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewReviewNotification - Email trimis cu succes către ${serviceProvider.email} pentru recenzia ${reviewId || "nouă"}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendNewReviewNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId || "nouă"}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewReviewNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId || "nouă"}:`,
        error,
      );
      return false;
    }
  }

  /**
   * CLIENT -> NOTIFICĂRI PENTRU CLIENT DASHBOARD
   */

  /**
   * Trimite notificare de mesaj nou către client
   * Această metodă este specializată pentru a notifica clienții (nu service provider-ii)
   * @param {Object} client - Clientul care primește notificarea
   * @param {string} messageContent - Conținutul mesajului
   * @param {string} senderName - Numele expeditorului (service provider)
   * @param {string} requestOrOfferTitle - Titlul cererii sau ofertei asociate
   * @param {string} messageId - ID unic pentru mesaj (pentru prevenirea duplicării)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewMessageNotificationToClient(
    client,
    messageContent,
    senderName,
    requestOrOfferTitle,
    messageId = `message_client_${Date.now()}`,
  ) {
    console.log(
      `\n==== TRIMITERE EMAIL NOTIFICARE MESAJ NOU CĂTRE CLIENT ====`,
    );
    console.log(`Destinatar: ${client.name} (${client.email})`);
    console.log(`Expeditor: ${senderName}`);
    console.log(`Referitor la: ${requestOrOfferTitle}`);
    console.log(`ID Mesaj: ${messageId}`);
    console.log(
      `Conținut mesaj (primele 50 caractere): ${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}`,
    );

    const uniqueSubject = `Mesaj nou de la ${senderName}`;

    // Truncăm mesajul dacă este prea lung
    const truncatedMessage =
      messageContent.length > 150
        ? messageContent.substring(0, 147) + "..."
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
      console.log(
        `Trimitere email pentru mesaj nou către client: ${client.email}`,
      );

      const result = await this.sendEmail(
        client.email,
        uniqueSubject,
        html,
        undefined, // text content
        messageId, // message ID
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewMessageNotificationToClient - Email trimis cu succes către ${client.email} pentru mesajul ${messageId}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendNewMessageNotificationToClient - Eșec la trimiterea email-ului către ${client.email} pentru mesajul ${messageId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewMessageNotificationToClient - Eroare la trimiterea email-ului către ${client.email} pentru mesajul ${messageId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Trimite notificare de ofertă nouă către client
   * @param {Object} client - Clientul care primește notificarea
   * @param {string} offerTitle - Titlul ofertei
   * @param {string} providerName - Numele service provider-ului
   * @param {string} requestTitle - Titlul cererii originale
   * @param {string} offerId - ID unic pentru ofertă (pentru prevenirea duplicării)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewOfferNotificationToClient(
    client,
    offerTitle,
    providerName,
    requestTitle,
    offerId = `offer_${Date.now()}`,
  ) {
    console.log(
      `\n==== TRIMITERE EMAIL NOTIFICARE OFERTĂ NOUĂ CĂTRE CLIENT ====`,
    );
    console.log(`Destinatar: ${client.name} (${client.email})`);
    console.log(`Service Provider: ${providerName}`);
    console.log(`Titlu ofertă: ${offerTitle}`);
    console.log(`Cerere originală: ${requestTitle}`);
    console.log(`ID Ofertă: ${offerId}`);

    const uniqueSubject = `Ofertă nouă de la ${providerName}`;

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
      console.log(
        `Trimitere email pentru ofertă nouă către client: ${client.email}`,
      );

      const result = await this.sendEmail(
        client.email,
        uniqueSubject,
        html,
        undefined, // text content
        offerId, // message ID
      );

      if (result) {
        console.log(
          `✅ EmailService.sendNewOfferNotificationToClient - Email trimis cu succes către ${client.email} pentru oferta ${offerId}`,
        );
      } else {
        console.error(
          `❌ EmailService.sendNewOfferNotificationToClient - Eșec la trimiterea email-ului către ${client.email} pentru oferta ${offerId}`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `❌ EmailService.sendNewOfferNotificationToClient - Eroare la trimiterea email-ului către ${client.email} pentru oferta ${offerId}:`,
        error,
      );
      return false;
    }
  }
}