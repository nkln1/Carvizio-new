import {
  clients,
  serviceProviders,
  cars,
  requests,
  sentOffers,
  messages as messagesTable,
  viewedRequests,
  viewedOffers,
  viewedAcceptedOffers,
  workingHours,
  reviews,
  notificationPreferences,
  clientNotificationPreferences,
  type Message,
  type Client,
  type InsertClient,
  type ServiceProvider,
  type InsertServiceProvider,
  type Car,
  type InsertCar,
  type Request,
  type InsertRequest,
  type SentOffer,
  type InsertSentOffer,
  type InsertMessage,
  type ViewedRequest,
  type ViewedOffer,
  type ViewedAcceptedOffer,
  type WorkingHour,
  type InsertWorkingHour,
  type Review,
  type InsertReview,
  type NotificationPreference,
  type InsertNotificationPreference,
  type ClientNotificationPreference,
  type InsertClientNotificationPreference
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";
import slugify from 'slugify';

const PostgresSessionStore = connectPg(session);

const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  ssl: false
});

export interface IStorage {
  // Client management
  getClientById(id: number): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClientByFirebaseUid(firebaseUid: string): Promise<Client | undefined>;
  createClient(client: InsertClient & { firebaseUid: string }): Promise<Client>;
  updateClient(id: number, clientData: Partial<Client>): Promise<Client>;

  // Service Provider management
  getServiceProviderById(id: number): Promise<ServiceProvider | undefined>;
  getServiceProviderByEmail(email: string): Promise<ServiceProvider | undefined>;
  getServiceProviderByFirebaseUid(firebaseUid: string): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider & { firebaseUid: string }): Promise<ServiceProvider>;
  updateServiceProvider(id: number, providerData: Partial<ServiceProvider>): Promise<ServiceProvider>;
  getServiceProviderByUsername(username: string): Promise<ServiceProvider | undefined>;

  // Car management
  getClientCars(clientId: number): Promise<Car[]>;
  getCar(id: number): Promise<Car | undefined>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, carData: Partial<Car>): Promise<Car>;
  deleteCar(id: number): Promise<void>;

  // Request management
  getClientRequests(clientId: number): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, requestData: Partial<Request>): Promise<Request>;
  getRequestsByLocation(county: string, cities: string[]): Promise<Request[]>;

  sessionStore: session.Store;
  // Add new methods for phone number checks
  getClientByPhone(phone: string): Promise<Client | undefined>;
  getServiceProviderByPhone(phone: string): Promise<ServiceProvider | undefined>;

  // Sent Offers management
  createSentOffer(offer: InsertSentOffer): Promise<SentOffer>;
  getSentOffersByServiceProvider(serviceProviderId: number): Promise<SentOffer[]>;
  getSentOffersByRequest(requestId: number): Promise<SentOffer[]>;
  updateSentOfferStatus(id: number, status: "Pending" | "Accepted" | "Rejected"): Promise<SentOffer>;
  getOffersForClient(clientId: number): Promise<(SentOffer & { serviceProviderName: string; serviceProviderUsername: string })[]>;

  // Add message-related methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: number): Promise<Message | undefined>;
  getUserMessages(userId: number, userRole: "client" | "service", requestId?: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message>;
  getUnreadMessagesCount(userId: number, userRole: "client" | "service"): Promise<number>;
  getClient(id: number): Promise<Client | undefined>;
  getServiceProvider(id: number): Promise<ServiceProvider | undefined>;

  // Add viewed requests methods
  markRequestAsViewed(serviceProviderId: number, requestId: number): Promise<ViewedRequest>;
  getViewedRequestsByServiceProvider(serviceProviderId: number): Promise<ViewedRequest[]>;
  isRequestViewedByProvider(serviceProviderId: number, requestId: number): Promise<boolean>;

  // Add viewed offers methods
  getViewedOffersByClient(clientId: number): Promise<ViewedOffer[]>; // Added
  markOfferAsViewed(clientId: number, offerId: number): Promise<ViewedOffer>; // Added

  // Add methods for viewed accepted offers
  markAcceptedOfferAsViewed(serviceProviderId: number, offerId: number): Promise<ViewedAcceptedOffer>;
  getViewedAcceptedOffersByServiceProvider(serviceProviderId: number): Promise<ViewedAcceptedOffer[]>;
  getMessagesByRequest(requestId: number): Promise<Message[]>;
  markConversationAsRead(requestId: number, userId: number): Promise<void>;

  // Working Hours management
  getServiceProviderWorkingHours(serviceProviderId: number): Promise<WorkingHour[]>;
  createWorkingHour(workingHour: InsertWorkingHour): Promise<WorkingHour>;
  updateWorkingHour(id: number, workingHourData: Partial<WorkingHour>): Promise<WorkingHour>;
  deleteWorkingHour(id: number): Promise<void>;
  getWorkingHours(serviceProviderId: number): Promise<WorkingHour[]>;
  updateWorkingHours(serviceProviderId: number, workingHourData: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }): Promise<WorkingHour>;

  // Notification Preferences management
  getNotificationPreferences(serviceProviderId: number): Promise<NotificationPreference | undefined>;
  createNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreferences(id: number, preferencesData: Partial<NotificationPreference>): Promise<NotificationPreference>;
  
  // Client Notification Preferences management
  getClientNotificationPreferences(clientId: number): Promise<ClientNotificationPreference | undefined>;
  createClientNotificationPreferences(preferences: InsertClientNotificationPreference): Promise<ClientNotificationPreference>;
  updateClientNotificationPreferences(id: number, preferencesData: Partial<ClientNotificationPreference>): Promise<ClientNotificationPreference>;


  // Reviews management
  getServiceProviderReviews(serviceProviderId: number): Promise<Review[]>;
  getClientReviews(clientId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, reviewData: Partial<Review>): Promise<Review>;
  deleteReview(id: number): Promise<void>;
  getServiceProviderAverageRating(serviceProviderId: number): Promise<number>;
  getServiceProvidersInCounty(county: string): Promise<ServiceProvider[]>; // Added method
}

async function generateUniqueUsername(companyName: string, db: typeof import('./db').db): Promise<string> {
  // Generate base slug
  let baseSlug = slugify(companyName, {
    lower: true,
    strict: true,
    trim: true
  });

  // Check if the base slug exists
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.username, slug))
      .limit(1);

    if (existing.length === 0) {
      break;
    }

    // If exists, append counter and try again
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: sessionPool,
      createTableIfMissing: true,
    });
  }

  // Client methods
  async getClientById(id: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      return client;
    } catch (error) {
      console.error('Error getting client by ID:', error);
      return undefined;
    }
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.email, email));
      return client;
    } catch (error) {
      console.error('Error getting client by email:', error);
      return undefined;
    }
  }

  async getClientByFirebaseUid(firebaseUid: string): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.firebaseUid, firebaseUid));
      return client;
    } catch (error) {
      console.error('Error getting client by Firebase UID:', error);
      return undefined;
    }
  }

  async createClient(insertClient: InsertClient & { firebaseUid: string }): Promise<Client> {
    try {
      const [client] = await db
        .insert(clients)
        .values({
          ...insertClient,
          firebaseUid: insertClient.firebaseUid,
          verified: false,
          createdAt: new Date(),
        })
        .returning();
      return client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    try {
      const [updatedClient] = await db
        .update(clients)
        .set(clientData)
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Service Provider methods
  async getServiceProviderById(id: number): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, id));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by ID:', error);
      return undefined;
    }
  }

  async getServiceProviderByEmail(email: string): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.email, email));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by email:', error);
      return undefined;
    }
  }

  async getServiceProviderByFirebaseUid(firebaseUid: string): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.firebaseUid, firebaseUid));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by Firebase UID:', error);
      return undefined;
    }
  }

  async createServiceProvider(insertProvider: InsertServiceProvider & { firebaseUid: string }): Promise<ServiceProvider> {
    try {
      // Generate username from company name
      const username = await generateUniqueUsername(insertProvider.companyName, db);

      const [provider] = await db
        .insert(serviceProviders)
        .values({
          ...insertProvider,
          firebaseUid: insertProvider.firebaseUid,
          username, // Add generated username
          verified: false,
          createdAt: new Date(),
        })
        .returning();
      return provider;
    } catch (error) {
      console.error('Error creating service provider:', error);
      throw error;
    }
  }

  async updateServiceProvider(id: number, providerData: Partial<ServiceProvider>): Promise<ServiceProvider> {
    try {
      // If company name is being updated, generate new username
      let updateData = { ...providerData };
      if (providerData.companyName) {
        const username = await generateUniqueUsername(providerData.companyName, db);
        updateData.username = username;
      }

      const [updatedProvider] = await db
        .update(serviceProviders)
        .set(updateData)
        .where(eq(serviceProviders.id, id))
        .returning();
      return updatedProvider;
    } catch (error) {
      console.error('Error updating service provider:', error);
      throw error;
    }
  }

  async getServiceProviderByUsername(username: string): Promise<ServiceProvider | undefined> {
    console.log("Database query: Searching for username:", username);

    console.log('Querying database for service provider with username:', username);
    try {
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.username, username));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by username:', error);
      console.error('Error getting service provider by username:', error);
      return undefined;
    }
  }

  // Car methods
  async getClientCars(clientId: number): Promise<Car[]> {
    try {
      return await db
        .select()
        .from(cars)
        .where(eq(cars.clientId, clientId))
        .orderBy(desc(cars.createdAt));
    } catch (error) {
      console.error('Error getting client cars:', error);
      return [];
    }
  }

  async getCar(id: number): Promise<Car | undefined> {
    try {
      const [car] = await db.select().from(cars).where(eq(cars.id, id));
      return car;
    } catch (error) {
      console.error('Error getting car:', error);
      return undefined;
    }
  }

  async createCar(car: InsertCar): Promise<Car> {
    try {
      const [newCar] = await db
        .insert(cars)
        .values(car)
        .returning();
      return newCar;
    } catch (error) {
      console.error('Error creating car:', error);
      throw error;
    }
  }

  async updateCar(id: number, carData: Partial<Car>): Promise<Car> {
    try {
      const [updatedCar] = await db
        .update(cars)
        .set(carData)
        .where(eq(cars.id, id))
        .returning();
      return updatedCar;
    } catch (error) {
      console.error('Error updating car:', error);
      throw error;
    }
  }

  async deleteCar(id: number): Promise<void> {
    try {
      await db.delete(cars).where(eq(cars.id, id));
    } catch (error) {
      console.error('Error deleting car:', error);
      throw error;
    }
  }

  // Request methods
  async getClientRequests(clientId: number): Promise<Request[]> {
    try {
      return await db
        .select()
        .from(requests)
        .where(eq(requests.clientId, clientId))
        .orderBy(desc(requests.createdAt));
    } catch (error) {
      console.error('Error getting client requests:', error);
      return [];
    }
  }

  async getRequest(id: number): Promise<Request | undefined> {
    try {
      const [request] = await db.select().from(requests).where(eq(requests.id, id));
      return request;
    } catch (error) {
      console.error('Error getting request:', error);
      return undefined;
    }
  }

  async createRequest(request: InsertRequest): Promise<Request> {
    try {
      const [newRequest] = await db
        .insert(requests)
        .values({
          ...request,
          status: "Active",
          createdAt: new Date(),
        })
        .returning();
      return newRequest;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  }

  async updateRequest(id: number, requestData: Partial<Request>): Promise<Request> {
    try {
      const [updatedRequest] = await db
        .update(requests)
        .set(requestData)
        .where(eq(requests.id, id))
        .returning();
      return updatedRequest;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    }
  }

  async getRequestsByLocation(county: string, cities: string[]): Promise<Request[]> {
    try {
      const matchingRequests = await db
        .select()
        .from(requests)
        .where(and(
          eq(requests.county, county),
          eq(requests.status, "Active")
        ))
        .orderBy(desc(requests.createdAt));

      if (cities.length > 0) {
        return matchingRequests.filter((request: Request) => {
          const requestCities = request.cities || [];
          return requestCities.some((requestCity: string) =>
            cities.includes(requestCity)
          );
        });
      }

      return matchingRequests;
    } catch (error) {
      console.error('Error getting requests by location:', error);
      throw error;
    }
  }
  async getClientByPhone(phone: string): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.phone, phone));
      return client;
    } catch (error) {
      console.error('Error getting client by phone:', error);
      return undefined;
    }
  }

  async getServiceProviderByPhone(phone: string): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.phone, phone));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by phone:', error);
      return undefined;
    }
  }
  async createSentOffer(offer: InsertSentOffer): Promise<SentOffer> {
    try {
      // First, get the request details
      const request = await this.getRequest(offer.requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      const [newOffer] = await db
        .insert(sentOffers)
        .values({
          ...offer,
          // Add request details
          requestTitle: request.title,
          requestDescription: request.description,
          requestPreferredDate: request.preferredDate,
          requestCounty: request.county,
          requestCities: request.cities,
          status: "Pending",
          createdAt: new Date(),
        })
        .returning();

      return newOffer;
    } catch (error) {
      console.error('Error creating sent offer:', error);
      throw error;
    }
  }

  async getSentOffersByServiceProvider(serviceProviderId: number): Promise<SentOffer[]> {
    try {
      return await db
        .select()
        .from(sentOffers)
        .where(eq(sentOffers.serviceProviderId, serviceProviderId))
        .orderBy(desc(sentOffers.createdAt));
    } catch (error) {
      console.error('Error getting sent offers by service provider:', error);
      return [];
    }
  }

  async getSentOffersByRequest(requestId: number): Promise<SentOffer[]> {
    try {
      return await db
        .select()
        .from(sentOffers)
        .where(eq(sentOffers.requestId, requestId))
        .orderBy(desc(sentOffers.createdAt));
    } catch (error) {
      console.error('Error getting sent offers by request:', error);
      return [];
    }
  }

  async updateSentOfferStatus(id: number, status: "Pending" | "Accepted" | "Rejected"): Promise<SentOffer> {
    try {
      const [updatedOffer] = await db
        .update(sentOffers)
        .set({ status })
        .where(eq(sentOffers.id, id))
        .returning();
      return updatedOffer;
    } catch (error) {
      console.error('Error updating sent offer status:', error);
      throw error;
    }
  }
  
  /**
   * Respinge automat toate ofertele pentru o cerere, exceptând oferta cu ID-ul specificat
   * @param requestId ID-ul cererii
   * @param acceptedOfferId ID-ul ofertei care a fost acceptată (și trebuie exclusă de la respingere)
   * @returns Array de oferte respinse
   */
  async rejectOtherOffersForRequest(requestId: number, acceptedOfferId: number): Promise<SentOffer[]> {
    try {
      console.log(`Respingere automată a celorlalte oferte pentru cererea ${requestId}, exceptând oferta ${acceptedOfferId}`);
      
      // Obține toate ofertele pentru cererea specificată
      const allOffers = await this.getSentOffersByRequest(requestId);
      
      // Filtrăm ofertele care trebuie respinse (toate cu excepția celei acceptate și celei deja respinse)
      const offersToReject = allOffers.filter(offer => 
        offer.id !== acceptedOfferId && offer.status !== "Rejected"
      );
      
      console.log(`Găsite ${offersToReject.length} oferte pentru respingere automată`);
      
      // Respinge fiecare ofertă
      const rejectedOffers = [];
      for (const offer of offersToReject) {
        const rejectedOffer = await this.updateSentOfferStatus(offer.id, "Rejected");
        rejectedOffers.push(rejectedOffer);
        console.log(`Oferta cu ID ${offer.id} respinsă automat`);
      }
      
      return rejectedOffers;
    } catch (error) {
      console.error('Eroare la respingerea automată a ofertelor:', error);
      throw error;
    }
  }
  async getOffersForClient(clientId: number): Promise<(SentOffer & { serviceProviderName: string; serviceProviderUsername: string })[]> {
    try {
      console.log('Getting offers for client:', clientId);

      // First get all requests for this client
      const clientRequests = await this.getClientRequests(clientId);
      console.log('Found client requests:', clientRequests.length);

      if (!clientRequests.length) {
        return [];
      }

      // Get the request IDs
      const requestIds = clientRequests.map(request => request.id);
      console.log('Request IDs:', requestIds);

      // Get all offers for these requests with service provider details
      const offers = await db
        .select({
          id: sentOffers.id,
          serviceProviderId: sentOffers.serviceProviderId,
          requestId: sentOffers.requestId,
          title: sentOffers.title,
          details: sentOffers.details,
          availableDates: sentOffers.availableDates,
          price: sentOffers.price,
          notes: sentOffers.notes,
          status: sentOffers.status,
          createdAt: sentOffers.createdAt,
          requestTitle: sentOffers.requestTitle,
          requestDescription: sentOffers.requestDescription,
          requestPreferredDate: sentOffers.requestPreferredDate,
          requestCounty: sentOffers.requestCounty,
          requestCities: sentOffers.requestCities,
          requestUserId: sentOffers.requestUserId,
          requestUserName: sentOffers.requestUserName,
          serviceProviderName: serviceProviders.companyName,
          serviceProviderUsername: serviceProviders.username // Add username to the result
        })
        .from(sentOffers)
        .leftJoin(
          serviceProviders,
          eq(sentOffers.serviceProviderId, serviceProviders.id)
        )
        .where(inArray(sentOffers.requestId, requestIds))
        .orderBy(desc(sentOffers.createdAt));

      return offers;
    } catch (error) {
      console.error('Error getting offers for client:', error);
      return [];
    }
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.getClientById(id);
  }

  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    return this.getServiceProviderById(id);
  }

  async createMessage({
    requestId,
    senderId,
    senderRole,
    receiverId,
    receiverRole,
    content,
    offerId
  }: {
    requestId: number;
    senderId: number;
    senderRole: "client" | "service";
    receiverId: number;
    receiverRole: "client" | "service";
    content: string;
    offerId?: number | null;
  }): Promise<Message> {
    try {
      const [message] = await db.insert(messagesTable).values({
        requestId,
        senderId,
        senderRole,
        receiverId,
        receiverRole,
        content,
        offerId: offerId || null,
        isRead: false,
        isNew: true,
        createdAt: new Date()
      }).returning();
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessage(id: number): Promise<Message | undefined> {
    try {
      const [message] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.id, id));
      return message;
    } catch (error) {
      console.error('Error getting message:', error);
      return undefined;
    }
  }

  async getUserMessages(userId: number, userRole: "client" | "service", requestId?: number): Promise<Message[]> {
    try {
      const conditions = [
        or(
          and(
            eq(messagesTable.senderId, userId),
            eq(messagesTable.senderRole, userRole)
          ),
          and(
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.receiverRole, userRole)
          )
        )
      ];

      if (requestId) {
        conditions.push(eq(messagesTable.requestId, requestId));
      }

      const messageResults = await db
        .select()
        .from(messagesTable)
        .where(and(...conditions))
        .orderBy(desc(messagesTable.createdAt));

      console.log('Retrieved messages:', messageResults.length);
      return messageResults;
    } catch (error) {
      console.error('Error getting user messages:', error);
      return [];
    }
  }

  async markMessageAsRead(id: number): Promise<Message> {
    try {
      const [updatedMessage] = await db
        .update(messagesTable)
        .set({ isRead: true })
        .where(eq(messagesTable.id, id))
        .returning();
      return updatedMessage;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async getUnreadMessagesCount(userId: number, userRole: "client" | "service"): Promise<number> {
    try {
      const unreadMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.receiverRole, userRole),
            eq(messagesTable.isRead, false)
          )
        );
      return unreadMessages.length;
    } catch (error) {
      console.error('Error getting unread messages count:', error);
      return 0;
    }
  }

  async markRequestAsViewed(serviceProviderId: number, requestId: number): Promise<ViewedRequest> {
    try {
      const [viewedRequest] = await db
        .insert(viewedRequests)
        .values({
          serviceProviderId,
          requestId,
          viewedAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (!viewedRequest) {
        // If there was a conflict, return the existing record
        const [existing] = await db
          .select()
          .from(viewedRequests)
          .where(
            and(
              eq(viewedRequests.serviceProviderId, serviceProviderId),
              eq(viewedRequests.requestId, requestId)
            )
          );
        return existing;
      }

      return viewedRequest;
    } catch (error) {
      console.error('Error marking request as viewed:', error);
      throw error;
    }
  }

  async getViewedRequestsByServiceProvider(serviceProviderId: number): Promise<ViewedRequest[]> {
    try {
      return await db
        .select()
        .from(viewedRequests)
        .where(eq(viewedRequests.serviceProviderId, serviceProviderId))
        .orderBy(desc(viewedRequests.viewedAt));
    } catch (error) {
      console.error('Error getting viewed requests:', error);
      return [];
    }
  }

  async isRequestViewedByProvider(serviceProviderId: number, requestId: number): Promise<boolean> {
    try {
      const [viewedRequest] = await db
        .select()
        .from(viewedRequests)
        .where(
          and(
            eq(viewedRequests.serviceProviderId, serviceProviderId),
            eq(viewedRequests.requestId, requestId)
          )
        );
      return !!viewedRequest;
    } catch (error) {
      console.error('Error checking if request is viewed:', error);
      return false;
    }
  }

  async getViewedOffersByClient(clientId: number): Promise<ViewedOffer[]> {
    try {
      console.log('Fetching viewed offers for client:', clientId);
      const result = await db
        .select()
        .from(viewedOffers)
        .where(eq(viewedOffers.clientId, clientId))
        .orderBy(desc(viewedOffers.viewedAt));

      console.log('Fetched viewed offers:', result);
      return result;
    } catch (error) {
      console.error('Error getting viewed offers:', error);
      return [];
    }
  }

  async markOfferAsViewed(clientId: number, offerId: number): Promise<ViewedOffer> {
    try {
      console.log('Attempting to mark offer as viewed:', { clientId, offerId });

      // First check if the client and offer exist
      const [offer] = await db
        .select()
        .from(sentOffers)
        .where(eq(sentOffers.id, offerId));

      if (!offer) {
        throw new Error(`Offer with ID ${offerId} not found`);
      }

      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId));

      if (!client) {
        throw new Error(`Client with ID ${clientId} not found`);
      }

      // Then try to insert/update the viewed offer
      const [viewedOffer] = await db
        .insert(viewedOffers)
        .values({
          clientId,
          offerId,
          viewedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [viewedOffers.clientId, viewedOffers.offerId],
          set: {
            viewedAt: new Date()
          }
        })
        .returning();

      console.log('Successfully marked offer as viewed:', viewedOffer);
      return viewedOffer;
    } catch (error) {
      console.error('Error marking offer as viewed:', error);
      throw error;
    }
  }

  async markAcceptedOfferAsViewed(serviceProviderId: number, offerId: number): Promise<ViewedAcceptedOffer> {
    try {
      const [viewedOffer] = await db
        .insert(viewedAcceptedOffers)
        .values({
          serviceProviderId,
          offerId,
          viewedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [viewedAcceptedOffers.serviceProviderId, viewedAcceptedOffers.offerId],
          set: {
            viewedAt: new Date()
          }
        })
        .returning();

      return viewedOffer;
    } catch (error) {
      console.error('Error marking accepted offer as viewed:', error);
      throw error;
    }
  }

  async getViewedAcceptedOffersByServiceProvider(serviceProviderId: number): Promise<ViewedAcceptedOffer[]> {
    try {
      return await db
        .select()
        .from(viewedAcceptedOffers)
        .where(eq(viewedAcceptedOffers.serviceProviderId, serviceProviderId))
        .orderBy(desc(viewedAcceptedOffers.viewedAt));
    } catch (error) {
      console.error('Error getting viewed accepted offers:', error);
      return [];
    }
  }
  async getMessagesByRequest(requestId: number): Promise<Message[]> {
    try {
      console.log('Fetching messages for request:', requestId);

      // First verify that the request exists
      const request = await db
        .select()
        .from(requests)
        .where(eq(requests.id, requestId))
        .limit(1);

      if (!request.length) {
        console.log('Request not found:', requestId);
        return [];
      }

      // Get all messages for this request with proper aliases
      const messageResults = await db
        .select({
          id: messagesTable.id,
          requestId: messagesTable.requestId,
          offerId: messagesTable.offerId,
          senderId: messagesTable.senderId,
          senderRole: messagesTable.senderRole,
          receiverId: messagesTable.receiverId,
          receiverRole: messagesTable.receiverRole,
          content: messagesTable.content,
          isRead: messagesTable.isRead,
          isNew: messagesTable.isNew,
          createdAt: messagesTable.createdAt
        })
        .from(messagesTable)
        .where(eq(messagesTable.requestId, requestId))
        .orderBy(desc(messagesTable.createdAt));

      // Enrich messages with sender information
      const enrichedMessages = await Promise.all(
        messageResults.map(async (msg) => {
          let senderName = '';
          let senderUsername = undefined;
          try {
            if (msg.senderRole === 'client') {
              const sender = await this.getClientById(msg.senderId);
              senderName = sender?.name || 'Unknown Client';
            } else {
              const sender = await this.getServiceProviderById(msg.senderId);
              senderName = sender?.companyName || 'Unknown Service Provider';
              senderUsername = sender?.username; // Get the username for service providers
              console.log('Service provider data:', { senderName, senderUsername, senderId: msg.senderId });
            }
          } catch (error) {
            console.error('Error getting sender info:', error);
            senderName = msg.senderRole === 'client' ? 'Unknown Client' : 'Unknown Service Provider';
          }
          return {
            ...msg,
            senderName,
            serviceProviderUsername: senderUsername
          };
        })
      );

      console.log('Enriched messages:', enrichedMessages);
      return enrichedMessages;
    } catch (error) {
      console.error('Error in getMessagesByRequest:', error);
      throw error;
    }
  }

  async markConversationAsRead(requestId: number, userId: number): Promise<void> {
    try {
      // Doar marcăm mesajele ca fiind citite (isRead = true), dar păstrăm starea isNew 
      // pentru a permite etichetele "nou" să rămână vizibile în interfață
      await db
        .update(messagesTable)
        .set({
          isRead: true,
          // Nu mai modificăm isNew aici: isNew: false 
        })
        .where(
          and(
            eq(messagesTable.requestId, requestId),
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.isRead, false)
          )
        );

      console.log(`Mesajele din conversația pentru request ${requestId} au fost marcate ca citite pentru utilizatorul ${userId}`);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }


  // Working Hours methods
  async getServiceProviderWorkingHours(serviceProviderId: number): Promise<WorkingHour[]> {
    try {
      return await db
        .select()
        .from(workingHours)
        .where(eq(workingHours.serviceProviderId, serviceProviderId))
        .orderBy(workingHours.dayOfWeek);
    } catch (error) {
      console.error('Errorgetting service provider working hours:', error);
      return [];
    }
  }

  async createWorkingHour(workingHour: InsertWorkingHour): Promise<WorkingHour> {
    try {
      const [newWorkingHour] = await db
        .insert(workingHours)
        .values(workingHour)
        .returning();
      return newWorkingHour;
    } catch (error) {
      console.error('Error creating working hour:', error);
      throw error;
    }
  }

  async updateWorkingHour(id: number, workingHourData: Partial<WorkingHour>): Promise<WorkingHour> {
    try {
      const [updatedWorkingHour] = await db
        .update(workingHours)
        .set(workingHourData)
        .where(eq(workingHours.id, id))
        .returning();
      return updatedWorkingHour;
    } catch (error) {
      console.error('Error updating working hour:', error);
      throw error;
    }
  }

  async deleteWorkingHour(id: number): Promise<void> {
    try {
      await db.delete(workingHours).where(eq(workingHours.id, id));
    } catch (error) {
      console.error('Error deleting working hour:', error);
      throw error;
    }
  }

  async getWorkingHours(serviceProviderId: number): Promise<WorkingHour[]> {
    try {
      // Definim programul implicit
      const defaultHours: WorkingHour[] = [
        { id: 1, serviceProviderId, dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isClosed: false, createdAt: new Date() },
        { id: 2, serviceProviderId, dayOfWeek: 2, openTime: "09:00", closeTime: "17:00", isClosed: false, createdAt: new Date() },
        { id: 3, serviceProviderId, dayOfWeek: 3, openTime: "09:00", closeTime: "17:00", isClosed: false, createdAt: new Date() },
        { id: 4, serviceProviderId, dayOfWeek: 4, openTime: "09:00", closeTime: "17:00", isClosed: false, createdAt: new Date() },
        { id: 5, serviceProviderId, dayOfWeek: 5, openTime: "09:00", closeTime: "17:00", isClosed: false, createdAt: new Date() },
        { id: 6, serviceProviderId, dayOfWeek: 6, openTime: "09:00", closeTime: "17:00", isClosed: true, createdAt: new Date() },
        { id: 7, serviceProviderId, dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", isClosed: true, createdAt: new Date() }
      ];

      // Obținem programul personalizat din baza de date
      const customHours = await db
        .select()
        .from(workingHours)
        .where(eq(workingHours.serviceProviderId, serviceProviderId))
        .orderBy(workingHours.dayOfWeek);

      // Dacă nu există înregistrări personalizate, returnăm programul implicit
      if (!customHours.length) {
        return defaultHours;
      }

      // Combinăm programul implicit cu cel personalizat
      return defaultHours.map(defaultHour => {
        const customHour = customHours.find(ch => ch.dayOfWeek === defaultHour.dayOfWeek);
        return customHour || defaultHour;
      });
    } catch (error) {
      console.error('Error getting working hours:', error);
      return [];
    }
  }

  async updateWorkingHours(serviceProviderId: number, workingHourData: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }): Promise<WorkingHour> {
    try {
      // Validate dayOfWeek
      if (workingHourData.dayOfWeek < 0 || workingHourData.dayOfWeek > 6) {
        throw new Error('Invalid day of week');
      }

      // First try to find if there's an existing record
      const [existingHour] = await db
        .select()
        .from(workingHours)
        .where(
          and(
            eq(workingHours.serviceProviderId, serviceProviderId),
            eq(workingHours.dayOfWeek, workingHourData.dayOfWeek)
          )
        );

      if (existingHour) {
        // Update existing record
        const [updatedHour] = await db
          .update(workingHours)
          .set({
            openTime: workingHourData.openTime,
            closeTime: workingHourData.closeTime,
            isClosed: workingHourData.isClosed
          })
          .where(eq(workingHours.id, existingHour.id))
          .returning();
        return updatedHour;
      } else {
        // Create new record
        const [newHour] = await db
          .insert(workingHours)
          .values({
            serviceProviderId,
            dayOfWeek: workingHourData.dayOfWeek,
            openTime: workingHourData.openTime,
            closeTime: workingHourData.closeTime,
            isClosed: workingHourData.isClosed,
            createdAt: new Date()
          })
          .returning();
        return newHour;
      }
    } catch (error) {
      console.error('Error updating working hours:', error);
      throw error;
    }
  }

  // Notification Preferences methods
  async getNotificationPreferences(serviceProviderId: number): Promise<NotificationPreference | undefined> {
    try {
      const [preferences] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.serviceProviderId, serviceProviderId));
      return preferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return undefined;
    }
  }

  async createNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference> {
    try {
      const [newPreferences] = await db
        .insert(notificationPreferences)
        .values({
          ...preferences,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newPreferences;
    } catch (error) {
      console.error('Error creating notification preferences:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(id: number, preferencesData: Partial<NotificationPreference>): Promise<NotificationPreference> {
    try {
      const [updatedPreferences] = await db
        .update(notificationPreferences)
        .set({
          ...preferencesData,
          updatedAt: new Date()
        })
        .where(eq(notificationPreferences.id, id))
        .returning();
      return updatedPreferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
  
  // Client Notification Preferences methods
  async getClientNotificationPreferences(clientId: number): Promise<ClientNotificationPreference | undefined> {
    try {
      console.log(`Obtaining client notification preferences for client ID: ${clientId}`);
      
      const preferences = await db
        .select()
        .from(clientNotificationPreferences)
        .where(eq(clientNotificationPreferences.clientId, clientId));

      console.log(`Found ${preferences.length} notification preferences records for client ${clientId}`);
      
      if (preferences.length === 0) {
        return undefined;
      }
      
      return preferences[0];
    } catch (error) {
      console.error('Error getting client notification preferences:', error);
      return undefined;
    }
  }

  async createClientNotificationPreferences(preferences: InsertClientNotificationPreference): Promise<ClientNotificationPreference> {
    try {
      console.log(`Creating new client notification preferences for client ID: ${preferences.clientId}`, preferences);
      
      const [newPreferences] = await db
        .insert(clientNotificationPreferences)
        .values({
          ...preferences,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log(`Created client notification preferences:`, newPreferences);
      return newPreferences;
    } catch (error) {
      console.error('Error creating client notification preferences:', error);
      throw error;
    }
  }

  async updateClientNotificationPreferences(id: number, preferencesData: Partial<ClientNotificationPreference>): Promise<ClientNotificationPreference> {
    try {
      const [updatedPreferences] = await db
        .update(clientNotificationPreferences)
        .set({
          ...preferencesData,
          updatedAt: new Date()
        })
        .where(eq(clientNotificationPreferences.id, id))
        .returning();
      return updatedPreferences;
    } catch (error) {
      console.error('Error updating client notification preferences:', error);
      throw error;
    }
  }

  // Reviews methods
  async getServiceProviderReviews(serviceProviderId: number): Promise<Review[]> {
    try {
      return await db
        .select()
        .from(reviews)
        .where(eq(reviews.serviceProviderId, serviceProviderId))
        .orderBy(desc(reviews.createdAt));
    } catch (error) {
      console.error('Error getting service provider reviews:', error);
      return [];
    }
  }

  async getClientReviews(clientId: number): Promise<Review[]> {
    try {
      return await db
        .select()
        .from(reviews)
        .where(eq(reviews.clientId, clientId))
        .orderBy(desc(reviews.createdAt));
    } catch (error) {
      console.error('Error getting client reviews:', error);
      return [];
    }
  }

  // Actualizarea metodei createReview pentru a verifica regulile noi
  async createReview(review: InsertReview): Promise<Review> {
    try {
      // Verificăm dacă clientul a lăsat deja o recenzie pentru acest service
      const existingReview = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.clientId, review.clientId),
            eq(reviews.serviceProviderId, review.serviceProviderId)
          )
        )
        .limit(1);

      if (existingReview.length > 0) {
        throw new Error("Ați lăsat deja o recenzie pentru acest service");
      }

      // Verificăm dacă există o ofertă acceptată de la acest service pentru client
      const acceptedOffers = await db
        .select()
        .from(sentOffers)
        .where(
          and(
            eq(sentOffers.serviceProviderId, review.serviceProviderId),
            eq(sentOffers.requestUserId, review.clientId),
            eq(sentOffers.status, "Accepted")
          )
        );

      if (!acceptedOffers.length) {
        throw new Error("Trebuie să fi acceptat o ofertă de la acest service pentru a lăsa o recenzie");
      }

      // Verificăm dacă a trecut data preferată (mai târzie dintre data clientului și datele service-ului)
      const today = new Date();
      
      // Folosim prima ofertă acceptată pentru verificare (de obicei clienții lasă recenzii pentru ultima interacțiune)
      const latestAcceptedOffer = acceptedOffers[0];
      
      // Obținem data preferată a clientului din cerere
      const request = await this.getRequest(latestAcceptedOffer.requestId);
      if (!request) {
        throw new Error("Cererea asociată ofertei nu a fost găsită");
      }
      
      // Data preferată a clientului
      const clientPreferredDate = new Date(request.preferredDate);
      
      // Datele disponibile ale service-ului (din ofertă)
      const serviceAvailableDates = latestAcceptedOffer.availableDates.map(date => new Date(date));
      
      // Găsim data cea mai târzie dintre datele service-ului
      const latestServiceDate = serviceAvailableDates.length > 0 
        ? new Date(Math.max(...serviceAvailableDates.map(date => date.getTime())))
        : new Date(0); // Dacă nu există date disponibile, folosim o dată din trecut
      
      // Determinăm care este data cea mai târzie dintre clientPreferredDate și latestServiceDate
      const latestPreferredDate = new Date(Math.max(clientPreferredDate.getTime(), latestServiceDate.getTime()));
      
      // Verificăm dacă data curentă este după data preferată cea mai târzie
      if (today < latestPreferredDate) {
        throw new Error(`Nu puteți lăsa o recenzie înainte de data finalizării planificate a serviciului (${latestPreferredDate.toLocaleDateString('ro-RO')})`);
      }

      // Continuăm cu inserarea recenziei
      const reviewData = {
        ...review,
        offerCompletedAt: review.offerCompletedAt || new Date(),
        reported: false,
        lastModified: new Date(),
        createdAt: new Date()
      };

      const [newReview] = await db
        .insert(reviews)
        .values(reviewData)
        .returning();
      return newReview;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  async updateReview(id: number, reviewData: Partial<Review>): Promise<Review> {
    try {
      const [updatedReview] = await db
        .update(reviews)
        .set({
          ...reviewData,
          lastModified: new Date()
        })
        .where(eq(reviews.id, id))
        .returning();

      if (!updatedReview) {
        throw new Error('Review not found');
      }

      return updatedReview;
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }
  
  async deleteReview(id: number): Promise<void> {
    try {
      await db.delete(reviews).where(eq(reviews.id, id));
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }
  
  async getServiceProviderAverageRating(serviceProviderId: number): Promise<number> {
    try {
      const result = await db
        .select({ avgRating: sql<number>`AVG(${reviews.rating})` })
        .from(reviews)
        .where(eq(reviews.serviceProviderId, serviceProviderId));
      
      return result[0]?.avgRating || 0;
    } catch (error) {
      console.error('Error getting service provider average rating:', error);
      return 0;
    }
  }

  // Modificarea metodei pentru a afișa dacă clientul poate lăsa recenzie
  async canClientReviewService(clientId: number, serviceProviderId: number): Promise<{ canReview: boolean; reason?: string; earliestDateAllowed?: Date }> {
    try {
      // Verificăm dacă clientul a lăsat deja o recenzie
      const existingReview = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.clientId, clientId),
            eq(reviews.serviceProviderId, serviceProviderId)
          )
        )
        .limit(1);

      if (existingReview.length > 0) {
        return { 
          canReview: false, 
          reason: "Ați lăsat deja o recenzie pentru acest service"
        };
      }

      // Verificăm dacă există oferte acceptate
      const acceptedOffers = await db
        .select()
        .from(sentOffers)
        .where(
          and(
            eq(sentOffers.serviceProviderId, serviceProviderId),
            eq(sentOffers.requestUserId, clientId),
            eq(sentOffers.status, "Accepted")
          )
        );

      if (acceptedOffers.length === 0) {
        return { 
          canReview: false, 
          reason: "Trebuie să fi acceptat o ofertă de la acest service pentru a lăsa o recenzie" 
        };
      }

      // Verificăm dacă a trecut data preferată (mai târzie dintre data clientului și datele service-ului)
      const today = new Date();
      
      // Folosim prima ofertă acceptată pentru verificare
      const latestAcceptedOffer = acceptedOffers[0];
      
      // Obținem data preferată a clientului din cerere
      const request = await this.getRequest(latestAcceptedOffer.requestId);
      if (!request) {
        return { 
          canReview: false, 
          reason: "Cererea asociată ofertei nu a fost găsită" 
        };
      }
      
      // Data preferată a clientului
      const clientPreferredDate = new Date(request.preferredDate);
      
      // Datele disponibile ale service-ului (din ofertă)
      const serviceAvailableDates = latestAcceptedOffer.availableDates.map(date => new Date(date));
      
      // Găsim data cea mai târzie dintre datele service-ului
      const latestServiceDate = serviceAvailableDates.length > 0 
        ? new Date(Math.max(...serviceAvailableDates.map(date => date.getTime())))
        : new Date(0); // Dacă nu există date disponibile, folosim o dată din trecut
      
      // Determinăm care este data cea mai târzie dintre clientPreferredDate și latestServiceDate
      const latestPreferredDate = new Date(Math.max(clientPreferredDate.getTime(), latestServiceDate.getTime()));
      
      // Verificăm dacă data curentă este după data preferată cea mai târzie
      if (today < latestPreferredDate) {
        return { 
          canReview: false, 
          reason: `Nu puteți lăsa o recenzie înainte de data finalizării planificate a serviciului`,
          earliestDateAllowed: latestPreferredDate
        };
      }

      // Dacă am trecut toate verificările, clientul poate lăsa recenzie
      return { canReview: true };
    } catch (error) {
      console.error('Error checking if client can review service:', error);
      return { 
        canReview: false, 
        reason: "A apărut o eroare la verificarea posibilității de a adăuga recenzie" 
      };
    }
  }
  /**
   * Obține toți furnizorii de servicii dintr-un anumit județ
   * @param county Județul pentru care se caută furnizorii
   * @returns Array de furnizori de servicii
   */
  async getServiceProvidersInCounty(county: string): Promise<ServiceProvider[]> {
    try {
      console.log(`Căutare furnizori de servicii în județul: ${county}`);

      // Verificăm dacă județul este valid sau dacă este "Toate județele"
      const isAllCounties = county === "Toate județele";

      if (isAllCounties) {
        return await db.select().from(serviceProviders);
      } else {
        return await db
          .select()
          .from(serviceProviders)
          .where(eq(serviceProviders.county, county));
      }
    } catch (error) {
      console.error('Eroare la obținerea furnizorilor de servicii din județ:', error);
      return [];
    }
  }

  /**
   * Respinge automat toate ofertele pentru o cerere, exceptând oferta cu ID-ul specificat
   * @param requestId ID-ul cererii
   * @param acceptedOfferId ID-ul ofertei care a fost acceptată (și trebuie exclusă de la respingere)
   * @returns Array de oferte respinse
   */
  async rejectOtherOffersForRequest(requestId: number, acceptedOfferId: number): Promise<SentOffer[]> {
    try {
      console.log(`Respingere automată a celorlalte oferte pentru cererea ${requestId}, exceptând oferta ${acceptedOfferId}`);
      
      // Obține toate ofertele pentru cererea specificată
      const allOffers = await db
        .select()
        .from(sentOffers)
        .where(eq(sentOffers.requestId, requestId));
      
      // Filtrăm ofertele care trebuie respinse (toate cu excepția celei acceptate și celei deja respinse)
      const offersToReject = allOffers.filter(offer => 
        offer.id !== acceptedOfferId && offer.status !== "Rejected"
      );
      
      console.log(`Găsite ${offersToReject.length} oferte pentru respingere automată`);
      
      // Respinge fiecare ofertă
      const rejectedOffers: SentOffer[] = [];
      for (const offer of offersToReject) {
        const [updatedOffer] = await db
          .update(sentOffers)
          .set({ status: "Rejected" })
          .where(eq(sentOffers.id, offer.id))
          .returning();
        
        rejectedOffers.push(updatedOffer);
        console.log(`Oferta cu ID ${offer.id} respinsă automat`);
      }
      
      return rejectedOffers;
    } catch (error) {
      console.error('Eroare la respingerea automată a ofertelor:', error);
      throw error;
    }
  }
  
  /**
   * Verifică și expiră ofertele vechi care nu au fost acceptate
   * O ofertă expiră după 30 zile + data preferată din cerere
   * @returns Informații despre ofertele expirate
   */
  async checkAndExpireOldOffers(): Promise<{ expired: number, offers: SentOffer[] }> {
    try {
      console.log('Verificare oferte vechi neacceptate pentru expirare automată');

      // Găsim toate ofertele în așteptare (Pending)
      const pendingOffers = await db
        .select()
        .from(sentOffers)
        .where(eq(sentOffers.status, "Pending"));

      console.log(`Găsite ${pendingOffers.length} oferte în așteptare pentru verificare`);

      // Pentru fiecare ofertă, verificăm dacă a expirat
      const expiredOffers: SentOffer[] = [];
      const currentDate = new Date();

      for (const offer of pendingOffers) {
        // Obținem data preferată din cerere
        const preferredDate = offer.requestPreferredDate ? new Date(offer.requestPreferredDate) : null;
        
        // Calculăm data de expirare (30 zile + data preferată SAU 30 zile de la creare dacă nu există dată preferată)
        let expirationDate;
        if (preferredDate) {
          // Adăugăm 30 de zile la data preferată
          expirationDate = new Date(preferredDate);
          expirationDate.setDate(expirationDate.getDate() + 30);
          
          // Dacă data preferată + 30 zile este mai veche decât data creării ofertei,
          // folosim data creării + 30 zile (pentru cazurile când data preferată este în trecut)
          const creationDate = new Date(offer.createdAt);
          if (expirationDate < creationDate) {
            expirationDate = new Date(creationDate);
            expirationDate.setDate(expirationDate.getDate() + 30);
          }
        } else {
          // Nu există dată preferată, folosim data creării + 30 zile
          expirationDate = new Date(offer.createdAt);
          expirationDate.setDate(expirationDate.getDate() + 30);
        }
        
        // Verificăm dacă oferta a expirat
        if (currentDate > expirationDate) {
          console.log(`Oferta #${offer.id} pentru cererea #${offer.requestId} a expirat (data exp: ${expirationDate.toISOString()})`);
          
          // Actualizăm statusul ofertei la "Rejected" (respinsă automat)
          const [updatedOffer] = await db
            .update(sentOffers)
            .set({
              status: "Rejected"
            })
            .where(eq(sentOffers.id, offer.id))
            .returning();
          
          expiredOffers.push(updatedOffer);
        }
      }

      return {
        expired: expiredOffers.length,
        offers: expiredOffers
      };
    } catch (error) {
      console.error('Eroare la verificarea și expirarea ofertelor vechi:', error);
      throw error;
    }
  }

  // Metoda pentru verificarea și expirarea automată a cererilor 
  // (1) care nu au primit oferte în 7 zile SAU
  // (2) care au trecut 30 zile de la data preferată
  async checkAndExpireOldRequests(): Promise<{ expired: number, requests: Request[] }> {
    try {
      console.log('Verificare cereri expirate (fără oferte în 7 zile sau 30 zile după data preferată)');

      // Obținem toate cererile active
      const activeRequests = await db
        .select()
        .from(requests)
        .where(eq(requests.status, "Active"));

      console.log(`Găsite ${activeRequests.length} cereri active pentru verificare`);

      const expiredRequests: Request[] = [];
      const currentDate = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const request of activeRequests) {
        let shouldExpire = false;
        let expirationReason = "";
        
        // Verificăm dacă cererea este mai veche de 7 zile
        const isOlderThanSevenDays = new Date(request.createdAt) < sevenDaysAgo;
        
        if (isOlderThanSevenDays) {
          // Verificăm dacă cererea are oferte
          const offers = await db
            .select()
            .from(sentOffers)
            .where(eq(sentOffers.requestId, request.id));
          
          // Regula 1: Dacă este mai veche de 7 zile și nu are oferte, marcăm ca expirată
          if (offers.length === 0) {
            shouldExpire = true;
            expirationReason = "\n\n[SISTEM: Această cerere a fost anulată automat deoarece nu a primit nicio ofertă în termen de 7 zile.]";
            console.log(`Cererea #${request.id} nu are oferte și a expirat (regula 7 zile)`);
          }
        }
        
        // Regula 2: Dacă au trecut 30 zile de la data preferată, marcăm ca expirată
        if (!shouldExpire && request.preferredDate) {
          const preferredDate = new Date(request.preferredDate);
          const thirtyDaysAfterPreferred = new Date(preferredDate);
          thirtyDaysAfterPreferred.setDate(thirtyDaysAfterPreferred.getDate() + 30);
          
          if (currentDate > thirtyDaysAfterPreferred) {
            shouldExpire = true;
            expirationReason = `\n\n[SISTEM: Această cerere a fost anulată automat deoarece au trecut 30 zile de la data preferată (${preferredDate.toLocaleDateString('ro-RO')}).]`;
            console.log(`Cererea #${request.id} a expirat (30 zile după data preferată: ${preferredDate.toISOString()})`);
          }
        }
        
        // Dacă trebuie expirată, actualizăm în baza de date
        if (shouldExpire) {
          const [updatedRequest] = await db
            .update(requests)
            .set({
              status: "Anulat",
              description: request.description + expirationReason
            })
            .where(eq(requests.id, request.id))
            .returning();
          
          expiredRequests.push(updatedRequest);
        }
      }

      return {
        expired: expiredRequests.length,
        requests: expiredRequests
      };
    } catch (error) {
      console.error('Eroare la verificarea și expirarea cererilor vechi:', error);
      return { expired: 0, requests: [] };
    }
  }
}

export const storage = new DatabaseStorage();