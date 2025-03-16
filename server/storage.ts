import {
  serviceProviders,
  workingHours,
  type ServiceProvider,
  type WorkingHour
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export class DatabaseStorage {
  async getServiceProviderByUsername(username: string): Promise<ServiceProvider | undefined> {
    try {
      console.log('Searching for service provider with username:', username);
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.username, username))
        .limit(1);

      console.log('Found service provider:', provider ? {
        id: provider.id,
        username: provider.username,
        companyName: provider.companyName
      } : 'No provider found');

      return provider;
    } catch (error) {
      console.error('Error getting service provider by username:', error);
      return undefined;
    }
  }

  async getWorkingHours(serviceProviderId: number): Promise<WorkingHour[]> {
    try {
      console.log('Fetching working hours for service provider:', serviceProviderId);
      const hours = await db
        .select()
        .from(workingHours)
        .where(eq(workingHours.serviceProviderId, serviceProviderId))
        .orderBy(workingHours.dayOfWeek);

      console.log('Found working hours:', hours.length);
      return hours;
    } catch (error) {
      console.error('Error getting working hours:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();