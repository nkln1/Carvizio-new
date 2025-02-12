import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create pool with SSL configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// Test the connection and log any errors
pool.connect()
  .then(() => console.log('Successfully connected to database'))
  .catch(err => {
    console.error('Database connection error:', err);
    // Don't throw, just log the error
  });

export const db = drizzle(pool, { schema });