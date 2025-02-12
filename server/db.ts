import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create pool with proper configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000 // 5 second timeout
});

// Test the connection and log any errors
pool.connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('Could not connect to database. Please check if the database is running and accessible.');
    }
  });

// Export the drizzle instance
export const db = drizzle(pool, { schema });

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});