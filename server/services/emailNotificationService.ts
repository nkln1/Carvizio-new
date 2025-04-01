import * as schedule from 'node-schedule';
import { emailService } from './emailService';
import { IStorage } from '../storage';
import { Message, Request, Review, SentOffer, ServiceProvider } from '@shared/schema';

// Interfețe pentru notificările din coadă
interface EmailNotification {
  serviceProviderId: number;
  type: 'request' | 'offer_accepted' | 'message' | 'review';
  data: any;
  createdAt: Date;
}

// Interfețe pentru diferite tipuri de notificări
interface RequestNotification {
  serviceProviderId: number;
  request: Request;
}

interface OfferAcceptedNotification {
  serviceProviderId: number;
  offer: SentOffer;
  request: Request;
}

interface MessageNotification {
  serviceProviderId: number;
  message: Message;
  request: Request;
  senderName: string;
}

interface ReviewNotification {
  serviceProviderId: number;
  review: Review;
  clientName: string;
}

/**
 * Service pentru gestionarea notificărilor prin email
 * - Notificările critice (ofertă acceptată) sunt trimise imediat
 * - Notificările non-critice (cerere nouă, mesaj nou, recenzie nouă) sunt grupate și trimise la intervale
 */
export class EmailNotificationService {
  private storage: IStorage;
  private readonly digestInterval = 15; // intervalul de trimitere a digestului în minute
  private notificationsQueue: Map<number, EmailNotification[]> = new Map(); // Map de service provider ID la array de notificări
  private scheduleJob: schedule.Job | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.setupScheduleJob();
    console.log(`[EmailNotificationService] Initialized with digest interval ${this.digestInterval} minutes`);
  }

  /**
   * Configurează job-ul programat pentru trimiterea notificărilor digest
   */
  private setupScheduleJob() {
    // Rulează job-ul la fiecare 15 minute
    this.scheduleJob = schedule.scheduleJob(`*/${this.digestInterval} * * * *`, async () => {
      console.log('[EmailNotificationService] Running scheduled digest job');
      await this.sendDigestNotifications();
    });
  }

  /**
   * Adaugă o notificare în coada de digest pentru un service provider
   */
  private queueNotification(notification: EmailNotification) {
    const { serviceProviderId } = notification;
    
    if (!this.notificationsQueue.has(serviceProviderId)) {
      this.notificationsQueue.set(serviceProviderId, []);
    }

    this.notificationsQueue.get(serviceProviderId)?.push(notification);
    console.log(`[EmailNotificationService] Queued ${notification.type} notification for service ${serviceProviderId}`);
  }

  /**
   * Trimite toate notificările acumulate pentru toți service providerii
   */
  private async sendDigestNotifications() {
    if (this.notificationsQueue.size === 0) {
      console.log('[EmailNotificationService] No digest notifications to send');
      return;
    }

    console.log(`[EmailNotificationService] Sending digest notifications to ${this.notificationsQueue.size} services`);

    // Parcurge fiecare service provider și trimite notificările
    this.notificationsQueue.forEach(async (notifications, serviceProviderId) => {
      try {
        await this.sendDigestForServiceProvider(serviceProviderId, notifications);
      } catch (error) {
        console.error(`[EmailNotificationService] Error sending digest for service ${serviceProviderId}:`, error);
      }
    });

    // Resetează coada de notificări
    this.notificationsQueue.clear();
  }

  /**
   * Trimite digest pentru un anumit service provider
   */
  private async sendDigestForServiceProvider(serviceProviderId: number, notifications: EmailNotification[]) {
    if (notifications.length === 0) return;

    // Obține service provider
    const serviceProvider = await this.storage.getServiceProvider(serviceProviderId);
    if (!serviceProvider) {
      console.error(`[EmailNotificationService] Cannot find service provider ${serviceProviderId}`);
      return;
    }

    // Verifică preferințele de notificare
    const preferences = await this.storage.getNotificationPreferences(serviceProviderId);
    if (!preferences || !preferences.emailNotificationsEnabled) {
      console.log(`[EmailNotificationService] Email notifications disabled for service ${serviceProviderId}`);
      return;
    }

    // Grupează notificările după tip
    const requestNotifications = notifications.filter(n => n.type === 'request');
    const messageNotifications = notifications.filter(n => n.type === 'message');
    const reviewNotifications = notifications.filter(n => n.type === 'review');

    // Verifică dacă sunt active preferințele specifice pentru fiecare tip
    const canSendRequestNotifications = preferences.newRequestEmailEnabled && requestNotifications.length > 0;
    const canSendMessageNotifications = preferences.newMessageEmailEnabled && messageNotifications.length > 0;
    const canSendReviewNotifications = preferences.newReviewEmailEnabled && reviewNotifications.length > 0;

    // Dacă nu sunt active preferințele pentru niciun tip, nu trimite nimic
    if (!canSendRequestNotifications && !canSendMessageNotifications && !canSendReviewNotifications) {
      console.log(`[EmailNotificationService] No active notification preferences for service ${serviceProviderId}`);
      return;
    }

    // Construiește conținutul HTML pentru digest
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0080ff;">Notificări Service Auto</h2>
        <p>Salut ${serviceProvider.representativeName},</p>
        <p>Ai primit următoarele actualizări pe platforma Service Auto:</p>
    `;

    // Adaugă secțiunea de cereri noi dacă există și sunt permise
    if (canSendRequestNotifications) {
      htmlContent += `
        <div style="margin-top: 20px; margin-bottom: 20px;">
          <h3 style="color: #0080ff; border-bottom: 1px solid #eee; padding-bottom: 10px;">Cereri Noi (${requestNotifications.length})</h3>
          <ul style="list-style-type: none; padding-left: 0;">
      `;

      for (const notification of requestNotifications) {
        const request = notification.data.request as Request;
        htmlContent += `
          <li style="padding: 10px; margin-bottom: 10px; background-color: #f7f7f7; border-radius: 5px;">
            <p style="margin: 0; font-weight: bold;">${request.title}</p>
            <p style="margin: 5px 0; font-size: 14px;">
              ${request.description.substring(0, 100)}${request.description.length > 100 ? '...' : ''}
            </p>
            <p style="margin: 5px 0; font-size: 14px;">Locație: ${request.county}, ${request.cities.join(', ')}</p>
            <a href="https://serviceauto.ro/dashboard/service/cereri" style="color: #0080ff; text-decoration: none;">
              Vezi cererea →
            </a>
          </li>
        `;
      }

      htmlContent += `
          </ul>
        </div>
      `;
    }

    // Adaugă secțiunea de mesaje noi dacă există și sunt permise
    if (canSendMessageNotifications) {
      htmlContent += `
        <div style="margin-top: 20px; margin-bottom: 20px;">
          <h3 style="color: #0080ff; border-bottom: 1px solid #eee; padding-bottom: 10px;">Mesaje Noi (${messageNotifications.length})</h3>
          <ul style="list-style-type: none; padding-left: 0;">
      `;

      for (const notification of messageNotifications) {
        const messageData = notification.data;
        htmlContent += `
          <li style="padding: 10px; margin-bottom: 10px; background-color: #f7f7f7; border-radius: 5px;">
            <p style="margin: 0; font-weight: bold;">De la: ${messageData.senderName}</p>
            <p style="margin: 5px 0; font-size: 14px;">Cerere: ${messageData.request.title}</p>
            <p style="margin: 5px 0; font-size: 14px;">
              ${messageData.message.content.substring(0, 100)}${messageData.message.content.length > 100 ? '...' : ''}
            </p>
            <a href="https://serviceauto.ro/dashboard/service/mesaje" style="color: #0080ff; text-decoration: none;">
              Răspunde →
            </a>
          </li>
        `;
      }

      htmlContent += `
          </ul>
        </div>
      `;
    }

    // Adaugă secțiunea de recenzii noi dacă există și sunt permise
    if (canSendReviewNotifications) {
      htmlContent += `
        <div style="margin-top: 20px; margin-bottom: 20px;">
          <h3 style="color: #0080ff; border-bottom: 1px solid #eee; padding-bottom: 10px;">Recenzii Noi (${reviewNotifications.length})</h3>
          <ul style="list-style-type: none; padding-left: 0;">
      `;

      for (const notification of reviewNotifications) {
        const reviewData = notification.data;
        htmlContent += `
          <li style="padding: 10px; margin-bottom: 10px; background-color: #f7f7f7; border-radius: 5px;">
            <p style="margin: 0; font-weight: bold;">De la: ${reviewData.clientName}</p>
            <p style="margin: 5px 0; font-size: 14px;">Rating: ${'★'.repeat(reviewData.review.rating)}${'☆'.repeat(5 - reviewData.review.rating)}</p>
            <p style="margin: 5px 0; font-size: 14px;">
              ${reviewData.review.comment.substring(0, 100)}${reviewData.review.comment.length > 100 ? '...' : ''}
            </p>
            <a href="https://serviceauto.ro/dashboard/service/profil" style="color: #0080ff; text-decoration: none;">
              Vezi recenzia →
            </a>
          </li>
        `;
      }

      htmlContent += `
          </ul>
        </div>
      `;
    }

    // Încheie conținutul HTML
    htmlContent += `
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Pentru a gestiona preferințele de notificări, accesează
          <a href="https://serviceauto.ro/dashboard/service/setari" style="color: #0080ff; text-decoration: none;">
            pagina de setări
          </a>.
        </p>
        <p style="color: #666; font-size: 14px;">
          Mulțumim că folosești platforma Service Auto!
        </p>
      </div>
    `;

    // Construiește conținutul text pentru email-uri plain text
    const textContent = `
Notificări Service Auto

Salut ${serviceProvider.representativeName},

Ai primit următoarele actualizări pe platforma Service Auto:
${canSendRequestNotifications ? `\nCereri Noi (${requestNotifications.length})` : ''}
${canSendMessageNotifications ? `\nMesaje Noi (${messageNotifications.length})` : ''}
${canSendReviewNotifications ? `\nRecenzii Noi (${reviewNotifications.length})` : ''}

Pentru a vedea toate notificările, accesează:
https://serviceauto.ro/dashboard/service

Pentru a gestiona preferințele de notificări, accesează:
https://serviceauto.ro/dashboard/service/setari

Mulțumim că folosești platforma Service Auto!
    `;

    // Determină subiectul emailului în funcție de tipurile de notificări
    let subject = 'Notificări Service Auto';
    if (requestNotifications.length > 0 && messageNotifications.length === 0 && reviewNotifications.length === 0) {
      subject = `${requestNotifications.length} cereri noi pe Service Auto`;
    } else if (messageNotifications.length > 0 && requestNotifications.length === 0 && reviewNotifications.length === 0) {
      subject = `${messageNotifications.length} mesaje noi pe Service Auto`;
    } else if (reviewNotifications.length > 0 && requestNotifications.length === 0 && messageNotifications.length === 0) {
      subject = `${reviewNotifications.length} recenzii noi pe Service Auto`;
    } else {
      const totalCount = requestNotifications.length + messageNotifications.length + reviewNotifications.length;
      subject = `${totalCount} notificări noi pe Service Auto`;
    }

    // Trimite email-ul
    await emailService.sendEmail({
      to: serviceProvider.email,
      subject,
      bodyHtml: htmlContent,
      bodyText: textContent
    });

    console.log(`[EmailNotificationService] Digest email sent to service ${serviceProviderId} with ${notifications.length} notifications`);
  }

  /**
   * Notifică un service provider despre o cerere nouă
   */
  async notifyNewRequest(serviceProviderId: number, request: Request, instant: boolean = false) {
    // Verifică preferințele de notificare
    const preferences = await this.storage.getNotificationPreferences(serviceProviderId);
    if (!preferences || !preferences.emailNotificationsEnabled || !preferences.newRequestEmailEnabled) {
      console.log(`[EmailNotificationService] New request notifications disabled for service ${serviceProviderId}`);
      return;
    }

    const notification: EmailNotification = {
      serviceProviderId,
      type: 'request',
      data: { request },
      createdAt: new Date()
    };

    // Dacă este instant, trimite imediat, altfel pune în coadă
    if (instant) {
      await this.sendInstantRequestNotification(serviceProviderId, { 
        serviceProviderId, 
        request 
      });
    } else {
      this.queueNotification(notification);
    }
  }

  /**
   * Notifică un service provider despre o ofertă acceptată (notificare critică, trimisă instant)
   */
  async notifyOfferAccepted(serviceProviderId: number, offer: SentOffer, request: Request) {
    // Verifică preferințele de notificare
    const preferences = await this.storage.getNotificationPreferences(serviceProviderId);
    if (!preferences || !preferences.emailNotificationsEnabled || !preferences.acceptedOfferEmailEnabled) {
      console.log(`[EmailNotificationService] Offer accepted notifications disabled for service ${serviceProviderId}`);
      return;
    }

    // Oferta acceptată este considerată critică și se trimite imediat
    await this.sendInstantOfferAcceptedNotification(serviceProviderId, { 
      serviceProviderId, 
      offer, 
      request 
    });
  }

  /**
   * Notifică un service provider despre un mesaj nou
   */
  async notifyNewMessage(serviceProviderId: number, message: Message, request: Request, senderName: string, instant: boolean = false) {
    // Verifică preferințele de notificare
    const preferences = await this.storage.getNotificationPreferences(serviceProviderId);
    if (!preferences || !preferences.emailNotificationsEnabled || !preferences.newMessageEmailEnabled) {
      console.log(`[EmailNotificationService] New message notifications disabled for service ${serviceProviderId}`);
      return;
    }

    const notification: EmailNotification = {
      serviceProviderId,
      type: 'message',
      data: { message, request, senderName },
      createdAt: new Date()
    };

    // Dacă este instant, trimite imediat, altfel pune în coadă
    if (instant) {
      await this.sendInstantMessageNotification(serviceProviderId, { 
        serviceProviderId, 
        message, 
        request, 
        senderName 
      });
    } else {
      this.queueNotification(notification);
    }
  }

  /**
   * Notifică un service provider despre o recenzie nouă
   */
  async notifyNewReview(serviceProviderId: number, review: Review, clientName: string, instant: boolean = false) {
    // Verifică preferințele de notificare
    const preferences = await this.storage.getNotificationPreferences(serviceProviderId);
    if (!preferences || !preferences.emailNotificationsEnabled || !preferences.newReviewEmailEnabled) {
      console.log(`[EmailNotificationService] New review notifications disabled for service ${serviceProviderId}`);
      return;
    }

    const notification: EmailNotification = {
      serviceProviderId,
      type: 'review',
      data: { review, clientName },
      createdAt: new Date()
    };

    // Dacă este instant, trimite imediat, altfel pune în coadă
    if (instant) {
      await this.sendInstantReviewNotification(serviceProviderId, { 
        serviceProviderId, 
        review, 
        clientName 
      });
    } else {
      this.queueNotification(notification);
    }
  }

  /**
   * Forțează trimiterea tuturor notificărilor din coadă
   */
  async forceSendDigestNotifications() {
    await this.sendDigestNotifications();
  }

  // Metode pentru trimiterea notificărilor instant

  /**
   * Trimite o notificare instant despre o cerere nouă
   */
  private async sendInstantRequestNotification(serviceProviderId: number, data: RequestNotification) {
    const { request } = data;
    
    const serviceProvider = await this.storage.getServiceProvider(serviceProviderId);
    if (!serviceProvider) {
      console.error(`[EmailNotificationService] Cannot find service provider ${serviceProviderId}`);
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0080ff;">Cerere Nouă pe Service Auto</h2>
        <p>Salut ${serviceProvider.representativeName},</p>
        <p>Ai primit o cerere nouă pe platforma Service Auto:</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f7f7f7; border-radius: 5px;">
          <h3 style="margin-top: 0;">${request.title}</h3>
          <p><strong>Descriere:</strong> ${request.description}</p>
          <p><strong>Locație:</strong> ${request.county}, ${request.cities.join(', ')}</p>
          <p><strong>Data preferată:</strong> ${new Date(request.preferredDate).toLocaleDateString('ro-RO')}</p>
        </div>
        
        <div style="margin-top: 25px;">
          <a href="https://serviceauto.ro/dashboard/service/cereri" 
             style="background-color: #0080ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Vezi cererea
          </a>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Pentru a gestiona preferințele de notificări, accesează
          <a href="https://serviceauto.ro/dashboard/service/setari" style="color: #0080ff; text-decoration: none;">
            pagina de setări
          </a>.
        </p>
      </div>
    `;

    const textContent = `
Cerere Nouă pe Service Auto

Salut ${serviceProvider.representativeName},

Ai primit o cerere nouă pe platforma Service Auto:

Titlu: ${request.title}
Descriere: ${request.description}
Locație: ${request.county}, ${request.cities.join(', ')}
Data preferată: ${new Date(request.preferredDate).toLocaleDateString('ro-RO')}

Pentru a vedea cererea, accesează:
https://serviceauto.ro/dashboard/service/cereri

Pentru a gestiona preferințele de notificări, accesează:
https://serviceauto.ro/dashboard/service/setari
    `;

    await emailService.sendEmail({
      to: serviceProvider.email,
      subject: 'Cerere Nouă pe Service Auto',
      bodyHtml: htmlContent,
      bodyText: textContent
    });

    console.log(`[EmailNotificationService] Instant request notification sent to service ${serviceProviderId}`);
  }

  /**
   * Trimite o notificare instant despre o ofertă acceptată
   */
  private async sendInstantOfferAcceptedNotification(serviceProviderId: number, data: OfferAcceptedNotification) {
    const { offer, request } = data;
    
    const serviceProvider = await this.storage.getServiceProvider(serviceProviderId);
    if (!serviceProvider) {
      console.error(`[EmailNotificationService] Cannot find service provider ${serviceProviderId}`);
      return;
    }

    // Obține numele clientului
    const client = await this.storage.getClient(offer.requestUserId);
    const clientName = client ? client.name : 'Client';

    const formattedPrice = new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(offer.price);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0080ff;">Ofertă Acceptată pe Service Auto</h2>
        <p>Salut ${serviceProvider.representativeName},</p>
        <p><strong>${clientName}</strong> tocmai a acceptat oferta ta pentru cererea "${request.title}"!</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f7f7f7; border-radius: 5px;">
          <h3 style="margin-top: 0;">Detalii ofertă</h3>
          <p><strong>Titlu ofertă:</strong> ${offer.title}</p>
          <p><strong>Preț:</strong> ${formattedPrice}</p>
          <p><strong>Cerere:</strong> ${request.title}</p>
          <p><strong>Client:</strong> ${clientName}</p>
        </div>
        
        <div style="margin-top: 25px;">
          <a href="https://serviceauto.ro/dashboard/service/oferte-acceptate" 
             style="background-color: #0080ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Vezi oferta acceptată
          </a>
        </div>
        
        <p style="margin-top: 20px;">
          Te rugăm să contactezi clientul cât mai curând pentru a stabili detaliile intervenției.
        </p>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Pentru a gestiona preferințele de notificări, accesează
          <a href="https://serviceauto.ro/dashboard/service/setari" style="color: #0080ff; text-decoration: none;">
            pagina de setări
          </a>.
        </p>
      </div>
    `;

    const textContent = `
Ofertă Acceptată pe Service Auto

Salut ${serviceProvider.representativeName},

${clientName} tocmai a acceptat oferta ta pentru cererea "${request.title}"!

Detalii ofertă:
Titlu ofertă: ${offer.title}
Preț: ${formattedPrice}
Cerere: ${request.title}
Client: ${clientName}

Te rugăm să contactezi clientul cât mai curând pentru a stabili detaliile intervenției.

Pentru a vedea oferta acceptată, accesează:
https://serviceauto.ro/dashboard/service/oferte-acceptate

Pentru a gestiona preferințele de notificări, accesează:
https://serviceauto.ro/dashboard/service/setari
    `;

    await emailService.sendEmail({
      to: serviceProvider.email,
      subject: 'Ofertă Acceptată pe Service Auto',
      bodyHtml: htmlContent,
      bodyText: textContent
    });

    console.log(`[EmailNotificationService] Instant offer accepted notification sent to service ${serviceProviderId}`);
  }

  /**
   * Trimite o notificare instant despre un mesaj nou
   */
  private async sendInstantMessageNotification(serviceProviderId: number, data: MessageNotification) {
    const { message, request, senderName } = data;
    
    const serviceProvider = await this.storage.getServiceProvider(serviceProviderId);
    if (!serviceProvider) {
      console.error(`[EmailNotificationService] Cannot find service provider ${serviceProviderId}`);
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0080ff;">Mesaj Nou pe Service Auto</h2>
        <p>Salut ${serviceProvider.representativeName},</p>
        <p>Ai primit un mesaj nou de la <strong>${senderName}</strong> referitor la cererea "${request.title}".</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f7f7f7; border-radius: 5px; border-left: 4px solid #0080ff;">
          <p style="font-style: italic; margin-top: 0;">${message.content}</p>
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">
            ${new Date(message.createdAt).toLocaleString('ro-RO')}
          </p>
        </div>
        
        <div style="margin-top: 25px;">
          <a href="https://serviceauto.ro/dashboard/service/mesaje" 
             style="background-color: #0080ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Răspunde acum
          </a>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Pentru a gestiona preferințele de notificări, accesează
          <a href="https://serviceauto.ro/dashboard/service/setari" style="color: #0080ff; text-decoration: none;">
            pagina de setări
          </a>.
        </p>
      </div>
    `;

    const textContent = `
Mesaj Nou pe Service Auto

Salut ${serviceProvider.representativeName},

Ai primit un mesaj nou de la ${senderName} referitor la cererea "${request.title}".

"${message.content}"

${new Date(message.createdAt).toLocaleString('ro-RO')}

Pentru a răspunde, accesează:
https://serviceauto.ro/dashboard/service/mesaje

Pentru a gestiona preferințele de notificări, accesează:
https://serviceauto.ro/dashboard/service/setari
    `;

    await emailService.sendEmail({
      to: serviceProvider.email,
      subject: 'Mesaj Nou pe Service Auto',
      bodyHtml: htmlContent,
      bodyText: textContent
    });

    console.log(`[EmailNotificationService] Instant message notification sent to service ${serviceProviderId}`);
  }

  /**
   * Trimite o notificare instant despre o recenzie nouă
   */
  private async sendInstantReviewNotification(serviceProviderId: number, data: ReviewNotification) {
    const { review, clientName } = data;
    
    const serviceProvider = await this.storage.getServiceProvider(serviceProviderId);
    if (!serviceProvider) {
      console.error(`[EmailNotificationService] Cannot find service provider ${serviceProviderId}`);
      return;
    }

    const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0080ff;">Recenzie Nouă pe Service Auto</h2>
        <p>Salut ${serviceProvider.representativeName},</p>
        <p>Ai primit o recenzie nouă de la <strong>${clientName}</strong>.</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f7f7f7; border-radius: 5px;">
          <p style="margin-top: 0; font-size: 18px; color: #ffa500;">${ratingStars}</p>
          <p style="font-style: italic;">${review.comment}</p>
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">
            ${new Date(review.createdAt).toLocaleDateString('ro-RO')}
          </p>
        </div>
        
        <div style="margin-top: 25px;">
          <a href="https://serviceauto.ro/dashboard/service/profil" 
             style="background-color: #0080ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Vezi toate recenziile
          </a>
        </div>
        
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Pentru a gestiona preferințele de notificări, accesează
          <a href="https://serviceauto.ro/dashboard/service/setari" style="color: #0080ff; text-decoration: none;">
            pagina de setări
          </a>.
        </p>
      </div>
    `;

    const textContent = `
Recenzie Nouă pe Service Auto

Salut ${serviceProvider.representativeName},

Ai primit o recenzie nouă de la ${clientName}.

Rating: ${review.rating}/5
Comentariu: "${review.comment}"

Data: ${new Date(review.createdAt).toLocaleDateString('ro-RO')}

Pentru a vedea toate recenziile, accesează:
https://serviceauto.ro/dashboard/service/profil

Pentru a gestiona preferințele de notificări, accesează:
https://serviceauto.ro/dashboard/service/setari
    `;

    await emailService.sendEmail({
      to: serviceProvider.email,
      subject: 'Recenzie Nouă pe Service Auto',
      bodyHtml: htmlContent,
      bodyText: textContent
    });

    console.log(`[EmailNotificationService] Instant review notification sent to service ${serviceProviderId}`);
  }
}