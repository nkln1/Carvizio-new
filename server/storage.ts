import { users, cars, requests, type User, type InsertUser, type Car, type InsertCar, type Request, type InsertRequest } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
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
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser & { firebaseUid: string }): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  getUserCars(userId: number): Promise<Car[]>;
  getCar(id: number): Promise<Car | undefined>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, carData: Partial<Car>): Promise<Car>;
  deleteCar(id: number): Promise<void>;
  getUserRequests(userId: number): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, requestData: Partial<Request>): Promise<Request>;
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

  async createUser(insertUser: InsertUser & { firebaseUid: string }): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          firebaseUid: insertUser.firebaseUid,
          verified: false,
          createdAt: new Date(),
        })
        .returning();
      return user;
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

  async getUserRequests(userId: number): Promise<Request[]> {
    try {
      console.log('Fetching requests for user ID:', userId);
      const requests = await db
        .select()
        .from(requests)
        .where(eq(requests.userId, userId))
        .orderBy(desc(requests.createdAt));

      console.log('Retrieved requests:', JSON.stringify(requests, null, 2));
      return requests;
    } catch (error) {
      console.error('Error in getUserRequests:', error);
      throw error;
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
      console.log('Creating request with data:', JSON.stringify(request, null, 2));

      // Validate request data
      if (!request.userId || !request.carId || !request.title || !request.description ||
          !request.preferredDate || !request.county || !request.cities) {
        throw new Error('Missing required fields for request creation');
      }

      // Ensure cities is an array
      const cities = Array.isArray(request.cities) ? request.cities : [request.cities];

      const [newRequest] = await db
        .insert(requests)
        .values({
          ...request,
          cities: cities,
          status: "În așteptare",
          createdAt: new Date()
        })
        .returning();

      console.log('Successfully created request:', JSON.stringify(newRequest, null, 2));
      return newRequest;
    } catch (error) {
      console.error('Error in createRequest:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
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
}

export const storage = new DatabaseStorage();