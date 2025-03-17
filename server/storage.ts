import {
  serviceProviders,
  workingHours,
  type ServiceProvider,
  type WorkingHour,
  clients
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export class DatabaseStorage {
  async getClientByFirebaseUid(firebaseUid: string) {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.firebaseUid, firebaseUid));
    return client;
  }

  async getServiceProviderByFirebaseUid(firebaseUid: string) {
    const [provider] = await db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.firebaseUid, firebaseUid));
    return provider;
  }

  async getServiceProviderByUsername(username: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.username, username));
    return provider;
  }

  async getWorkingHours(serviceProviderId: number): Promise<WorkingHour[]> {
    const hours = await db
      .select()
      .from(workingHours)
      .where(eq(workingHours.serviceProviderId, serviceProviderId));
    return hours;
  }
}

export const storage = new DatabaseStorage();