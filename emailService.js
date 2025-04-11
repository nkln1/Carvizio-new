/**
 * JavaScript version of the EmailService for testing purposes
 * This is a direct port of the TypeScript EmailService to JavaScript
 */

import fetch from 'node-fetch';

export class EmailService {
  // Define static properties
  static apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  static fromEmail = 'notificari@carvizio.ro';
  static fromName = 'Auto Service App';
  static baseUrl = 'https://api.elasticemail.com/v2/email/send';

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
    if (!this.apiKey) {
      console.error('EmailService.sendEmail - Lipsește API key-ul pentru Elastic Email');
      return false;
    }

    const uniqueMessageId = messageId || `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const payload = {
      apikey: this.apiKey,
      from: this.fromEmail,
      fromName: this.fromName,
      to,
      subject,
      bodyHtml: htmlContent,
      bodyText: textContent || '',
      messageID: uniqueMessageId,
      isTransactional: true
    };

    try {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        params.append(key, value);
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = await response.json();

      if (!data.success) {
        console.error(`EmailService.sendEmail - Eroare API Elastic Email: ${JSON.stringify(data)}`);
        // Nu mai trimitem email de diagnostic aici, doar logăm eroarea
        return false;
      }

      return true;
    } catch (error) {
      console.error('EmailService.sendEmail - Eroare la trimiterea email-ului:', error);
      // Log detailed error info but don't send a diagnostic email
      if (error instanceof Error) {
        console.error('EmailService.sendEmail - Detalii eroare:', error.message);
        console.error('EmailService.sendEmail - Stack trace:', error.stack);
      }
      return false;
    }
  }

  /**
   * Trimite o notificare prin email pentru o nouă cerere
   * @param {Object} serviceProvider - Furnizorul de servicii care primește notificarea
   * @param {string} requestTitle - Titlul cererii
   * @param {string} clientName - Numele clientului care a creat cererea
   * @param {string} requestId - ID-ul cererii (pentru prevenirea duplicatelor)
   * @param {string} debugInfo - Informații de debugging (opțional)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewRequestNotification(serviceProvider, requestTitle, clientName, requestId, debugInfo) {
    console.log(`\n==== TRIMITERE EMAIL NOTIFICARE CERERE NOUĂ ====`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Client: ${clientName}`);
    console.log(`Titlu cerere: ${requestTitle}`);
    console.log(`ID cerere: ${requestId}`);
    
    // Generăm un ID unic pentru acest email
    const emailId = `service_request_${requestId}_${Date.now()}`;
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
          <a href="https://app.carvizio.ro/service-dashboard?tab=requests" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Vezi cererea
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
        <!-- ID Cerere: ${requestId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      console.log(`Trimitere email pentru cerere nouă către: ${serviceProvider.email}`);
      
      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo || emailId // info debugging + message ID
      );
      
      if (result) {
        console.log(`✅ EmailService.sendNewRequestNotification - Email trimis cu succes către ${serviceProvider.email} pentru cererea ${requestId}`);
      } else {
        console.error(`❌ EmailService.sendNewRequestNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ EmailService.sendNewRequestNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru cererea ${requestId}:`, error);
      
      // Log error but don't send a test diagnostic email
      console.error(`Detalii eroare: ${error.message || error}`);
      
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
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
  static async sendOfferAcceptedNotification(serviceProvider, offerTitle, clientName, offerId, debugInfo) {
    console.log(`\n==== TRIMITERE EMAIL NOTIFICARE OFERTĂ ACCEPTATĂ ====`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Client: ${clientName}`);
    console.log(`Titlu ofertă: ${offerTitle}`);
    console.log(`ID ofertă: ${offerId}`);
    
    // Generăm un ID unic pentru acest email
    const emailId = `service_accepted_offer_${offerId}_${Date.now()}`;
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
          <a href="https://app.carvizio.ro/service-dashboard?tab=accepted-offers" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Vezi detalii
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
      console.log(`Trimitere email pentru ofertă acceptată către: ${serviceProvider.email}`);
      
      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo || emailId // info debugging + message ID
      );
      
      if (result) {
        console.log(`✅ EmailService.sendOfferAcceptedNotification - Email trimis cu succes către ${serviceProvider.email} pentru oferta ${offerId}`);
      } else {
        console.error(`❌ EmailService.sendOfferAcceptedNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ EmailService.sendOfferAcceptedNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru oferta ${offerId}:`, error);
      
      // Log error but don't send a test diagnostic email
      console.error(`Detalii eroare: ${error.message || error}`);
      
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }

  /**
   * Trimite o notificare prin email pentru un mesaj nou
   * @param {Object} serviceProvider - Furnizorul de servicii care primește notificarea
   * @param {string} messageContent - Conținutul mesajului
   * @param {string} senderName - Numele expeditorului
   * @param {string} requestOrOfferTitle - Titlul cererii sau ofertei asociate
   * @param {string} messageId - ID-ul mesajului (pentru prevenirea duplicatelor)
   * @param {string} debugInfo - Informații de debugging (opțional)
   * @returns {Promise<boolean>} - true dacă email-ul a fost trimis cu succes, false altfel
   */
  static async sendNewMessageNotification(serviceProvider, messageContent, senderName, requestOrOfferTitle, messageId, debugInfo) {
    console.log(`\n==== TRIMITERE EMAIL NOTIFICARE MESAJ NOU CĂTRE SERVICE ====`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Expeditor: ${senderName}`);
    console.log(`Subiect: ${requestOrOfferTitle}`);
    console.log(`ID mesaj: ${messageId}`);
    console.log(`Conținut: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`);
    
    // Generăm un ID unic pentru acest email
    const actualMessageId = `message_service_${messageId || Date.now()}`;
    const uniqueSubject = `Mesaj nou: ${requestOrOfferTitle}`;

    // Trunchiază mesajul dacă este prea lung pentru preview
    const messagePreview = messageContent.length > 100 
      ? messageContent.substring(0, 100) + '...' 
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
          <a href="https://app.carvizio.ro/service-dashboard?tab=messages" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Răspunde
          </a>
        </p>
        <p style="color: #718096; font-size: 0.9em; margin-top: 30px;">
          Acest email a fost trimis automat de aplicația Auto Service.
          <br>
          Puteți dezactiva notificările prin email din setările contului dvs.
        </p>
        <!-- ID Mesaj: ${actualMessageId} - Folosit pentru prevenirea duplicării -->
      </div>
    `;

    try {
      console.log(`EmailService.sendNewMessageNotification - Încercare trimitere email către ${serviceProvider.email} pentru mesaj ${actualMessageId}`);

      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo || actualMessageId // info debugging + message ID
      );

      if (result) {
        console.log(`EmailService.sendNewMessageNotification - Email trimis cu succes către ${serviceProvider.email} pentru mesajul ${actualMessageId}`);
      } else {
        console.error(`EmailService.sendNewMessageNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${actualMessageId}`);
      }

      return result;
    } catch (error) {
      console.error(`EmailService.sendNewMessageNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru mesajul ${actualMessageId}:`, error);
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
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
  static async sendNewReviewNotification(serviceProvider, clientName, rating, reviewContent, reviewId, debugInfo) {
    console.log(`\n==== TRIMITERE EMAIL NOTIFICARE RECENZIE NOUĂ ====`);
    console.log(`Destinatar: ${serviceProvider.companyName} (${serviceProvider.email})`);
    console.log(`Client: ${clientName}`);
    console.log(`Rating: ${rating}/5`);
    console.log(`ID recenzie: ${reviewId}`);
    console.log(`Conținut: ${reviewContent?.substring(0, 50)}${reviewContent?.length > 50 ? '...' : ''}`);
    
    // Generăm un ID unic pentru acest email
    const emailId = `service_review_${reviewId}_${Date.now()}`;
    const uniqueSubject = `Recenzie nouă: ${clientName} (${rating}/5 stele)`;

    // Generăm reprezentarea vizuală a rating-ului cu stele
    let ratingStars = '';
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        ratingStars += '★'; // Stea plină
      } else {
        ratingStars += '☆'; // Stea goală
      }
    }

    // Trunchiază recenzia dacă este prea lungă pentru preview
    const reviewPreview = reviewContent && reviewContent.length > 200 
      ? reviewContent.substring(0, 200) + '...' 
      : reviewContent || '(Fără comentarii)';

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
          <a href="https://app.carvizio.ro/service-dashboard?tab=reviews" style="display: inline-block; background-color: #00aff5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px;">
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
      console.log(`Trimitere email pentru recenzie nouă către: ${serviceProvider.email}`);
      
      const result = await this.sendEmail(
        serviceProvider.email, 
        uniqueSubject, 
        html, 
        undefined, // text content
        debugInfo || emailId // info debugging + message ID
      );
      
      if (result) {
        console.log(`✅ EmailService.sendNewReviewNotification - Email trimis cu succes către ${serviceProvider.email} pentru recenzia ${reviewId}`);
      } else {
        console.error(`❌ EmailService.sendNewReviewNotification - Eșec la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ EmailService.sendNewReviewNotification - Eroare la trimiterea email-ului către ${serviceProvider.email} pentru recenzia ${reviewId}:`, error);
      
      // Log error but don't send a test diagnostic email
      console.error(`Detalii eroare: ${error.message || error}`);
      
      // Nu propagăm eroarea pentru a nu întrerupe fluxul aplicației
      return false;
    }
  }
}