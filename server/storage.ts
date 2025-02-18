import { 
  users, clients, serviceProviders, cars, requests, messages,
  type User, type InsertUser, 
  type Client, type InsertClient,
  type ServiceProvider, type InsertServiceProvider,
  type Car, type InsertCar, 
  type Request, type InsertRequest,
  type Message, type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
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
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser & { firebaseUid: string } & {
    clientData?: InsertClient;
    serviceProviderData?: InsertServiceProvider;
  }): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;

  // Client management
  getClient(userId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(userId: number, clientData: Partial<Client>): Promise<Client>;

  // Service provider management
  getServiceProvider(userId: number): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  updateServiceProvider(userId: number, providerData: Partial<ServiceProvider>): Promise<ServiceProvider>;

  // Car management
  getUserCars(userId: number): Promise<Car[]>;
  getCar(id: number): Promise<Car | undefined>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, carData: Partial<Car>): Promise<Car>;
  deleteCar(id: number): Promise<void>;

  // Request management
  getUserRequests(userId: number): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, requestData: Partial<Request>): Promise<Request>;
  getRequestsByLocation(county: string, cities: string[]): Promise<Request[]>;

  // Message management
  getUserMessages(userId: number): Promise<Message[]>;
  getUnreadMessages(userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: sessionPool,
      createTableIfMissing: true,
    });
  }

  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
      return user;
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser & { firebaseUid: string } & {
    clientData?: InsertClient;
    serviceProviderData?: InsertServiceProvider;
  }): Promise<User> {
    try {
      const result = await db.transaction(async (tx) => {
        // Create base user
        const [user] = await tx
          .insert(users)
          .values({
            ...insertUser,
            firebaseUid: insertUser.firebaseUid,
            verified: false,
            createdAt: new Date(),
          })
          .returning();

        // Create role-specific record with provided data
        if (user.role === 'client' && insertUser.clientData) {
          await tx
            .insert(clients)
            .values({
              userId: user.id,
              county: insertUser.clientData.county,
              city: insertUser.clientData.city,
              createdAt: new Date(),
            });
        } else if (user.role === 'service' && insertUser.serviceProviderData) {
          await tx
            .insert(serviceProviders)
            .values({
              userId: user.id,
              companyName: insertUser.serviceProviderData.companyName,
              representativeName: insertUser.serviceProviderData.representativeName,
              cui: insertUser.serviceProviderData.cui,
              tradeRegNumber: insertUser.serviceProviderData.tradeRegNumber,
              address: insertUser.serviceProviderData.address,
              county: insertUser.serviceProviderData.county,
              city: insertUser.serviceProviderData.city,
              createdAt: new Date(),
            });
        }

        return user;
      });

      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          email: undefined,
          password: undefined,
          firebaseUid: undefined,
          role: undefined,
          verified: undefined,
          createdAt: undefined,
        })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Client management methods
  async getClient(userId: number): Promise<Client | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
      return client;
    } catch (error) {
      console.error('Error getting client:', error);
      return undefined;
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      const [newClient] = await db
        .insert(clients)
        .values(client)
        .returning();
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(userId: number, clientData: Partial<Client>): Promise<Client> {
    try {
      const [updatedClient] = await db
        .update(clients)
        .set(clientData)
        .where(eq(clients.userId, userId))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  // Service provider management methods
  async getServiceProvider(userId: number): Promise<ServiceProvider | undefined> {
    try {
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.userId, userId));
      return provider;
    } catch (error) {
      console.error('Error getting service provider:', error);
      return undefined;
    }
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    try {
      const [newProvider] = await db
        .insert(serviceProviders)
        .values(provider)
        .returning();
      return newProvider;
    } catch (error) {
      console.error('Error creating service provider:', error);
      throw error;
    }
  }

  async updateServiceProvider(
    userId: number,
    providerData: Partial<ServiceProvider>
  ): Promise<ServiceProvider> {
    try {
      const [updatedProvider] = await db
        .update(serviceProviders)
        .set(providerData)
        .where(eq(serviceProviders.userId, userId))
        .returning();
      return updatedProvider;
    } catch (error) {
      console.error('Error updating service provider:', error);
      throw error;
    }
  }

  // Car management methods
  async getUserCars(userId: number): Promise<Car[]> {
    try {
      return await db
        .select()
        .from(cars)
        .where(eq(cars.userId, userId))
        .orderBy(desc(cars.createdAt));
    } catch (error) {
      console.error('Error getting user cars:', error);
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

  // Request management methods
  async getUserRequests(userId: number): Promise<Request[]> {
    try {
      return await db
        .select()
        .from(requests)
        .where(eq(requests.userId, userId))
        .orderBy(desc(requests.createdAt));
    } catch (error) {
      console.error('Error getting user requests:', error);
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
        .where(
          and(
            eq(requests.county, county),
            eq(requests.status, "Active")
          )
        )
        .orderBy(desc(requests.createdAt));

      if (cities.length > 0) {
        return matchingRequests.filter(request => {
          const requestCities = request.cities || [];
          return requestCities.some(requestCity => cities.includes(requestCity));
        });
      }

      return matchingRequests;
    } catch (error) {
      console.error('Error getting requests by location:', error);
      throw error;
    }
  }

  // Message management methods
  async getUserMessages(userId: number): Promise<Message[]> {
    try {
      return await db
        .select()
        .from(messages)
        .where(
          eq(messages.receiverId, userId)
        )
        .orderBy(desc(messages.createdAt));
    } catch (error) {
      console.error('Error getting user messages:', error);
      return [];
    }
  }

  async getUnreadMessages(userId: number): Promise<Message[]> {
    try {
      return await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.read, false)
          )
        )
        .orderBy(desc(messages.createdAt));
    } catch (error) {
      console.error('Error getting unread messages:', error);
      return [];
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const [newMessage] = await db
        .insert(messages)
        .values({
          ...message,
          read: false,
          createdAt: new Date(),
        })
        .returning();
      return newMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async markMessageAsRead(id: number): Promise<Message> {
    try {
      const [updatedMessage] = await db
        .update(messages)
        .set({ read: true })
        .where(eq(messages.id, id))
        .returning();
      return updatedMessage;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();