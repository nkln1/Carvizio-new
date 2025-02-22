import {
  clients,
  serviceProviders,
  cars,
  requests,
  sentOffers,
  messages,
  viewedRequests,
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
  type Message,
  type InsertMessage,
  type ViewedRequest,
  type InsertViewedRequest,
  type ViewedOffer, // Added
  viewedOffers, // Added
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, inArray, or, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";

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
  getOffersForClient(clientId: number): Promise<(SentOffer & { serviceProviderName: string })[]>;

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
      const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by ID:', error);
      return undefined;
    }
  }

  async getServiceProviderByEmail(email: string): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.email, email));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by email:', error);
      return undefined;
    }
  }

  async getServiceProviderByFirebaseUid(firebaseUid: string): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.firebaseUid, firebaseUid));
      return provider;
    } catch (error) {
      console.error('Error getting service provider by Firebase UID:', error);
      return undefined;
    }
  }

  async createServiceProvider(insertProvider: InsertServiceProvider & { firebaseUid: string }): Promise<ServiceProvider> {
    try {
      const [provider] = await db
        .insert(serviceProviders)
        .values({
          ...insertProvider,
          firebaseUid: insertProvider.firebaseUid,
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
      const [updatedProvider] = await db
        .update(serviceProviders)
        .set(providerData)
        .where(eq(serviceProviders.id, id))
        .returning();
      return updatedProvider;
    } catch (error) {
      console.error('Error updating service provider:', error);
      throw error;
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
        .where(eq(requests.county, county))
        .where(eq(requests.status, "Active"))
        .orderBy(desc(requests.createdAt));

      if (cities.length > 0) {
        return matchingRequests.filter(request => {
          const requestCities = request.cities || [];
          return requestCities.some(requestCity =>
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
  async getOffersForClient(clientId: number): Promise<(SentOffer & { serviceProviderName: string })[]> {
    try {
      // First get all requests for this client
      const clientRequests = await this.getClientRequests(clientId);

      if (!clientRequests.length) {
        return [];
      }

      // Get the request IDs
      const requestIds = clientRequests.map(request => request.id);

      // Get all offers for these requests with service provider details
      const offers = await db
        .select({
          ...sentOffers,
          serviceProviderName: serviceProviders.companyName
        })
        .from(sentOffers)
        .leftJoin(serviceProviders, eq(sentOffers.serviceProviderId, serviceProviders.id))
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

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const [newMessage] = await db
        .insert(messages)
        .values({
          ...message,
          isRead: false,
          createdAt: new Date()
        })
        .returning();
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async getMessage(id: number): Promise<Message | undefined> {
    try {
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id));
      return message;
    } catch (error) {
      console.error('Error getting message:', error);
      return undefined;
    }
  }

  async getUserMessages(userId: number, userRole: "client" | "service", requestId?: number): Promise<Message[]> {
    try {
      // Base query conditions
      const conditions = [
        or(
          and(
            eq(messages.senderId, userId),
            eq(messages.senderRole, userRole)
          ),
          and(
            eq(messages.receiverId, userId),
            eq(messages.receiverRole, userRole)
          )
        )
      ];

      // Add requestId filter if provided
      if (requestId) {
        conditions.push(eq(messages.requestId, requestId));
      }

      const messageResults = await db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt));

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
        .update(messages)
        .set({ isRead: true })
        .where(eq(messages.id, id))
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
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.receiverRole, userRole),
            eq(messages.isRead, false)
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
      return await db
        .select()
        .from(viewedOffers)
        .where(eq(viewedOffers.clientId, clientId))
        .orderBy(desc(viewedOffers.viewedAt));
    } catch (error) {
      console.error('Error getting viewed offers:', error);
      return [];
    }
  }

  async markOfferAsViewed(clientId: number, offerId: number): Promise<ViewedOffer> {
    try {
      const [viewedOffer] = await db
        .insert(viewedOffers)
        .values({
          clientId,
          offerId,
          viewedAt: new Date()
        })
        .onConflictDoNothing()
        .returning();

      if (!viewedOffer) {
        // If there was a conflict, return the existing record
        const [existing] = await db
          .select()
          .from(viewedOffers)
          .where(
            and(
              eq(viewedOffers.clientId, clientId),
              eq(viewedOffers.offerId, offerId)
            )
          );
        return existing;
      }

      return viewedOffer;
    } catch (error) {
      console.error('Error marking offer as viewed:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();